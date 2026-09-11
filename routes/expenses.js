const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const SELECT_COLUMNS = `
  id,
  description,
  amount::float8 as amount,
  category_id as "categoryId",
  to_char(date, 'YYYY-MM-DD') as date,
  payment_method as "paymentMethod"
`;

function validateExpenseBody(body) {
  const amount = Number(body.amount);
  if (!body.categoryId || typeof body.categoryId !== 'string') {
    return 'Categoria é obrigatória.';
  }
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return 'Valor inválido.';
  }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return 'Data inválida.';
  }
  return null;
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select ${SELECT_COLUMNS} from expenses where user_id = $1 order by date desc, id desc`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar despesas:', err);
    res.status(500).json({ error: 'Erro interno ao listar despesas.' });
  }
});

router.post('/', async (req, res) => {
  const error = validateExpenseBody(req.body);
  if (error) return res.status(400).json({ error });

  const { description, amount, categoryId, date, paymentMethod } = req.body;

  try {
    const { rows } = await pool.query(
      `insert into expenses (user_id, description, amount, category_id, date, payment_method)
       values ($1, $2, $3, $4, $5, $6)
       returning ${SELECT_COLUMNS}`,
      [req.userId, description || 'Gasto sem descrição', amount, categoryId, date, paymentMethod || 'Cartão de Crédito']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao criar despesa:', err);
    res.status(500).json({ error: 'Erro interno ao criar despesa.' });
  }
});

router.put('/:id', async (req, res) => {
  const error = validateExpenseBody(req.body);
  if (error) return res.status(400).json({ error });

  const { description, amount, categoryId, date, paymentMethod } = req.body;

  try {
    const { rows } = await pool.query(
      `update expenses
       set description = $1, amount = $2, category_id = $3, date = $4, payment_method = $5
       where id = $6 and user_id = $7
       returning ${SELECT_COLUMNS}`,
      [description || 'Gasto sem descrição', amount, categoryId, date, paymentMethod || 'Cartão de Crédito', req.params.id, req.userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Lançamento não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar despesa:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar despesa.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'delete from expenses where id = $1 and user_id = $2 returning id',
      [req.params.id, req.userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Lançamento não encontrado.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir despesa:', err);
    res.status(500).json({ error: 'Erro interno ao excluir despesa.' });
  }
});

module.exports = router;
