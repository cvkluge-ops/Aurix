require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function seed() {
  const { OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME } = process.env;

  if (!OWNER_EMAIL || !OWNER_PASSWORD) {
    throw new Error('Defina OWNER_EMAIL e OWNER_PASSWORD no .env antes de rodar o seed.');
  }

  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 10);

  const { rows } = await pool.query(
    `insert into users (email, password_hash, name, role, status)
     values ($1, $2, $3, 'admin', 'approved')
     on conflict (email) do update set
       password_hash = excluded.password_hash,
       name = excluded.name,
       role = 'admin',
       status = 'approved'
     returning id`,
    [OWNER_EMAIL.toLowerCase(), passwordHash, OWNER_NAME || 'Cezar']
  );
  const userId = rows[0].id;
  console.log(`Usuário "${OWNER_EMAIL}" pronto (id ${userId}).`);

  const { rows: countRows } = await pool.query(
    'select count(*)::int as count from expenses where user_id = $1',
    [userId]
  );

  if (countRows[0].count > 0) {
    console.log('Já existem despesas para este usuário, seed de exemplo não será inserido novamente.');
    await pool.end();
    return;
  }

  const seedExpenses = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'seed-expenses.json'), 'utf8')
  );

  for (const tx of seedExpenses) {
    await pool.query(
      `insert into expenses (user_id, description, amount, category_id, date, payment_method)
       values ($1, $2, $3, $4, $5, $6)`,
      [userId, tx.description, tx.amount, tx.categoryId, tx.date, tx.paymentMethod]
    );
  }

  console.log(`${seedExpenses.length} despesas de exemplo inseridas.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Falha ao rodar seed:', err.message);
  process.exit(1);
});
