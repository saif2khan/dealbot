-- Remove 'no_show' from deal_status enum — cancelled covers this case.

-- Step 1: Convert to text first regardless of current column state
DO $$ BEGIN
  ALTER TABLE public.pending_deals ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.pending_deals ALTER COLUMN status TYPE text USING status::text;
EXCEPTION WHEN others THEN
  NULL; -- already text from a previous partial run, continue
END $$;

-- Step 2: Now safe to update with plain text comparison
UPDATE public.pending_deals SET status = 'cancelled' WHERE status = 'no_show';

-- Step 3: Drop old enum types
DROP TYPE IF EXISTS deal_status;
DROP TYPE IF EXISTS deal_status_old;

-- Step 4: Recreate and restore column
CREATE TYPE deal_status AS ENUM ('scheduled', 'completed', 'cancelled');
ALTER TABLE public.pending_deals
  ALTER COLUMN status TYPE deal_status USING status::deal_status;
ALTER TABLE public.pending_deals ALTER COLUMN status SET DEFAULT 'scheduled';
