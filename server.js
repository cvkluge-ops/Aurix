require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const expensesRoutes = require('./routes/expenses');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`AURIX rodando em http://localhost:${PORT}`);
});
