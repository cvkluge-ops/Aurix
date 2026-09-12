const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth, COOKIE_NAME } = require('../middleware/auth');
const { sendRegistrationConfirmationEmail } = require('../lib/mailer');

const router = express.Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

module.exports = router;
