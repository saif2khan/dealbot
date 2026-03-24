-- Agent tone settings on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS agent_tone TEXT NOT NULL DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS custom_tone_instructions TEXT;

-- No-show follow-up tracking on pending_deals
ALTER TABLE public.pending_deals
  ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ;
