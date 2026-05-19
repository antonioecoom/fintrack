-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Extends Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  base_currency text not null default 'EUR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, base_currency)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'EUR');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Accounts Table (bank, cash, broker)
create table public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('bank', 'cash', 'broker')),
  balance numeric(15, 2) not null default 0.00,
  currency text not null default 'EUR',
  institution_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Accounts
alter table public.accounts enable row level security;

create policy "Users can perform all actions on their own accounts" on public.accounts
  for all using (auth.uid() = user_id);


-- 3. Transactions Table (income, expense, transfer)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  account_id uuid references public.accounts(id) on delete cascade not null,
  to_account_id uuid references public.accounts(id) on delete cascade, -- for transfers
  amount numeric(15, 2) not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  category text not null,
  description text,
  date date not null default current_date,
  is_pending boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Transactions
alter table public.transactions enable row level security;

create policy "Users can perform all actions on their own transactions" on public.transactions
  for all using (auth.uid() = user_id);

-- 4. Automatically update balances on transaction insert/update/delete
create or replace function public.update_account_balances()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    -- Deduct/Add from main account
    if new.type = 'income' then
      update public.accounts set balance = balance + new.amount where id = new.account_id;
    elsif new.type = 'expense' then
      update public.accounts set balance = balance - new.amount where id = new.account_id;
    elsif new.type = 'transfer' and new.to_account_id is not null then
      update public.accounts set balance = balance - new.amount where id = new.account_id;
      update public.accounts set balance = balance + new.amount where id = new.to_account_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.type = 'income' then
      update public.accounts set balance = balance - old.amount where id = old.account_id;
    elsif old.type = 'expense' then
      update public.accounts set balance = balance + old.amount where id = old.account_id;
    elsif old.type = 'transfer' and old.to_account_id is not null then
      update public.accounts set balance = balance + old.amount where id = old.account_id;
      update public.accounts set balance = balance - old.amount where id = old.to_account_id;
    end if;
  elsif tg_op = 'UPDATE' then
    -- Revert old balance effect
    if old.type = 'income' then
      update public.accounts set balance = balance - old.amount where id = old.account_id;
    elsif old.type = 'expense' then
      update public.accounts set balance = balance + old.amount where id = old.account_id;
    elsif old.type = 'transfer' and old.to_account_id is not null then
      update public.accounts set balance = balance + old.amount where id = old.account_id;
      update public.accounts set balance = balance - old.amount where id = old.to_account_id;
    end if;
    -- Apply new balance effect
    if new.type = 'income' then
      update public.accounts set balance = balance + new.amount where id = new.account_id;
    elsif new.type = 'expense' then
      update public.accounts set balance = balance - new.amount where id = new.account_id;
    elsif new.type = 'transfer' and new.to_account_id is not null then
      update public.accounts set balance = balance - new.amount where id = new.account_id;
      update public.accounts set balance = balance + new.amount where id = new.to_account_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger transaction_balance_trigger
  after insert or update or delete on public.transactions
  for each row execute procedure public.update_account_balances();
