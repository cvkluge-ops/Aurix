const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  try {
    const { rows } = await pool.query(
      'select id, email, password_hash, name from users where email = $1',
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

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: rememberMe ? '30d' : '1d'
    });

    res.cookie(COOKIE_NAME, token, cookieOptions(rememberMe));
    res.json({ user: { name: user.name, email: user.email } });
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
    const { rows } = await pool.query('select email, name from users where id = $1', [req.userId]);
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
