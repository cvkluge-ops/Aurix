/**
 * AURIX — Redefinição de Senha via Token por E-mail
 */

(function () {
  'use strict';

  const form = document.getElementById('form-reset');
  const inputPassword = document.getElementById('reset-password');
  const inputPasswordConfirm = document.getElementById('reset-password-confirm');

  const btnSubmit = document.getElementById('btn-submit-reset');
  const btnContentIdle = btnSubmit ? btnSubmit.querySelector('.btn-content-idle') : null;
  const btnContentLoading = btnSubmit ? btnSubmit.querySelector('.btn-content-loading') : null;

  const alertBanner = document.getElementById('reset-alert');
  const alertText = document.getElementById('reset-alert-text');
  const successBanner = document.getElementById('reset-success');
  const successText = document.getElementById('reset-success-text');

  const btnSuggestPassword = document.getElementById('btn-suggest-password');
  const passwordSuggestionBox = document.getElementById('password-suggestion-box');
  const suggestedPasswordText = document.getElementById('suggested-password-text');
  const btnCopyPassword = document.getElementById('btn-copy-password');
  const btnUsePassword = document.getElementById('btn-use-password');

  const token = new URLSearchParams(window.location.search).get('token');

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
      if (inputPassword) inputPassword.value = value;
      if (inputPasswordConfirm) inputPasswordConfirm.value = value;
    });
  }

  if (!token) {
    showAlert('Link de redefinição inválido. Solicite um novo link em "Esqueceu a chave?" na tela de login.');
    if (form) {
      Array.from(form.elements).forEach((el) => { el.disabled = true; });
    }
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!token) return;

      const password = inputPassword ? inputPassword.value : '';
      const passwordConfirm = inputPasswordConfirm ? inputPasswordConfirm.value : '';

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
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token, newPassword: password })
        });

        const data = await response.json().catch(() => ({}));
        setLoadingState(false);

        if (!response.ok) {
          showAlert(data.error || 'Não foi possível redefinir a senha. Tente novamente.');
          return;
        }

        form.reset();
        Array.from(form.elements).forEach((el) => { el.disabled = true; });
        showSuccess(data.message || 'Senha redefinida com sucesso! Você já pode entrar com a nova senha.');
      } catch (err) {
        setLoadingState(false);
        showAlert('Falha de conexão com o servidor. Verifique sua internet e tente novamente.');
      }
    });
  }
})();
