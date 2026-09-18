-- Migration 0011: Add eagles column to player_statistics
-- Eagles (toPar === -2) were not tracked as a separate category.

ALTER TABLE public.player_statistics
  ADD COLUMN IF NOT EXISTS eagles INT NOT NULL DEFAULT 0;
