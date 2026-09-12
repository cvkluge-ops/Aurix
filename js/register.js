/**
 * AURIX — Lógica de Cadastro de Novo Usuário
 */

(function () {
  'use strict';

  const form = document.getElementById('form-register');
  const inputName = document.getElementById('register-name');
  const inputEmail = document.getElementById('register-email');
  const inputPassword = document.getElementById('register-password');
  const inputPasswordConfirm = document.getElementById('register-password-confirm');

  const btnSubmit = document.getElementById('btn-submit-register');
  const btnContentIdle = btnSubmit ? btnSubmit.querySelector('.btn-content-idle') : null;
  const btnContentLoading = btnSubmit ? btnSubmit.querySelector('.btn-content-loading') : null;

  const alertBanner = document.getElementById('register-alert');
  const alertText = document.getElementById('register-alert-text');
  const successBanner = document.getElementById('register-success');
  const successText = document.getElementById('register-success-text');

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

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const name = inputName ? inputName.value.trim() : '';
      const email = inputEmail ? inputEmail.value.trim() : '';
      const password = inputPassword ? inputPassword.value : '';
      const passwordConfirm = inputPasswordConfirm ? inputPasswordConfirm.value : '';

      if (!name) {
        showAlert('Por favor, informe seu nome completo.');
        if (inputName) inputName.focus();
        return;
      }

      if (!email || !email.includes('@') || email.length < 5) {
        showAlert('Por favor, informe um e-mail válido.');
        if (inputEmail) inputEmail.focus();
        return;
      }

      if (!password || password.length < 6) {
        showAlert('A senha precisa ter pelo menos 6 caracteres.');
        if (inputPassword) inputPassword.focus();
        return;
      }

      if (password !== passwordConfirm) {
        showAlert('As senhas digitadas não coincidem.');
        if (inputPasswordConfirm) inputPasswordConfirm.focus();
        return;
      }

      hideAlert();
      setLoadingState(true);

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setLoadingState(false);
          showAlert(data.error || 'Não foi possível concluir o cadastro. Tente novamente.');
          return;
        }

        setLoadingState(false);
        form.reset();
        showSuccess(data.message || 'Cadastro enviado! Aguarde a aprovação de um administrador.');
      } catch (err) {
        setLoadingState(false);
        showAlert('Falha de conexão com o servidor. Verifique sua internet e tente novamente.');
      }
    });
  }
})();
