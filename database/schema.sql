-- VIBGYOR Bank — Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- RLS is disabled for now — enable with proper policies when auth is added

-- Customer Visits
create table if not exists customer_visits (
  id text primary key,
  date text not null,
  customer_name text not null,
  staff_id text not null,
  staff_name text not null,
  deposit_type text not null,
  action text not null,
  amount numeric not null default 0
);

-- Loan Enquiries
create table if not exists loan_enquiries (
  id text primary key,
  date text not null,
  customer_name text not null,
  entry_code text not null default '',
  source text not null,
  purpose text not null,
  loan_type text not null,
  amount numeric not null default 0,
  duration_months int not null default 0,
  profit_method text not null,
  profit_ratio numeric not null default 0,
  loan_scheme text not null default '',
  staff_id text not null,
  staff_name text not null,
  status text not null default 'Under Process'
);

-- Loan Bookings
create table if not exists loan_bookings (
  id text primary key,
  date text not null,
  customer_name text not null,
  start_date text not null,
  end_date text not null,
  full_loan_amount numeric not null default 0,
  emi_amount numeric not null default 0,
  tenure text not null,
  loan_scheme text not null,
  care_of_id text not null,
  care_of_name text not null,
  status text not null default 'Active'
);

-- Loan Repayments
create table if not exists loan_repayments (
  id text primary key,
  loan_booking_id text not null,
  period text not null,
  amount_paid numeric not null default 0,
  paid_date text not null,
  collected_by text not null,
  collected_by_name text not null,
  remarks text
);

-- Fund Transfers
create table if not exists fund_transfers (
  id text primary key,
  date text not null,
  beneficiary_id text not null,
  beneficiary_name text not null,
  amount numeric not null default 0,
  purpose text not null,
  status text not null default 'Pending',
  staff_id text not null,
  staff_name text not null
);

-- Beneficiaries
create table if not exists beneficiaries (
  id text primary key,
  name text not null,
  ifsc_code text not null,
  account_number text not null
);

-- Cashier Records (legacy)
create table if not exists cashier_records (
  id text primary key,
  date text not null,
  opening_balance numeric not null default 0,
  deposit_received numeric not null default 0,
  cash_out numeric not null default 0,
  closing_balance numeric not null default 0,
  denominations jsonb not null default '{}'
);

-- Daily Cashier States (V2 — nested objects stored as JSONB)
create table if not exists daily_cashier_states (
  id text primary key,
  date text not null unique,
  day_book jsonb not null,
  locker jsonb not null,
  loose jsonb not null,
  reconciliation jsonb not null,
  staff_advances jsonb not null default '[]',
  status text not null default 'draft'
);

-- CRE Daily Entries
create table if not exists cre_entries (
  id text primary key,
  date text not null,
  category text not null,
  account_number text not null default '',
  referred_by text not null default '',
  plan text,
  product text,
  dd_type text,
  collection_area text,
  amount numeric,
  tenure text,
  fresh_renewal text,
  scheme text,
  bank_cash text,
  fd_type text,
  profit_type text,
  profit_rate numeric,
  loan_scheme text,
  migration text,
  customer_name text,
  mobile_number text,
  staff_id text,
  staff_name text
);

-- Customer Movements
create table if not exists customer_movements (
  id text primary key,
  date text not null,
  customer_name text not null,
  mobile_number text not null,
  need text not null,
  treated_by text not null,
  remarks text not null default '',
  verified_by text not null default ''
);

-- Recurring Deposits
create table if not exists recurring_deposits (
  id text primary key,
  account_number text not null,
  customer_name text not null,
  mobile_number text not null default '',
  amount numeric not null default 0,
  tenure text not null,
  fresh_renewal text not null default 'Fresh',
  scheme text not null default '',
  start_date text not null,
  staff_id text not null,
  staff_name text not null,
  status text not null default 'Active'
);

-- RD Payments
create table if not exists rd_payments (
  id text primary key,
  rd_id text not null,
  period text not null,
  amount numeric not null default 0,
  paid_date text not null,
  collected_by text not null,
  collected_by_name text not null,
  remarks text
);

-- Schemes
create table if not exists schemes (
  id text primary key,
  name text not null,
  type text not null,
  description text,
  interest_rate numeric,
  tenure_months int,
  min_amount numeric,
  max_amount numeric,
  features jsonb,
  active boolean default true
);

-- Migration: add customer-facing columns for existing DBs
alter table schemes add column if not exists description text;
alter table schemes add column if not exists interest_rate numeric;
alter table schemes add column if not exists tenure_months int;
alter table schemes add column if not exists min_amount numeric;
alter table schemes add column if not exists max_amount numeric;
alter table schemes add column if not exists features jsonb;
alter table schemes add column if not exists active boolean default true;

-- Custom Referrers
create table if not exists custom_referrers (
  id text primary key,
  name text not null
);

-- Customer Accounts
create table if not exists customer_accounts (
  id text primary key,
  account_number text not null,
  customer_name text not null
);

-- Master Lists (single-row config table)
create table if not exists master_lists (
  id int primary key default 1 check (id = 1),
  membership_plans jsonb not null default '[]',
  membership_products jsonb not null default '[]',
  dd_types jsonb not null default '[]',
  collection_areas jsonb not null default '[]',
  tenure_options jsonb not null default '[]',
  migration_types jsonb not null default '[]',
  customer_needs jsonb not null default '[]',
  fd_types jsonb not null default '[]',
  loan_scheme_codes jsonb not null default '[]'
);

-- Bank Accounts (nationalized banks where VIBGYOR holds accounts)
create table if not exists bank_accounts (
  id text primary key,
  bank_name text not null,
  account_number text not null,
  ifsc_code text not null,
  branch text
);

-- Daily Bank Book States — one row per (date, bank_account) pair
create table if not exists daily_bank_book_states (
  id text primary key,
  date text not null,
  bank_account_id text not null references bank_accounts(id),
  bank_book jsonb not null,
  pending_items jsonb not null default '[]',
  status text not null default 'draft',
  unique(date, bank_account_id)
);

-- Profit Reports (Net Profit Calculator)
create table if not exists profit_reports (
  id text primary key,
  period text not null,
  period_type text not null,
  income_breakdown jsonb not null default '{}',
  expense_breakdown jsonb not null default '{}',
  total_income numeric not null default 0,
  total_expenses numeric not null default 0,
  net_profit numeric not null default 0,
  target_profit numeric,
  notes text,
  created_at text not null,
  updated_at text not null,
  unique(period, period_type)
);

-- Tickets
create table if not exists tickets (
  id text primary key,
  reference_number text not null unique,
  type text not null,
  status text not null default 'Open',
  priority text not null,
  customer_name text not null,
  customer_mobile text not null,
  account_number text not null,
  details jsonb not null default '{}',
  created_at text not null,
  updated_at text not null,
  assigned_to text,
  assigned_to_name text,
  resolved_at text,
  closed_at text
);

-- Ticket Replies
create table if not exists ticket_replies (
  id text primary key,
  ticket_id text not null references tickets(id) on delete cascade,
  message text not null,
  author text not null,
  author_name text not null,
  author_id text,
  "timestamp" text not null
);

-- Customer Users (authentication)
create table if not exists customer_users (
  id text primary key,
  name text not null,
  mobile text not null unique,
  account_number text not null,
  password_hash text not null,
  password_salt text not null,
  created_at text not null,
  last_login_at text
);

-- PIN columns (migration-safe)
alter table customer_users add column if not exists pin_hash text;
alter table customer_users add column if not exists pin_salt text;
alter table customer_users add column if not exists pin_updated_at text;

-- Per-customer beneficiaries (saved for fund transfers)
create table if not exists customer_beneficiaries (
  id text primary key,
  customer_user_id text not null references customer_users(id) on delete cascade,
  nickname text not null,
  beneficiary_name text not null,
  account_number text not null,
  ifsc_code text not null,
  bank_name text,
  created_at text not null
);

create index if not exists customer_beneficiaries_user_idx
  on customer_beneficiaries(customer_user_id);
