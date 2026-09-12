const jwt = require('jsonwebtoken');
const pool = require('../db');

const COOKIE_NAME = 'aurix_session';

async function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  try {
    const { rows } = await pool.query(
      'select id, role, status from users where id = $1',
      [payload.userId]
    );
    const user = rows[0];

    if (!user || user.status !== 'approved') {
      return res.status(401).json({ error: 'Sessão inválida ou acesso revogado.' });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (err) {
    console.error('Erro ao validar sessão:', err);
    res.status(500).json({ error: 'Erro interno ao validar sessão.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, COOKIE_NAME };
