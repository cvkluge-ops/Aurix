const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  return transporter;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendRegistrationConfirmationEmail({ to, name }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('GMAIL_USER/GMAIL_APP_PASSWORD não configurados — e-mail de cadastro não enviado.');
    return;
  }

  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const loginUrl = `${appUrl}/login.html`;
  const safeName = escapeHtml(name);

  await getTransporter().sendMail({
    from: `"AURIX" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'AURIX — Cadastro recebido',
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h2 style="color: #C6A45A; margin-bottom: 4px;">AURIX</h2>
        <p style="color: #555; font-size: 0.85rem; margin-top: 0;">Cofre Financeiro Privativo</p>
        <p>Olá, ${safeName}!</p>
        <p>Recebemos sua solicitação de cadastro no AURIX. Um administrador vai revisar seu acesso em breve — você receberá acesso assim que for aprovado.</p>
        <p>
          <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#C6A45A;color:#0E0F14;text-decoration:none;border-radius:8px;font-weight:bold;">
            Acessar o AURIX
          </a>
        </p>
        <p style="font-size: 0.8rem; color: #888; margin-top: 24px;">
          Se você não solicitou este cadastro, pode ignorar este e-mail com segurança.
        </p>
      </div>
    `
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('GMAIL_USER/GMAIL_APP_PASSWORD não configurados — e-mail de redefinição não enviado.');
    return;
  }

  const safeName = escapeHtml(name);

  await getTransporter().sendMail({
    from: `"AURIX" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'AURIX — Redefinição de senha',
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h2 style="color: #C6A45A; margin-bottom: 4px;">AURIX</h2>
        <p style="color: #555; font-size: 0.85rem; margin-top: 0;">Cofre Financeiro Privativo</p>
        <p>Olá, ${safeName}!</p>
        <p>Recebemos um pedido para redefinir a senha da sua conta no AURIX. Clique no botão abaixo para escolher uma nova senha — o link expira em 1 hora.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#C6A45A;color:#0E0F14;text-decoration:none;border-radius:8px;font-weight:bold;">
            Redefinir Senha
          </a>
        </p>
        <p style="font-size: 0.8rem; color: #888; margin-top: 24px;">
          Se você não pediu essa redefinição, pode ignorar este e-mail com segurança — sua senha atual continua válida.
        </p>
      </div>
    `
  });
}

module.exports = { sendRegistrationConfirmationEmail, sendPasswordResetEmail };
