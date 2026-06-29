-- ============================================================
-- ITS VAULTED — Add listed_on column to stock table
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Stores which platforms each in-stock item is currently listed on.
-- Stored as a text array e.g. ['eBay', 'Depop']

ALTER TABLE stock
  ADD COLUMN IF NOT EXISTS listed_on text[] DEFAULT '{}';

-- ============================================================
-- After running this, the Listings tab in the Stock page will
-- allow toggling per-platform listing status on each item.
-- ============================================================
