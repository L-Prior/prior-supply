-- ============================================================
-- ITS VAULTED — Topps-specific columns on stock table
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- These columns store Topps item details so the edit form
-- can pre-populate correctly. Previously only the generic
-- brand/style/colourway/sku fields were saved for Topps items.

ALTER TABLE stock
  ADD COLUMN IF NOT EXISTS topps_type        text,
  ADD COLUMN IF NOT EXISTS topps_card_name   text,
  ADD COLUMN IF NOT EXISTS topps_set         text,
  ADD COLUMN IF NOT EXISTS topps_year        text,
  ADD COLUMN IF NOT EXISTS topps_card_number text,
  ADD COLUMN IF NOT EXISTS topps_parallel    text,
  ADD COLUMN IF NOT EXISTS topps_print_run   text,
  ADD COLUMN IF NOT EXISTS topps_sealed_type text,
  ADD COLUMN IF NOT EXISTS topps_product_name text;

-- ============================================================
-- After running this, existing Topps items will show the
-- Singles/Sealed toggle blank on edit — the user just needs
-- to click the correct type and the other fields
-- (card name, set, card number) will already be filled
-- from the fallback logic in the app code.
-- ============================================================
