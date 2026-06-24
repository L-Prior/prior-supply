-- ============================================================
-- ITS VAULTED — VAT & Business Profile Migration (Phase 1)
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Business profile fields on profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_type     text    DEFAULT 'sole_trader',
  ADD COLUMN IF NOT EXISTS company_number    text,
  ADD COLUMN IF NOT EXISTS registered_address text,
  ADD COLUMN IF NOT EXISTS vat_scheme        text    DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS vat_flat_rate_pct decimal(5,2);

-- 2. VAT rate tracking on individual stock items
--    purchase_vat_rate: VAT rate applied when buying (0, 5, or 20)
--    sale_vat_rate:     VAT rate applied when selling (0, 5, or 20)
ALTER TABLE stock
  ADD COLUMN IF NOT EXISTS purchase_vat_rate decimal(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_vat_rate     decimal(5,2) DEFAULT 0;

-- 3. VAT rate tracking on expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS vat_rate decimal(5,2) DEFAULT 0;

-- ============================================================
-- How the VAT return (Finance → VAT Return tab) works:
--
--   Output VAT (Box 1) = SUM of VAT charged on sales
--     = sale_price * sale_vat_rate / (100 + sale_vat_rate)
--
--   Input VAT (Box 4) = SUM of VAT reclaimed on purchases + expenses
--     = purchase_price * purchase_vat_rate / (100 + purchase_vat_rate)
--     + expense_amount * vat_rate / (100 + vat_rate)
--
--   Net payable (Box 5) = Output VAT − Input VAT
--
-- All prices are stored VAT-inclusive. The app strips VAT
-- when displaying ex-VAT profit to Pro + VAT-registered users.
-- ============================================================
