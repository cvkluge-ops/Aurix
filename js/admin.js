/**
 * AURIX — Painel de Administração
 * Aprovação e rejeição de novos cadastros
 */

document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('admin-users-list');
  const countEl = document.getElementById('admin-users-count');
  const toastEl = document.getElementById('aurix-toast');
  const toastMessageEl = document.getElementById('toast-message');

  const STATUS_LABELS = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };
  const ROLE_LABELS = { admin: 'Admin', user: 'Usuário' };

  let currentUserId = null;
  let usersState = [];

  const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  function formatDate(isoString) {
    try {
      return dateFormatter.format(new Date(isoString));
    } catch (e) {
      return '';
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let toastTimeout = null;
  function showToast(message) {
    if (!toastEl) return;
    if (toastMessageEl) toastMessageEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 4000);
  }

  function renderUsers() {
    if (!listEl) return;

    if (countEl) {
      countEl.textContent = `${usersState.length} ${usersState.length === 1 ? 'usuário' : 'usuários'}`;
    }

    if (usersState.length === 0) {
      listEl.innerHTML = '<div class="admin-empty-state">Nenhum usuário cadastrado ainda.</div>';
      return;
    }

    listEl.innerHTML = usersState.map(user => {
      const isSelf = user.id === currentUserId;
      const statusClass = `status-${user.status}`;
      const statusLabel = STATUS_LABELS[user.status] || user.status;
      const roleLabel = ROLE_LABELS[user.role] || user.role;

      let actionsHtml = '';
      if (isSelf) {
        actionsHtml = '<span class="admin-user-meta">Você</span>';
      } else {
        const approveBtn = user.status !== 'approved'
          ? `<button type="button" class="btn-aurix btn-primary-gold" data-action="approve" data-id="${user.id}">Aprovar</button>`
          : '';
        const rejectBtn = user.status !== 'rejected'
          ? `<button type="button" class="btn-aurix btn-danger-crimson" data-action="reject" data-id="${user.id}">Rejeitar</button>`
          : '';
        actionsHtml = approveBtn + rejectBtn;
      }

      return `
        <div class="admin-user-row" data-row-id="${user.id}">
          <div class="admin-user-info">
            <span class="admin-user-name">${escapeHtml(user.name)}</span>
            <span class="admin-user-email">${escapeHtml(user.email)}</span>
            <span class="admin-user-meta">${roleLabel} • cadastrado em ${formatDate(user.createdAt)}</span>
          </div>
          <div class="admin-user-actions">
            <span class="status-pill ${statusClass}">${statusLabel}</span>
            ${actionsHtml}
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.getAttribute('data-action'), btn.getAttribute('data-id')));
    });
  }

  async function handleAction(action, id) {
    try {
      const response = await fetch(`/api/admin/users/${id}/${action}`, {
        method: 'POST',
        credentials: 'same-origin'
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(data.error || 'Não foi possível concluir a ação.');
        return;
      }

      const index = usersState.findIndex(u => u.id === data.id);
      if (index !== -1) usersState[index] = data;
      renderUsers();
      showToast(action === 'approve' ? `${data.name} foi aprovado.` : `${data.name} foi rejeitado.`);
    } catch (err) {
      showToast('Falha de conexão ao tentar concluir a ação.');
    }
  }

  function setupUserProfileMenu(user) {
    const btnUserProfile = document.getElementById('btn-user-profile');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const btnLockVault = document.getElementById('btn-lock-vault');
    const displayUserName = document.getElementById('display-user-name');
    const displayUserAvatar = document.getElementById('display-user-avatar');
    const menuUserName = document.getElementById('menu-user-name');

    if (user && user.name) {
      if (displayUserName) displayUserName.textContent = user.name;
      if (displayUserAvatar) displayUserAvatar.textContent = user.name.charAt(0).toUpperCase();
      if (menuUserName) menuUserName.textContent = user.name;
    }

    if (btnUserProfile && userDropdownMenu) {
      btnUserProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdownMenu.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!userDropdownMenu.contains(e.target) && !btnUserProfile.contains(e.target)) {
          userDropdownMenu.classList.remove('active');
        }
      });
    }

    if (btnLockVault) {
      btnLockVault.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (e) {
          // segue para o login mesmo se a chamada falhar
        }
        window.location.href = 'login.html';
      });
    }
  }

  async function init() {
    let user = null;
    try {
      const meResponse = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!meResponse.ok) {
        window.location.href = 'login.html';
        return;
      }
      const meData = await meResponse.json();
      user = meData.user;

      if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
      }
    } catch (e) {
      window.location.href = 'login.html';
      return;
    }

    try {
      const usersResponse = await fetch('/api/admin/users', { credentials: 'same-origin' });
      if (usersResponse.ok) {
        usersState = await usersResponse.json();
        const self = usersState.find(u => u.email === user.email);
        currentUserId = self ? self.id : null;
      }
    } catch (e) {
      showToast('Não foi possível carregar a lista de usuários.');
    }

    renderUsers();
    setupUserProfileMenu(user);
  }

  init();
});
