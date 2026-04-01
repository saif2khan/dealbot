-- Remove followup_sent_at — follow-up cron is no longer used.
ALTER TABLE public.pending_deals DROP COLUMN IF EXISTS followup_sent_at;
