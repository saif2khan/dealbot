-- Agent active toggle — allows seller to pause/resume the agent.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS agent_active BOOLEAN NOT NULL DEFAULT true;
