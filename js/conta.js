/**
 * AURIX — Minha Conta (Troca de Senha)
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-change-password');
  const inputCurrent = document.getElementById('current-password');
  const inputNew = document.getElementById('new-password');
  const inputNewConfirm = document.getElementById('new-password-confirm');

  const btnSubmit = document.getElementById('btn-submit-change-password');
  const btnContentIdle = btnSubmit ? btnSubmit.querySelector('.btn-content-idle') : null;
  const btnContentLoading = btnSubmit ? btnSubmit.querySelector('.btn-content-loading') : null;

  const alertBanner = document.getElementById('account-alert');
  const alertText = document.getElementById('account-alert-text');
  const successBanner = document.getElementById('account-success');
  const successText = document.getElementById('account-success-text');

  const btnSuggestPassword = document.getElementById('btn-suggest-password');
  const passwordSuggestionBox = document.getElementById('password-suggestion-box');
  const suggestedPasswordText = document.getElementById('suggested-password-text');
  const btnCopyPassword = document.getElementById('btn-copy-password');
  const btnUsePassword = document.getElementById('btn-use-password');

  function showAlert(msg) {
    if (!alertBanner || !alertText) return;
    hideSuccess();
    alertText.textContent = msg;
    alertBanner.style.display = 'flex';
    alertBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    if (!alertBanner) return;
    alertBanner.style.display = 'none';
  }

  function showSuccess(msg) {
    if (!successBanner || !successText) return;
    hideAlert();
    successText.textContent = msg;
    successBanner.style.display = 'flex';
    successBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideSuccess() {
    if (!successBanner) return;
    successBanner.style.display = 'none';
  }

  function setLoadingState(isLoading) {
    if (!btnSubmit) return;
    btnSubmit.disabled = isLoading;
    if (btnContentIdle) btnContentIdle.style.display = isLoading ? 'none' : 'inline-flex';
    if (btnContentLoading) btnContentLoading.style.display = isLoading ? 'inline-flex' : 'none';
  }

  function generateStrongPassword(length) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    const randomValues = new Uint32Array(length);
    (window.crypto || window.msCrypto).getRandomValues(randomValues);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }
    return password;
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (err) {
        // Cai para o método manual abaixo.
      }
    }

    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    tempInput.focus();
    tempInput.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(tempInput);

    if (!copied) {
      throw new Error('Não foi possível copiar automaticamente.');
    }
  }

  if (btnSuggestPassword) {
    btnSuggestPassword.addEventListener('click', function () {
      const newPassword = generateStrongPassword(14);
      if (suggestedPasswordText) suggestedPasswordText.textContent = newPassword;
      if (passwordSuggestionBox) passwordSuggestionBox.style.display = 'flex';
    });
  }

  if (btnCopyPassword) {
    btnCopyPassword.addEventListener('click', async function () {
      const value = suggestedPasswordText ? suggestedPasswordText.textContent : '';
      if (!value || value === '—') return;
      try {
        await copyToClipboard(value);
        const original = btnCopyPassword.textContent;
        btnCopyPassword.textContent = 'Copiado!';
        setTimeout(() => { btnCopyPassword.textContent = original; }, 1800);
      } catch (err) {
        showAlert('Não foi possível copiar automaticamente. Selecione e copie a senha manualmente.');
      }
    });
  }

  if (btnUsePassword) {
    btnUsePassword.addEventListener('click', function () {
      const value = suggestedPasswordText ? suggestedPasswordText.textContent : '';
      if (!value || value === '—') return;
      if (inputNew) inputNew.value = value;
      if (inputNewConfirm) inputNewConfirm.value = value;
    });
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const currentPassword = inputCurrent ? inputCurrent.value : '';
      const newPassword = inputNew ? inputNew.value : '';
      const newPasswordConfirm = inputNewConfirm ? inputNewConfirm.value : '';

      if (!currentPassword) {
        showAlert('Informe sua senha atual.');
        if (inputCurrent) inputCurrent.focus();
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        showAlert('A nova senha precisa ter pelo menos 6 caracteres.');
        if (inputNew) inputNew.focus();
        return;
      }

      if (newPassword !== newPasswordConfirm) {
        showAlert('As senhas digitadas não coincidem.');
        if (inputNewConfirm) inputNewConfirm.focus();
        return;
      }

      hideAlert();
      setLoadingState(true);

      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json().catch(() => ({}));
        setLoadingState(false);

        if (!response.ok) {
          showAlert(data.error || 'Não foi possível alterar a senha. Tente novamente.');
          return;
        }

        form.reset();
        if (passwordSuggestionBox) passwordSuggestionBox.style.display = 'none';
        showSuccess(data.message || 'Senha alterada com sucesso!');
      } catch (err) {
        setLoadingState(false);
        showAlert('Falha de conexão com o servidor. Verifique sua internet e tente novamente.');
      }
    });
  }

  // Gerenciamento de Sessão e Menu de Perfil / Bloqueio
  function setupUserProfileMenu(user) {
    const btnUserProfile = document.getElementById('btn-user-profile');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const btnLockVault = document.getElementById('btn-lock-vault');
    const displayUserName = document.getElementById('display-user-name');
    const displayUserAvatar = document.getElementById('display-user-avatar');
    const menuUserName = document.getElementById('menu-user-name');
    const menuAdminPanel = document.getElementById('menu-admin-panel');

    if (user && user.name) {
      if (displayUserName) displayUserName.textContent = user.name;
      if (displayUserAvatar) displayUserAvatar.textContent = user.name.charAt(0).toUpperCase();
      if (menuUserName) menuUserName.textContent = user.name;
    }

    if (menuAdminPanel) {
      menuAdminPanel.style.display = (user && user.role === 'admin') ? 'flex' : 'none';
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
    } catch (e) {
      window.location.href = 'login.html';
      return;
    }

    setupUserProfileMenu(user);
  }

  init();
});
