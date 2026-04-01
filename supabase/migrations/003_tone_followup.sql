-- Agent tone settings on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS agent_tone TEXT NOT NULL DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS custom_tone_instructions TEXT;

