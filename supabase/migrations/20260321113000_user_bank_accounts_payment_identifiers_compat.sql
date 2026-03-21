-- ============================================================================
-- Migration: user_bank_accounts payment identifiers + compatibility layer
-- Date: 2026-03-21
-- Scope:
--   1) Add columns: aba_routing_number, usdt_network, wallet_address, binance_pay_uid
--   2) Add format validations
--   3) Backfill minimal compatibility data from account_number
--   4) Keep legacy compatibility between account_number and new fields
--
-- IMPORTANT:
-- - Propuesta para repositorio (no ejecutada automáticamente en producción).
-- - Compatible con despliegues incrementales donde el frontend ya envía
--   campos nuevos pero existen flujos legados con account_number.
-- ============================================================================

begin;

alter table public.user_bank_accounts
  add column if not exists aba_routing_number text,
  add column if not exists usdt_network text,
  add column if not exists wallet_address text,
  add column if not exists binance_pay_uid text;

comment on column public.user_bank_accounts.aba_routing_number
  is 'US ABA routing number (9 dígitos).';
comment on column public.user_bank_accounts.usdt_network
  is 'USDT network name (TRC20, ERC20, BEP20, POLYGON, SOL, ARBITRUM, TON, OTHER).';
comment on column public.user_bank_accounts.wallet_address
  is 'Dirección de wallet explícita para retiros/depósitos cripto.';
comment on column public.user_bank_accounts.binance_pay_uid
  is 'UID numérico de Binance Pay.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bank_accounts_aba_routing_number_format_chk'
  ) then
    alter table public.user_bank_accounts
      add constraint user_bank_accounts_aba_routing_number_format_chk
      check (
        aba_routing_number is null
        or aba_routing_number ~ '^[0-9]{9}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bank_accounts_usdt_network_chk'
  ) then
    alter table public.user_bank_accounts
      add constraint user_bank_accounts_usdt_network_chk
      check (
        usdt_network is null
        or usdt_network in ('TRC20', 'ERC20', 'BEP20', 'POLYGON', 'SOL', 'ARBITRUM', 'TON', 'OTHER')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bank_accounts_binance_pay_uid_format_chk'
  ) then
    alter table public.user_bank_accounts
      add constraint user_bank_accounts_binance_pay_uid_format_chk
      check (
        binance_pay_uid is null
        or binance_pay_uid ~ '^[0-9]{6,20}$'
      );
  end if;
end $$;

-- Backfill conservador para no romper datos existentes.
-- 1) Si el registro parece wallet USDT y wallet_address viene vacío, copiar account_number.
update public.user_bank_accounts
set wallet_address = account_number
where wallet_address is null
  and (
    usdt_network is not null
    or upper(coalesce(account_type, '')) like '%WALLET%'
    or upper(coalesce(bank_name, '')) like '%USDT%'
    or upper(coalesce(alias, '')) like '%USDT%'
  );

-- 2) Si el registro parece Binance Pay y binance_pay_uid viene vacío, copiar account_number.
update public.user_bank_accounts
set binance_pay_uid = account_number
where binance_pay_uid is null
  and (
    upper(coalesce(account_type, '')) = 'BINANCE_PAY'
    or upper(coalesce(bank_name, '')) like '%BINANCE%'
    or upper(coalesce(alias, '')) like '%BINANCE%'
  );

-- Capa de compatibilidad: sincroniza campos nuevos con account_number
-- para clientes legados durante la transición.
create or replace function public.sync_user_bank_accounts_compat_fields()
returns trigger
language plpgsql
as $$
begin
  -- Rellenar faltantes desde flujo legado (account_number).
  if new.usdt_network is not null and nullif(new.wallet_address, '') is null then
    new.wallet_address := new.account_number;
  end if;

  if upper(coalesce(new.account_type, '')) = 'BINANCE_PAY'
     and nullif(new.binance_pay_uid, '') is null then
    new.binance_pay_uid := new.account_number;
  end if;

  -- Mantener account_number alineado cuando llegan los campos nuevos.
  if new.usdt_network is not null and nullif(new.wallet_address, '') is not null then
    new.account_number := new.wallet_address;
  end if;

  if upper(coalesce(new.account_type, '')) = 'BINANCE_PAY'
     and nullif(new.binance_pay_uid, '') is not null then
    new.account_number := new.binance_pay_uid;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_user_bank_accounts_compat_fields on public.user_bank_accounts;

create trigger trg_sync_user_bank_accounts_compat_fields
before insert or update on public.user_bank_accounts
for each row
execute function public.sync_user_bank_accounts_compat_fields();

create index if not exists idx_user_bank_accounts_aba_routing_number
  on public.user_bank_accounts (aba_routing_number)
  where aba_routing_number is not null;

create index if not exists idx_user_bank_accounts_usdt_network
  on public.user_bank_accounts (usdt_network)
  where usdt_network is not null;

create index if not exists idx_user_bank_accounts_binance_pay_uid
  on public.user_bank_accounts (binance_pay_uid)
  where binance_pay_uid is not null;

commit;
