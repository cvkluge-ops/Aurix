/**
 * AURIX — Solicitação de Redefinição de Senha
 */

(function () {
  'use strict';

  const form = document.getElementById('form-forgot');
  const inputEmail = document.getElementById('forgot-email');

  const btnSubmit = document.getElementById('btn-submit-forgot');
  const btnContentIdle = btnSubmit ? btnSubmit.querySelector('.btn-content-idle') : null;
  const btnContentLoading = btnSubmit ? btnSubmit.querySelector('.btn-content-loading') : null;

  const alertBanner = document.getElementById('forgot-alert');
  const alertText = document.getElementById('forgot-alert-text');
  const successBanner = document.getElementById('forgot-success');
  const successText = document.getElementById('forgot-success-text');

  function showAlert(msg) {
    if (!alertBanner || !alertText) return;
    hideSuccess();
    alertText.textContent = msg;
    alertBanner.style.display = 'flex';
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

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = inputEmail ? inputEmail.value.trim() : '';

      if (!email || !email.includes('@') || email.length < 5) {
        showAlert('Por favor, informe um e-mail válido.');
        if (inputEmail) inputEmail.focus();
        return;
      }

      hideAlert();
      setLoadingState(true);

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email })
        });

        const data = await response.json().catch(() => ({}));
        setLoadingState(false);

        if (!response.ok) {
          showAlert(data.error || 'Não foi possível processar o pedido. Tente novamente.');
          return;
        }

        form.reset();
        showSuccess(data.message || 'Se esse e-mail estiver cadastrado, enviamos um link de redefinição.');
      } catch (err) {
        setLoadingState(false);
        showAlert('Falha de conexão com o servidor. Verifique sua internet e tente novamente.');
      }
    });
  }
})();
