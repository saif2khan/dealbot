-- Remove status from waitlist_entries — waitlist is now a simple list.
-- When an item becomes available, all entries are broadcast to and deleted.
ALTER TABLE public.waitlist_entries DROP COLUMN IF EXISTS status;

-- Drop the unused enum type
DROP TYPE IF EXISTS waitlist_entry_status;
