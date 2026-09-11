/**
 * AURIX — Aplicação & Controle Financeiro
 * Lógica da Página Início (Dashboard) com Navegação Mensal
 */

document.addEventListener('DOMContentLoaded', () => {
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Estado do Mês Selecionado (Padrão: Setembro 2026 - mês 8 no JS 0-indexado)
  const TODAY = new Date();
  let currentViewYear = 2026;
  let currentViewMonth = 8; // Setembro

  let expensesState = [];

  // Elementos do DOM — Métricas & Hero
  const totalAmountEl = document.getElementById('total-amount-val');
  const totalTransactionsCountEl = document.getElementById('total-transactions-count');
  const dailyAverageEl = document.getElementById('daily-average-val');
  const topCategoryNameEl = document.getElementById('top-category-name');
  const topCategoryAmountEl = document.getElementById('top-category-amount');
  const cardPeriodIndicatorEl = document.getElementById('card-period-indicator');
  const headerDateTextEl = document.getElementById('header-date-text');

  // Elementos do DOM — Navegação de Meses
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const btnMonthDisplay = document.getElementById('btn-month-display');
  const currentMonthTextEl = document.getElementById('current-month-text');
  const monthStatusPillEl = document.getElementById('month-status-pill');
  const monthDropdownMenuEl = document.getElementById('month-dropdown-menu');
  const monthPickerWrapper = document.querySelector('.month-picker-wrapper');
  const btnQuickToday = document.getElementById('btn-quick-today');

  // Elementos do DOM — Categorias
  const categoriesGridEl = document.getElementById('categories-grid');
  const categoriesCountBadgeEl = document.getElementById('categories-count-badge');
  const searchInputEl = document.getElementById('search-categories');
  const sortSelectEl = document.getElementById('sort-categories');

  // Elementos do DOM — Modal Novo Gasto
  const heroNewExpenseBtn = document.getElementById('hero-btn-novo-gasto');
  const modalBackdrop = document.getElementById('modal-novo-gasto');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const expenseForm = document.getElementById('expense-form');
  const expenseCategorySelect = document.getElementById('expense-category');
  const expenseDateInput = document.getElementById('expense-date');
  const expenseAmountInput = document.getElementById('expense-amount');

  // Elementos do DOM — Toast
  const toastEl = document.getElementById('aurix-toast');
  const toastMessageEl = document.getElementById('toast-message');

  // Formatador de Moeda BRL
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });

  function formatCurrency(value) {
    return currencyFormatter.format(value || 0);
  }

  // Obter Chave YYYY-MM
  function getCurrentYearMonthKey() {
    const yyyy = currentViewYear;
    const mm = String(currentViewMonth + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }

  // Preencher Select de Categorias no Modal com as 15 categorias
  function populateCategorySelect() {
    if (!expenseCategorySelect) return;
    expenseCategorySelect.innerHTML = '<option value="" disabled selected>Selecione uma categoria...</option>';
    AURIX_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      expenseCategorySelect.appendChild(opt);
    });
  }

  // Construir Dropdown com os 12 meses
  function renderMonthDropdown() {
    if (!monthDropdownMenuEl) return;
    monthDropdownMenuEl.innerHTML = '';

    MONTH_NAMES.forEach((name, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `month-grid-item ${index === currentViewMonth ? 'active' : ''}`;
      item.textContent = name.substring(0, 3);
      item.title = `${name} de ${currentViewYear}`;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        currentViewMonth = index;
        if (monthPickerWrapper) monthPickerWrapper.classList.remove('open');
        renderDashboard();
      });

      monthDropdownMenuEl.appendChild(item);
    });
  }

  // Ajustar Data Padrão para o Modal baseada no Mês Selecionado
  function setDefaultDateForModal() {
    if (expenseDateInput) {
      const yyyy = currentViewYear;
      const mm = String(currentViewMonth + 1).padStart(2, '0');
      // Dia de hoje se estiver no mês atual, ou dia 05 como padrão
      const isCurrentMonth = (currentViewYear === 2026 && currentViewMonth === 8);
      const day = isCurrentMonth ? String(Math.min(TODAY.getDate() || 9, 28)).padStart(2, '0') : '05';
      expenseDateInput.value = `${yyyy}-${mm}-${day}`;
    }
  }

  // Cálculos do Mês Selecionado
  function calculateMetricsForMonth() {
    const ymKey = getCurrentYearMonthKey();

    // Filtrar apenas despesas do mês corrente visualizado
    const monthExpenses = expensesState.filter(tx => tx.date && tx.date.startsWith(ymKey));
    const grandTotal = monthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const count = monthExpenses.length;

    // Calcular por categoria
    const categoryTotals = {};
    AURIX_CATEGORIES.forEach(cat => {
      categoryTotals[cat.id] = {
        category: cat,
        total: 0,
        count: 0
      };
    });

    monthExpenses.forEach(tx => {
      if (categoryTotals[tx.categoryId]) {
        categoryTotals[tx.categoryId].total += Number(tx.amount) || 0;
        categoryTotals[tx.categoryId].count += 1;
      }
    });

    // Média diária
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    const isCurrentMonth = (currentViewYear === 2026 && currentViewMonth === 8);
    const daysDivider = isCurrentMonth ? Math.min(TODAY.getDate() || 9, daysInMonth) : daysInMonth;
    const dailyAvg = grandTotal > 0 ? (grandTotal / Math.max(daysDivider, 1)) : 0;

    // Categoria de maior gasto
    let topCat = null;
    let maxSpent = -1;
    Object.values(categoryTotals).forEach(item => {
      if (item.total > maxSpent) {
        maxSpent = item.total;
        topCat = item;
      }
    });

    return {
      grandTotal,
      count,
      dailyAvg,
      topCat,
      categoryTotals,
      isCurrentMonth
    };
  }

  // Renderização Completa
  function renderDashboard() {
    const { grandTotal, count, dailyAvg, topCat, categoryTotals, isCurrentMonth } = calculateMetricsForMonth();
    const monthName = MONTH_NAMES[currentViewMonth];
    const fullMonthLabel = `${monthName} de ${currentViewYear}`;

    // 1. Atualizar Barra de Navegação de Meses
    if (currentMonthTextEl) {
      currentMonthTextEl.textContent = fullMonthLabel;
    }

    if (monthStatusPillEl) {
      if (isCurrentMonth) {
        monthStatusPillEl.textContent = 'Mês Atual';
        monthStatusPillEl.className = 'month-status-pill';
      } else if (currentViewYear < 2026 || (currentViewYear === 2026 && currentViewMonth < 8)) {
        monthStatusPillEl.textContent = 'Histórico';
        monthStatusPillEl.className = 'month-status-pill history';
      } else {
        monthStatusPillEl.textContent = 'Futuro';
        monthStatusPillEl.className = 'month-status-pill history';
      }
    }

    if (headerDateTextEl) {
      headerDateTextEl.textContent = `${monthName}, ${currentViewYear}`;
    }

    if (cardPeriodIndicatorEl) {
      cardPeriodIndicatorEl.textContent = isCurrentMonth ? `Mês Atual (${monthName})` : fullMonthLabel;
    }

    // 2. Atualizar Card Total Gasto
    if (totalAmountEl) {
      const formatted = formatCurrency(grandTotal).replace('R$', '').trim();
      totalAmountEl.textContent = formatted;
    }

    if (totalTransactionsCountEl) {
      totalTransactionsCountEl.textContent = count;
    }

    if (dailyAverageEl) {
      dailyAverageEl.textContent = formatCurrency(dailyAvg);
    }

    // 3. Maior Gasto
    if (topCategoryNameEl) {
      if (topCat && topCat.total > 0) {
        topCategoryNameEl.textContent = topCat.category.name;
      } else {
        topCategoryNameEl.textContent = 'Nenhum gasto';
      }
    }
    if (topCategoryAmountEl) {
      if (topCat && topCat.total > 0) {
        topCategoryAmountEl.textContent = formatCurrency(topCat.total);
      } else {
        topCategoryAmountEl.textContent = 'R$ 0,00';
      }
    }

    // 4. Renderizar Categorias
    renderCategoryCards(categoryTotals, grandTotal);

    // 5. Atualizar Dropdown de Meses
    renderMonthDropdown();
  }

  // Renderizar Grid das 15 Categorias
  function renderCategoryCards(categoryTotals, grandTotal) {
    if (!categoriesGridEl) return;

    const searchTerm = (searchInputEl?.value || '').toLowerCase().trim();
    const sortBy = sortSelectEl?.value || 'amount-desc';

    let list = Object.values(categoryTotals);

    if (searchTerm) {
      list = list.filter(item =>
        item.category.name.toLowerCase().includes(searchTerm) ||
        item.category.description.toLowerCase().includes(searchTerm)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'amount-desc') return b.total - a.total;
      if (sortBy === 'amount-asc') return a.total - b.total;
      if (sortBy === 'name-asc') return a.category.name.localeCompare(b.category.name);
      if (sortBy === 'tx-desc') return b.count - a.count;
      return 0;
    });

    if (categoriesCountBadgeEl) {
      categoriesCountBadgeEl.textContent = `${list.length} de 15`;
    }

    if (list.length === 0) {
      categoriesGridEl.innerHTML = `
        <div class="empty-categories-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>Nenhuma categoria encontrada</h3>
          <p>Nenhuma categoria corresponde à busca "${searchTerm}".</p>
        </div>
      `;
      return;
    }

    categoriesGridEl.innerHTML = list.map(item => {
      const percentage = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : '0.0';
      const isHigh = parseFloat(percentage) >= 15;

      return `
        <div class="category-card" data-category-id="${item.category.id}">
          <div class="category-card-top">
            <div class="category-icon-title">
              <div class="category-icon-wrapper">
                ${item.category.icon}
              </div>
              <div class="category-text-info">
                <h3>${item.category.name}</h3>
                <span class="category-tx-count">${item.count} ${item.count === 1 ? 'gasto registrado' : 'gastos registrados'}</span>
              </div>
            </div>
            <span class="category-percentage-badge ${isHigh ? 'highlight' : ''}">${percentage}%</span>
          </div>

          <div class="category-amount-row">
            <span class="category-amount-label">Total gasto</span>
            <span class="category-amount-value">${formatCurrency(item.total)}</span>
          </div>

          <div class="category-progress-track">
            <div class="category-progress-bar" style="width: ${Math.min(Math.max(parseFloat(percentage), item.total > 0 ? 3 : 0), 100)}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Navegação de Meses — Handlers
  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      currentViewMonth--;
      if (currentViewMonth < 0) {
        currentViewMonth = 11;
        currentViewYear--;
      }
      renderDashboard();
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      currentViewMonth++;
      if (currentViewMonth > 11) {
        currentViewMonth = 0;
        currentViewYear++;
      }
      renderDashboard();
    });
  }

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

  if (btnMonthDisplay) {
    btnMonthDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMonthPicker();
    });
  }

  // Fechar dropdown de meses ao clicar fora
  document.addEventListener('click', (e) => {
    if (monthPickerWrapper && !monthPickerWrapper.contains(e.target)) {
      closeMonthPicker();
    }
  });

  if (btnQuickToday) {
    btnQuickToday.addEventListener('click', () => {
      currentViewYear = 2026;
      currentViewMonth = 8; // Setembro
      closeMonthPicker();
      renderDashboard();
    });
  }

  // Gerenciamento do Modal Novo Gasto
  function openModal() {
    populateCategorySelect();
    setDefaultDateForModal();
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
    }
  }

  // Toast Feedback
  let toastTimeout = null;
  function showToast(message) {
    if (!toastEl) return;
    if (toastMessageEl) toastMessageEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 4000);
  }

  if (heroNewExpenseBtn) heroNewExpenseBtn.addEventListener('click', openModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop?.classList.contains('active')) {
      closeModal();
    }
  });

  // Filtros e Busca
  if (searchInputEl) {
    searchInputEl.addEventListener('input', () => {
      const { grandTotal, categoryTotals } = calculateMetricsForMonth();
      renderCategoryCards(categoryTotals, grandTotal);
    });
  }

  if (sortSelectEl) {
    sortSelectEl.addEventListener('change', () => {
      const { grandTotal, categoryTotals } = calculateMetricsForMonth();
      renderCategoryCards(categoryTotals, grandTotal);
    });
  }

  // Submissão do Formulário de Novo Gasto
  if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rawAmount = expenseAmountInput?.value.replace(',', '.') || '0';
      const amount = parseFloat(rawAmount);
      const categoryId = expenseCategorySelect?.value;
      const description = document.getElementById('expense-description')?.value.trim();
      const date = expenseDateInput?.value;
      const paymentMethod = document.getElementById('expense-payment')?.value;

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
        amount: amount,
        categoryId: categoryId,
        date: date || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || 'Cartão de Crédito'
      };

      try {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          showToast(data.error || 'Não foi possível salvar o gasto.');
          return;
        }

        // Inserir no estado com o registro retornado pelo servidor (já com id real)
        expensesState.unshift(data);

        // Se o gasto adicionado pertence a outro mês, podemos ajustar a visualização para esse mês
        const [yearStr, monthStr] = payload.date.split('-');
        if (yearStr && monthStr) {
          currentViewYear = parseInt(yearStr, 10);
          currentViewMonth = parseInt(monthStr, 10) - 1;
        }

        const categoryObj = AURIX_CATEGORIES.find(c => c.id === categoryId);
        const catName = categoryObj ? categoryObj.name : 'Categoria';

        renderDashboard();
        closeModal();
        showToast(`Novo gasto de ${formatCurrency(amount)} em "${catName}" cadastrado com sucesso!`);
      } catch (err) {
        showToast('Falha de conexão ao salvar o gasto.');
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

    if (user && user.name) {
      if (displayUserName) displayUserName.textContent = user.name;
      if (displayUserAvatar) displayUserAvatar.textContent = user.name.charAt(0).toUpperCase();
      if (menuUserName) menuUserName.textContent = user.name;
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

    populateCategorySelect();
    renderDashboard();
    setupUserProfileMenu(user);
  }

  init();
});
