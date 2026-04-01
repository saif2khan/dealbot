-- Simplify waitlist_entries — only phone and item are needed.
ALTER TABLE public.waitlist_entries
  DROP COLUMN IF EXISTS buyer_name,
  DROP COLUMN IF EXISTS offered_price,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS broadcast_sent_at;
