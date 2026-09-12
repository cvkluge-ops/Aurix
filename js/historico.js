/**
 * AURIX — Aplicação & Controle Financeiro
 * Lógica da Página Histórico (Extrato Cronológico por Data e Mês)
 */

document.addEventListener('DOMContentLoaded', () => {
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const DAYS_OF_WEEK = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  // Estado do Mês Selecionado (Padrão: Setembro 2026)
  const TODAY = new Date();
  let currentViewYear = 2026;
  let currentViewMonth = 8; // Setembro
  let viewMode = 'month'; // 'month' ou 'all'

  let expensesState = [];

  // Elementos do DOM — Header & Navegação de Meses
  const headerDateTextEl = document.getElementById('header-date-text');
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const btnMonthDisplay = document.getElementById('btn-month-display');
  const currentMonthTextEl = document.getElementById('current-month-text');
  const monthStatusPillEl = document.getElementById('month-status-pill');
  const monthDropdownMenuEl = document.getElementById('month-dropdown-menu');
  const monthPickerWrapper = document.querySelector('.month-picker-wrapper');
  const btnQuickToday = document.getElementById('btn-quick-today');
  const btnAllMonths = document.getElementById('btn-all-months');

  // Elementos do DOM — Métricas de Resumo
  const historyTotalSpentEl = document.getElementById('history-total-spent');
  const historyTotalCountEl = document.getElementById('history-total-count');
  const historyTopTxEl = document.getElementById('history-top-tx');
  const feedResultsCountEl = document.getElementById('feed-results-count');

  // Elementos do DOM — Filtros & Busca
  const searchInputEl = document.getElementById('search-history');
  const filterCategoryEl = document.getElementById('filter-category');
  const filterPaymentEl = document.getElementById('filter-payment');
  const sortSelectEl = document.getElementById('sort-history');
  const timelineContainerEl = document.getElementById('transactions-timeline');

  // Elementos do DOM — Modal Novo Gasto / Edição
  const newExpenseBtn = document.getElementById('btn-novo-gasto');
  const modalBackdrop = document.getElementById('modal-novo-gasto');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalTitleEl = document.getElementById('modal-title');
  const modalSubmitBtn = document.getElementById('modal-submit-btn');
  const expenseForm = document.getElementById('expense-form');
  const expenseCategorySelect = document.getElementById('expense-category');
  const expenseDescriptionInput = document.getElementById('expense-description');
  const expenseDateInput = document.getElementById('expense-date');
  const expensePaymentSelect = document.getElementById('expense-payment');
  const expenseAmountInput = document.getElementById('expense-amount');

  // Estado de Edição
  let editingExpenseId = null;

  // Elementos do DOM — Modal Confirmação de Exclusão
  const modalConfirmDelete = document.getElementById('modal-confirm-delete');
  const modalDeleteCloseBtn = document.getElementById('modal-delete-close-btn');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const deletePreviewDesc = document.getElementById('delete-preview-desc');
  const deletePreviewMeta = document.getElementById('delete-preview-meta');
  const deletePreviewAmount = document.getElementById('delete-preview-amount');
  let pendingDeleteId = null;

  // Elementos do DOM — Toast
  const toastEl = document.getElementById('aurix-toast');
  const toastMessageEl = document.getElementById('toast-message');

  // Formatadores
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });

  function formatCurrency(val) {
    return currencyFormatter.format(val || 0);
  }

  function getCurrentYearMonthKey() {
    const yyyy = currentViewYear;
    const mm = String(currentViewMonth + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }

  // Preencher Dropdowns de Categorias (Filtro e Modal)
  function populateCategories() {
    if (typeof AURIX_CATEGORIES === 'undefined') return;

    if (filterCategoryEl) {
      filterCategoryEl.innerHTML = '<option value="all">Todas as Categorias</option>';
      AURIX_CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        filterCategoryEl.appendChild(opt);
      });
    }

    if (expenseCategorySelect) {
      expenseCategorySelect.innerHTML = '<option value="" disabled selected>Selecione uma categoria...</option>';
      AURIX_CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        expenseCategorySelect.appendChild(opt);
      });
    }
  }

  // Renderizar Grade de 12 Meses do Seletor
  function renderMonthDropdown() {
    if (!monthDropdownMenuEl) return;
    monthDropdownMenuEl.innerHTML = '';

    MONTH_NAMES.forEach((name, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `month-grid-item ${viewMode === 'month' && index === currentViewMonth ? 'active' : ''}`;
      item.textContent = name.substring(0, 3);
      item.title = `${name} de ${currentViewYear}`;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        viewMode = 'month';
        currentViewMonth = index;
        closeMonthPicker();
        renderHistory();
      });

      monthDropdownMenuEl.appendChild(item);
    });
  }

  // Formatação Amigável de Data por extenso
  function formatDateHeader(dateStr) {
    if (!dateStr) return 'Data não informada';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    const isToday = (
      TODAY.getFullYear() === y &&
      TODAY.getMonth() === (m - 1) &&
      TODAY.getDate() === d
    );

    const dayOfWeek = DAYS_OF_WEEK[dateObj.getDay()] || '';
    const monthName = MONTH_NAMES[m - 1] || '';

    if (isToday) {
      return `Hoje • ${String(d).padStart(2, '0')} de ${monthName} de ${y}`;
    }

    return `${dayOfWeek} • ${String(d).padStart(2, '0')} de ${monthName} de ${y}`;
  }

  // Filtragem e Ordenação
  function getFilteredTransactions() {
    const ymKey = getCurrentYearMonthKey();
    const searchTerm = (searchInputEl?.value || '').toLowerCase().trim();
    const categoryFilter = filterCategoryEl?.value || 'all';
    const paymentFilter = filterPaymentEl?.value || 'all';
    const sortBy = sortSelectEl?.value || 'date-desc';

    let list = [...expensesState];

    // 1. Filtro Temporal (Mês atual ou Todos os Meses)
    if (viewMode === 'month') {
      list = list.filter(tx => tx.date && tx.date.startsWith(ymKey));
    }

    // 2. Filtro Textual
    if (searchTerm) {
      list = list.filter(tx => {
        const catObj = AURIX_CATEGORIES.find(c => c.id === tx.categoryId);
        const catName = catObj ? catObj.name.toLowerCase() : '';
        const desc = (tx.description || '').toLowerCase();
        const pay = (tx.paymentMethod || '').toLowerCase();
        return desc.includes(searchTerm) || catName.includes(searchTerm) || pay.includes(searchTerm);
      });
    }

    // 3. Filtro por Categoria
    if (categoryFilter !== 'all') {
      list = list.filter(tx => tx.categoryId === categoryFilter);
    }

    // 4. Filtro por Forma de Pagamento
    if (paymentFilter !== 'all') {
      list = list.filter(tx => tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(paymentFilter.toLowerCase()));
    }

    // 5. Ordenação
    list.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return (b.date || '').localeCompare(a.date || '') || String(b.id || '').localeCompare(String(a.id || ''));
      }
      if (sortBy === 'date-asc') {
        return (a.date || '').localeCompare(b.date || '') || String(a.id || '').localeCompare(String(b.id || ''));
      }
      if (sortBy === 'amount-desc') {
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      }
      if (sortBy === 'amount-asc') {
        return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      }
      return 0;
    });

    return list;
  }

  // Renderização Principal do Histórico
  function renderHistory() {
    const list = getFilteredTransactions();
    const monthName = MONTH_NAMES[currentViewMonth];
    const fullMonthLabel = `${monthName} de ${currentViewYear}`;
    const isCurrentMonth = (currentViewYear === 2026 && currentViewMonth === 8);

    // 1. Atualizar Navegador de Meses
    if (viewMode === 'all') {
      if (currentMonthTextEl) currentMonthTextEl.textContent = 'Todos os Lançamentos';
      if (monthStatusPillEl) {
        monthStatusPillEl.textContent = 'Geral';
        monthStatusPillEl.className = 'month-status-pill';
      }
      if (headerDateTextEl) headerDateTextEl.textContent = 'Histórico Geral';
    } else {
      if (currentMonthTextEl) currentMonthTextEl.textContent = fullMonthLabel;
      if (monthStatusPillEl) {
        if (isCurrentMonth) {
          monthStatusPillEl.textContent = 'Mês Atual';
          monthStatusPillEl.className = 'month-status-pill';
        } else {
          monthStatusPillEl.textContent = 'Histórico';
          monthStatusPillEl.className = 'month-status-pill history';
        }
      }
      if (headerDateTextEl) headerDateTextEl.textContent = `${monthName}, ${currentViewYear}`;
    }

    renderMonthDropdown();

    // 2. Atualizar KPIs do Topo
    const totalSpent = list.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const count = list.length;

    let topTx = null;
    let maxVal = -1;
    list.forEach(tx => {
      const val = Number(tx.amount) || 0;
      if (val > maxVal) {
        maxVal = val;
        topTx = tx;
      }
    });

    if (historyTotalSpentEl) historyTotalSpentEl.textContent = formatCurrency(totalSpent);
    if (historyTotalCountEl) historyTotalCountEl.textContent = `${count} ${count === 1 ? 'despesa' : 'despesas'}`;
    if (feedResultsCountEl) feedResultsCountEl.textContent = `${count} ${count === 1 ? 'lançamento' : 'lançamentos'}`;

    if (historyTopTxEl) {
      if (topTx && maxVal > 0) {
        historyTopTxEl.textContent = `${formatCurrency(maxVal)}`;
        historyTopTxEl.title = topTx.description;
      } else {
        historyTopTxEl.textContent = 'R$ 0,00';
      }
    }

    // 3. Renderizar Timeline Agrupada por Data
    renderTimeline(list);
  }

  // Renderizar Extrato Cronológico Agrupado
  function renderTimeline(list) {
    if (!timelineContainerEl) return;

    if (list.length === 0) {
      timelineContainerEl.innerHTML = `
        <div class="empty-timeline-state">
          <div class="empty-icon-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="10" y1="14" x2="14" y2="18"/>
              <line x1="14" y1="14" x2="10" y2="18"/>
            </svg>
          </div>
          <h3>Nenhum lançamento encontrado</h3>
          <p>Não foram localizados gastos registrados para os filtros e período selecionados.</p>
          <button type="button" class="btn-aurix btn-primary-gold" id="btn-empty-new-expense" style="margin-top: 16px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Registrar Primeiro Gasto
          </button>
        </div>
      `;

      const btnEmpty = document.getElementById('btn-empty-new-expense');
      if (btnEmpty) btnEmpty.addEventListener('click', openModal);
      return;
    }

    // Agrupar por data (YYYY-MM-DD)
    const grouped = {};
    list.forEach(tx => {
      const dateKey = tx.date || 'Sem data';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(tx);
    });

    let html = '';

    Object.keys(grouped).forEach(dateKey => {
      const txsInDate = grouped[dateKey];
      const dayTotal = txsInDate.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      html += `
        <div class="timeline-date-group">
          <!-- Cabeçalho do Dia -->
          <div class="date-group-header">
            <div class="date-group-title">
              <span class="date-bullet-gold"></span>
              <h3>${formatDateHeader(dateKey)}</h3>
            </div>
            <span class="date-subtotal">Total no dia: <strong>${formatCurrency(dayTotal)}</strong></span>
          </div>

          <!-- Lista de Lançamentos do Dia -->
          <div class="date-transactions-list">
      `;

      txsInDate.forEach(tx => {
        const catObj = AURIX_CATEGORIES.find(c => c.id === tx.categoryId) || {
          name: 'Outros',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
        };

        html += `
          <div class="transaction-row" data-id="${tx.id}">
            <!-- Ícone da Categoria -->
            <div class="tx-icon-frame" title="${catObj.name}">
              ${catObj.icon}
            </div>

            <!-- Informações Centrais do Lançamento -->
            <div class="tx-main-info">
              <div class="tx-description">${escapeHtml(tx.description || 'Lançamento sem descrição')}</div>
              <div class="tx-tags-row">
                <span class="tx-tag-category">${catObj.name}</span>
                <span class="tx-tag-payment">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  ${escapeHtml(tx.paymentMethod || 'Cartão')}
                </span>
              </div>
            </div>

            <!-- Valor Monetário & Ações -->
            <div class="tx-actions-amount">
              <div class="tx-amount-value">- ${formatCurrency(tx.amount)}</div>
              <button type="button" class="btn-edit-tx" data-id="${tx.id}" title="Editar lançamento (mudar data, mês, valor ou categoria)" aria-label="Editar gasto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button type="button" class="btn-delete-tx" data-id="${tx.id}" title="Excluir este lançamento" aria-label="Excluir gasto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    timelineContainerEl.innerHTML = html;

    // Conectar eventos de exclusão com o modal do aplicativo
    document.querySelectorAll('.btn-delete-tx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idToDelete = Number(btn.getAttribute('data-id'));
        openDeleteModal(idToDelete);
      });
    });

    // Conectar eventos de edição
    document.querySelectorAll('.btn-edit-tx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idToEdit = Number(btn.getAttribute('data-id'));
        openEditModal(idToEdit);
      });
    });
  }

  // Modal Customizado de Exclusão Aurix
  function openDeleteModal(id) {
    const tx = expensesState.find(t => t.id === id);
    if (!tx) return;

    pendingDeleteId = id;
    const catObj = AURIX_CATEGORIES.find(c => c.id === tx.categoryId);
    const catName = catObj ? catObj.name : 'Categoria';

    let dateFormatted = tx.date || '';
    if (tx.date) {
      const [y, m, d] = tx.date.split('-');
      dateFormatted = `${d}/${m}/${y}`;
    }

    if (deletePreviewDesc) deletePreviewDesc.textContent = tx.description || 'Lançamento sem descrição';
    if (deletePreviewMeta) deletePreviewMeta.textContent = `${catName} • ${dateFormatted}`;
    if (deletePreviewAmount) deletePreviewAmount.textContent = `- ${formatCurrency(tx.amount)}`;

    if (modalConfirmDelete) {
      modalConfirmDelete.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDeleteModal() {
    if (modalConfirmDelete) {
      modalConfirmDelete.classList.remove('active');
      document.body.style.overflow = '';
    }
    pendingDeleteId = null;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Navegação de Meses
  const monthNavEl = document.querySelector('.month-navigator-bar');

  function closeMonthPicker() {
    if (monthPickerWrapper) monthPickerWrapper.classList.remove('open');
    if (monthNavEl) monthNavEl.classList.remove('dropdown-active');
  }

  function toggleMonthPicker() {
    if (!monthPickerWrapper) return;
    const isOpen = monthPickerWrapper.classList.toggle('open');
    if (monthNavEl) {
      if (isOpen) {
        monthNavEl.classList.add('dropdown-active');
      } else {
        monthNavEl.classList.remove('dropdown-active');
      }
    }
  }

  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      viewMode = 'month';
      currentViewMonth--;
      if (currentViewMonth < 0) {
        currentViewMonth = 11;
        currentViewYear--;
      }
      closeMonthPicker();
      renderHistory();
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      viewMode = 'month';
      currentViewMonth++;
      if (currentViewMonth > 11) {
        currentViewMonth = 0;
        currentViewYear++;
      }
      closeMonthPicker();
      renderHistory();
    });
  }

  if (btnMonthDisplay) {
    btnMonthDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMonthPicker();
    });
  }

  document.addEventListener('click', (e) => {
    if (monthPickerWrapper && !monthPickerWrapper.contains(e.target)) {
      closeMonthPicker();
    }
  });

  if (btnQuickToday) {
    btnQuickToday.addEventListener('click', () => {
      viewMode = 'month';
      currentViewYear = 2026;
      currentViewMonth = 8;
      closeMonthPicker();
      renderHistory();
    });
  }

  if (btnAllMonths) {
    btnAllMonths.addEventListener('click', () => {
      viewMode = 'all';
      closeMonthPicker();
      renderHistory();
    });
  }

  // Filtros Reativos
  if (searchInputEl) searchInputEl.addEventListener('input', renderHistory);
  if (filterCategoryEl) filterCategoryEl.addEventListener('change', renderHistory);
  if (filterPaymentEl) filterPaymentEl.addEventListener('change', renderHistory);
  if (sortSelectEl) sortSelectEl.addEventListener('change', renderHistory);

  // Modal Novo Gasto e Edição
  function setDefaultDateForModal() {
    if (expenseDateInput) {
      const yyyy = currentViewYear;
      const mm = String(currentViewMonth + 1).padStart(2, '0');
      const isCurrentMonth = (currentViewYear === 2026 && currentViewMonth === 8);
      const day = isCurrentMonth ? String(Math.min(TODAY.getDate() || 9, 28)).padStart(2, '0') : '05';
      expenseDateInput.value = `${yyyy}-${mm}-${day}`;
    }
  }

  function openModal() {
    editingExpenseId = null;
    populateCategories();
    setDefaultDateForModal();
    if (modalTitleEl) modalTitleEl.textContent = 'Cadastrar Novo Gasto';
    if (modalSubmitBtn) modalSubmitBtn.textContent = 'Confirmar Gasto';
    if (expenseForm) expenseForm.reset();
    if (modalBackdrop) {
      modalBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (expenseAmountInput) expenseAmountInput.focus();
    }
  }

  function openEditModal(id) {
    const tx = expensesState.find(t => t.id === id);
    if (!tx) return;

    editingExpenseId = id;
    populateCategories();

    if (modalTitleEl) modalTitleEl.textContent = 'Editar Lançamento';
    if (modalSubmitBtn) modalSubmitBtn.textContent = 'Salvar Alterações';

    if (expenseAmountInput) expenseAmountInput.value = tx.amount;
    if (expenseCategorySelect) expenseCategorySelect.value = tx.categoryId;
    if (expenseDescriptionInput) expenseDescriptionInput.value = tx.description || '';
    if (expenseDateInput) expenseDateInput.value = tx.date || new Date().toISOString().split('T')[0];
    if (expensePaymentSelect) expensePaymentSelect.value = tx.paymentMethod || 'Cartão de Crédito';

    if (modalBackdrop) {
      modalBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (expenseAmountInput) expenseAmountInput.focus();
    }
  }

  function closeModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('active');
      document.body.style.overflow = '';
      if (expenseForm) expenseForm.reset();
      editingExpenseId = null;
    }
  }

  if (newExpenseBtn) newExpenseBtn.addEventListener('click', openModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  // Eventos do Modal de Confirmação de Exclusão Aurix
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
      if (pendingDeleteId === null) return;
      const idToDelete = pendingDeleteId;
      const tx = expensesState.find(t => t.id === idToDelete);
      const desc = tx ? tx.description : 'Lançamento';

      try {
        const response = await fetch(`/api/expenses/${idToDelete}`, {
          method: 'DELETE',
          credentials: 'same-origin'
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          showToast(data.error || 'Não foi possível excluir o lançamento.');
          return;
        }

        expensesState = expensesState.filter(t => t.id !== idToDelete);
        renderHistory();
        closeDeleteModal();
        showToast(`Lançamento "${desc}" removido com sucesso.`);
      } catch (err) {
        showToast('Falha de conexão ao excluir o lançamento.');
      }
    });
  }

  if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteModal);
  if (modalDeleteCloseBtn) modalDeleteCloseBtn.addEventListener('click', closeDeleteModal);

  if (modalConfirmDelete) {
    modalConfirmDelete.addEventListener('click', (e) => {
      if (e.target === modalConfirmDelete) closeDeleteModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalBackdrop?.classList.contains('active')) closeModal();
      if (modalConfirmDelete?.classList.contains('active')) closeDeleteModal();
    }
  });

  // Cadastro e Edição de Gastos no Histórico
  if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rawAmount = expenseAmountInput?.value.replace(',', '.') || '0';
      const amount = parseFloat(rawAmount);
      const categoryId = expenseCategorySelect?.value;
      const description = expenseDescriptionInput?.value.trim();
      const date = expenseDateInput?.value;
      const paymentMethod = expensePaymentSelect?.value;

      if (!amount || isNaN(amount) || amount <= 0) {
        alert('Por favor, insira um valor válido para o gasto.');
        return;
      }

      if (!categoryId) {
        alert('Por favor, selecione uma das categorias.');
        return;
      }

      const payload = {
        description: description || 'Gasto sem descrição',
        amount,
        categoryId,
        date: date || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || 'Cartão de Crédito'
      };

      const isEditing = editingExpenseId !== null;

      try {
        const response = await fetch(isEditing ? `/api/expenses/${editingExpenseId}` : '/api/expenses', {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          showToast(data.error || 'Não foi possível salvar o lançamento.');
          return;
        }

        if (isEditing) {
          const index = expensesState.findIndex(t => t.id === editingExpenseId);
          if (index !== -1) expensesState[index] = data;
        } else {
          expensesState.unshift(data);
        }

        // Sincronizar período caso o mês do gasto tenha sido alterado
        if (payload.date && viewMode === 'month') {
          const [yearStr, monthStr] = payload.date.split('-');
          if (yearStr && monthStr) {
            currentViewYear = parseInt(yearStr, 10);
            currentViewMonth = parseInt(monthStr, 10) - 1;
          }
        }

        const categoryObj = AURIX_CATEGORIES.find(c => c.id === categoryId);
        const catName = categoryObj ? categoryObj.name : 'Categoria';

        renderHistory();
        closeModal();
        showToast(isEditing
          ? `Lançamento "${description || 'Gasto'}" atualizado com sucesso!`
          : `Novo lançamento de ${formatCurrency(amount)} em "${catName}" cadastrado com sucesso!`);
        editingExpenseId = null;
      } catch (err) {
        showToast('Falha de conexão ao salvar o lançamento.');
      }
    });
  }

  // Toast
  let toastTimeout = null;
  function showToast(msg) {
    if (!toastEl) return;
    if (toastMessageEl) toastMessageEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 4000);
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

    // Alternar visibilidade do menu suspenso
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

    // Ação de Bloquear Cofre (Logout)
    if (btnLockVault) {
      btnLockVault.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (e) {
          // Mesmo se a chamada falhar, seguimos para a tela de login
        }
        window.location.href = 'login.html';
      });
    }
  }

  // Inicialização: confere sessão, carrega despesas do servidor e renderiza
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

    try {
      const expensesResponse = await fetch('/api/expenses', { credentials: 'same-origin' });
      expensesState = expensesResponse.ok ? await expensesResponse.json() : [];
    } catch (e) {
      expensesState = [];
      showToast('Não foi possível carregar seus gastos. Verifique sua conexão.');
    }

    populateCategories();
    renderHistory();
    setupUserProfileMenu(user);
  }

  init();
});
