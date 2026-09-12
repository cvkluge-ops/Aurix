const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select id, name, email, role, status, created_at as "createdAt"
       from users
       order by (status = 'pending') desc, created_at desc`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
});

router.post('/users/:id/approve', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `update users set status = 'approved' where id = $1
       returning id, name, email, role, status, created_at as "createdAt"`,
      [req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao aprovar usuário:', err);
    res.status(500).json({ error: 'Erro interno ao aprovar usuário.' });
  }
});

router.post('/users/:id/reject', async (req, res) => {
  if (Number(req.params.id) === req.userId) {
    return res.status(400).json({ error: 'Você não pode rejeitar a própria conta.' });
  }

  try {
    const { rows } = await pool.query(
      `update users set status = 'rejected' where id = $1
       returning id, name, email, role, status, created_at as "createdAt"`,
      [req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao rejeitar usuário:', err);
    res.status(500).json({ error: 'Erro interno ao rejeitar usuário.' });
  }
});

module.exports = router;
