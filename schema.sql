create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table users add column if not exists role text not null default 'user';
alter table users add column if not exists status text not null default 'pending';
alter table users add column if not exists reset_token_hash text;
alter table users add column if not exists reset_token_expires timestamptz;

create table if not exists expenses (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null,
  category_id text not null,
  date date not null,
  payment_method text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_user_date on expenses(user_id, date);
