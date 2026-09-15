/**
 * AURIX — Lógica de Autenticação e Acesso ao Cofre Privativo
 * Versão 4.0 — Autenticação real via API + Postgres
 */

(function () {
  'use strict';

  // Elementos do DOM
  const formLogin = document.getElementById('form-login');
  const inputEmail = document.getElementById('login-email');
  const inputPassword = document.getElementById('login-password');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const iconEyeClosed = btnTogglePassword ? btnTogglePassword.querySelector('.icon-eye-closed') : null;
  const iconEyeOpen = btnTogglePassword ? btnTogglePassword.querySelector('.icon-eye-open') : null;
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  const btnContentIdle = btnSubmitLogin ? btnSubmitLogin.querySelector('.btn-content-idle') : null;
  const btnContentLoading = btnSubmitLogin ? btnSubmitLogin.querySelector('.btn-content-loading') : null;
  const btnQuickFill = document.getElementById('btn-quick-fill');
  const checkboxRemember = document.getElementById('remember-me');

  // Alerta
  const loginAlert = document.getElementById('login-alert');
  const loginAlertText = document.getElementById('login-alert-text');

  // E-mail do proprietário (Cezar), só para atalho de preenchimento — a senha real vive no banco
  const OWNER_EMAIL_HINT = 'cezar@aurix.com';

  /**
   * Inicialização do módulo de autenticação
   */
  function initAuth() {
    setupPasswordToggle();
    setupQuickAccess();
    setupFormSubmission();
    redirectIfAlreadyAuthenticated();
  }

  /**
   * Alternância entre exibir e ocultar senha
   */
  function setupPasswordToggle() {
    if (!btnTogglePassword || !inputPassword) return;

    btnTogglePassword.addEventListener('click', function () {
      const isPassword = inputPassword.getAttribute('type') === 'password';
      inputPassword.setAttribute('type', isPassword ? 'text' : 'password');

      if (iconEyeClosed && iconEyeOpen) {
        if (isPassword) {
          iconEyeClosed.style.display = 'none';
          iconEyeOpen.style.display = 'block';
          btnTogglePassword.setAttribute('title', 'Ocultar senha');
          btnTogglePassword.setAttribute('aria-label', 'Ocultar senha');
        } else {
          iconEyeClosed.style.display = 'block';
          iconEyeOpen.style.display = 'none';
          btnTogglePassword.setAttribute('title', 'Exibir senha');
          btnTogglePassword.setAttribute('aria-label', 'Exibir senha');
        }
      }
      inputPassword.focus();
    });
  }

  /**
   * Atalho de preenchimento rápido do e-mail de Cezar (a senha precisa ser digitada)
   */
  function setupQuickAccess() {
    if (!btnQuickFill) return;

    btnQuickFill.addEventListener('click', function () {
      if (inputEmail) inputEmail.value = OWNER_EMAIL_HINT;
      hideAlert();

      btnQuickFill.classList.add('chip-pulse');
      setTimeout(() => btnQuickFill.classList.remove('chip-pulse'), 400);

      if (inputPassword) inputPassword.focus();
    });
  }

  /**
   * Submissão e validação do formulário de login
   */
  function setupFormSubmission() {
    if (!formLogin) return;

    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = inputEmail ? inputEmail.value.trim() : '';
      const password = inputPassword ? inputPassword.value : '';

      // Validações amigáveis
      if (!email || !email.includes('@') || email.length < 5) {
        showAlert('Por favor, informe um endereço de e-mail de acesso válido.');
        if (inputEmail) inputEmail.focus();
        return;
      }

      if (!password || password.trim().length < 4) {
        showAlert('Por favor, digite sua senha de segurança do cofre (mínimo 4 caracteres).');
        if (inputPassword) inputPassword.focus();
        return;
      }

      hideAlert();
      setLoadingState(true);

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            email,
            password,
            rememberMe: checkboxRemember ? checkboxRemember.checked : true
          })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setLoadingState(false);
          showAlert(data.error || 'Não foi possível desbloquear o cofre. Tente novamente.');
          if (inputPassword) inputPassword.focus();
          return;
        }

        if (btnContentLoading) {
          btnContentLoading.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#F2D487" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style="color: #F2D487; font-weight: 700;">Cofre Desbloqueado!</span>
          `;
        }

        setTimeout(function () {
          window.location.href = 'index.html';
        }, 400);
      } catch (err) {
        setLoadingState(false);
        showAlert('Falha de conexão com o servidor. Verifique sua internet e tente novamente.');
      }
    });
  }

  /**
   * Controle de estado de carregamento do botão
   */
  function setLoadingState(isLoading) {
    if (!btnSubmitLogin) return;

    if (isLoading) {
      btnSubmitLogin.disabled = true;
      if (btnContentIdle) btnContentIdle.style.display = 'none';
      if (btnContentLoading) btnContentLoading.style.display = 'inline-flex';
    } else {
      btnSubmitLogin.disabled = false;
      if (btnContentIdle) btnContentIdle.style.display = 'inline-flex';
      if (btnContentLoading) btnContentLoading.style.display = 'none';
    }
  }

  /**
   * Alertas informativos de validação
   */
  function showAlert(msg) {
    if (!loginAlert || !loginAlertText) return;
    loginAlertText.textContent = msg;
    loginAlert.style.display = 'flex';
    loginAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    if (!loginAlert) return;
    loginAlert.style.display = 'none';
  }

  /**
   * Se já existir uma sessão válida no servidor, pula direto para o dashboard
   */
  async function redirectIfAlreadyAuthenticated() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (response.ok) {
        window.location.href = 'index.html';
      }
    } catch (e) {
      // Sem conexão ou servidor indisponível — permanece na tela de login
    }
  }

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }

})();
