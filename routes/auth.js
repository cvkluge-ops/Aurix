const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth, COOKIE_NAME } = require('../middleware/auth');
const { sendRegistrationConfirmationEmail, sendPasswordResetEmail } = require('../lib/mailer');

const router = express.Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions(rememberMe) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };
  if (rememberMe) {
    options.maxAge = THIRTY_DAYS_MS;
  }
  return options;
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Informe seu nome.' });
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const { rows: existing } = await pool.query('select id from users where email = $1', [normalizedEmail]);
    if (existing[0]) {
      return res.status(409).json({ error: 'Já existe um cadastro com este e-mail.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `insert into users (email, password_hash, name, role, status)
       values ($1, $2, $3, 'user', 'pending')`,
      [normalizedEmail, passwordHash, String(name).trim()]
    );

    try {
      await sendRegistrationConfirmationEmail({ to: normalizedEmail, name: String(name).trim() });
    } catch (emailErr) {
      console.error('Falha ao enviar e-mail de confirmação de cadastro:', emailErr.message);
    }

    res.status(201).json({
      message: 'Cadastro enviado com sucesso! Verifique seu e-mail e aguarde a aprovação de um administrador.'
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno ao tentar cadastrar.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  try {
    const { rows } = await pool.query(
      'select id, email, password_hash, name, role, status from users where email = $1',
      [String(email).toLowerCase().trim()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Seu cadastro ainda está aguardando aprovação de um administrador.' });
    }
    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Seu cadastro não foi aprovado para acessar o cofre.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: rememberMe ? '30d' : '1d'
    });

    res.cookie(COOKIE_NAME, token, cookieOptions(rememberMe));
    res.json({ user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao tentar autenticar.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('select email, name, role from users where id = $1', [req.userId]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 6 caracteres.' });
  }

  try {
    const { rows } = await pool.query('select password_hash from users where id = $1', [req.userId]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('update users set password_hash = $1 where id = $2', [newHash, req.userId]);

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('Erro ao trocar senha:', err);
    res.status(500).json({ error: 'Erro interno ao trocar senha.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  const genericMessage = 'Se esse e-mail estiver cadastrado, enviamos um link de redefinição de senha para ele.';

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const { rows } = await pool.query('select id, name from users where email = $1', [normalizedEmail]);
    const user = rows[0];

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await pool.query(
        'update users set reset_token_hash = $1, reset_token_expires = $2 where id = $3',
        [tokenHash, expiresAt, user.id]
      );

      const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
      const resetUrl = `${appUrl}/redefinir-senha.html?token=${token}`;

      try {
        await sendPasswordResetEmail({ to: normalizedEmail, name: user.name, resetUrl });
      } catch (emailErr) {
        console.error('Falha ao enviar e-mail de redefinição de senha:', emailErr.message);
      }
    }

    res.json({ message: genericMessage });
  } catch (err) {
    console.error('Erro ao processar pedido de redefinição de senha:', err);
    res.status(500).json({ error: 'Erro interno ao processar o pedido.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Link inválido.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 6 caracteres.' });
  }

  try {
    const tokenHash = hashToken(token);
    const { rows } = await pool.query(
      'select id from users where reset_token_hash = $1 and reset_token_expires > now()',
      [tokenHash]
    );
    const user = rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Link de redefinição inválido ou expirado. Solicite um novo.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'update users set password_hash = $1, reset_token_hash = null, reset_token_expires = null where id = $2',
      [newHash, user.id]
    );

    res.json({ message: 'Senha redefinida com sucesso. Você já pode entrar com a nova senha.' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ error: 'Erro interno ao redefinir senha.' });
  }
});

module.exports = router;
