# AURIX — Controle Financeiro Pessoal

App de controle de gastos pessoais com backend em Node.js/Express e banco Postgres (Supabase), preparado para deploy gratuito no Render.

## Rodando localmente

1. `npm install`
2. Copie `.env.example` para `.env` (ou edite o `.env` já existente) e preencha `DATABASE_URL` com a connection string do Supabase (botão **Connect** → **Direct Connection**, com a senha real). Se a senha tiver caracteres especiais, use percent-encoding:

   | Caractere | Codificado |
   |---|---|
   | `@` | `%40` |
   | `#` | `%23` |
   | `%` | `%25` |
   | `/` | `%2F` |
   | `:` | `%3A` |
   | `?` | `%3F` |
   | espaço | `%20` |

3. Crie as tabelas no Supabase:
   ```bash
   npm run migrate
   ```
   (alternativa: colar o conteúdo de `schema.sql` no SQL Editor do painel do Supabase)
4. Crie o usuário dono do cofre e as despesas de exemplo:
   ```bash
   npm run seed
   ```
5. (Opcional) Para o e-mail de confirmação de cadastro funcionar, gere uma **Senha de App** do Gmail:
   - Ative a verificação em duas etapas na sua conta Google, se ainda não tiver.
   - Acesse [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), gere uma senha para "Mail" e cole em `GMAIL_APP_PASSWORD` no `.env` (junto com `GMAIL_USER`).
   - Sem essa variável configurada, o cadastro continua funcionando normalmente — só o e-mail não é enviado (fica registrado um aviso no log).
6. Suba o servidor:
   ```bash
   npm start
   ```
   Acesse `http://localhost:3000/login.html` e entre com `OWNER_EMAIL`/`OWNER_PASSWORD` do `.env`.

## Deploy no Render (free tier, sem cartão)

1. Suba este repositório para o GitHub (repositório pode ser privado).
2. No [Render](https://dashboard.render.com), **New +** → **Web Service** → conecte o repositório.
3. Configuração do serviço:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Em **Environment**, adicione as variáveis (mesmos valores do seu `.env` local):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `OWNER_EMAIL`
   - `OWNER_PASSWORD`
   - `OWNER_NAME`
   - `NODE_ENV` = `production`
   - `APP_URL` = `https://SEU-SERVICO.onrender.com` (a URL pública do próprio serviço, usada no link do e-mail de cadastro)
   - `GMAIL_USER` e `GMAIL_APP_PASSWORD` (opcionais — sem elas o e-mail de confirmação de cadastro não é enviado)
5. Deploy. Depois do primeiro deploy bem-sucedido, rode a migração e o seed **uma vez** contra o banco de produção (pode ser da sua máquina local, apontando o `.env` para o mesmo `DATABASE_URL` do Render — é o mesmo banco Supabase):
   ```bash
   npm run migrate
   npm run seed
   ```
6. Acesse a URL pública que o Render gerou (`https://SEU-SERVICO.onrender.com`).

**Observação:** no free tier, o serviço "dorme" após ~15 min sem tráfego e demora alguns segundos para acordar na primeira requisição seguinte — comportamento normal do plano gratuito.
