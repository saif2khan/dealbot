-- Remove 'escalated' and 'resolved' from conversation_status enum.

DO $$ BEGIN
  ALTER TABLE public.conversations ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.conversations ALTER COLUMN status TYPE text USING status::text;
EXCEPTION WHEN others THEN
  NULL;
END $$;

UPDATE public.conversations SET status = 'active' WHERE status IN ('escalated', 'resolved');

DROP TYPE IF EXISTS conversation_status;
DROP TYPE IF EXISTS conversation_status_old;

CREATE TYPE conversation_status AS ENUM ('active');
ALTER TABLE public.conversations
  ALTER COLUMN status TYPE conversation_status USING status::conversation_status;
ALTER TABLE public.conversations ALTER COLUMN status SET DEFAULT 'active';
