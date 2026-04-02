-- Remove status column from conversations — all conversations are implicitly active.
ALTER TABLE public.conversations DROP COLUMN IF EXISTS status;

-- Drop the unused enum type
DROP TYPE IF EXISTS conversation_status;
