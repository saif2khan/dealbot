-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'incomplete');
CREATE TYPE item_status AS ENUM ('active', 'pending', 'sold', 'archived');
CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'for_parts');
CREATE TYPE item_category AS ENUM ('electronics', 'furniture', 'vehicle', 'clothing', 'other');
CREATE TYPE conversation_status AS ENUM ('active');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_sender_type AS ENUM ('buyer', 'agent', 'seller');
CREATE TYPE deal_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE waitlist_entry_status AS ENUM ('waiting', 'broadcast_sent', 'won', 'lost');

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  address TEXT,          -- stored encrypted via pgcrypto
  address_area TEXT,     -- city/neighborhood, safe to share before deal confirmation
  phone TEXT,
  telnyx_number TEXT,
  telnyx_number_id TEXT,
  stripe_customer_id TEXT,
  subscription_status subscription_status,
  trial_ends_at TIMESTAMPTZ,
  global_instructions TEXT,
  availability_text TEXT,
  items_listed_this_month INTEGER NOT NULL DEFAULT 0,
  items_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items / Listings
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category item_category,
  tags TEXT[] DEFAULT '{}',
  condition item_condition NOT NULL,
  asking_price NUMERIC(10,2) NOT NULL,
  max_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  firm_price BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_times TEXT,
  status item_status NOT NULL DEFAULT 'active',
  pending_buyer_id UUID,  -- FK to pending_deals added below
  final_sale_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Conversations (one per unique buyer phone per seller)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  buyer_phone TEXT NOT NULL,
  buyer_name TEXT,
  current_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  status conversation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  body TEXT NOT NULL,
  sender_type message_sender_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pending Deals
CREATE TABLE public.pending_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  buyer_phone TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  agreed_price NUMERIC(10,2) NOT NULL,
  meetup_date DATE NOT NULL,
  meetup_time TIME NOT NULL,
  meetup_location TEXT NOT NULL,
  status deal_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from items.pending_buyer_id to pending_deals
ALTER TABLE public.items
  ADD CONSTRAINT fk_items_pending_buyer
  FOREIGN KEY (pending_buyer_id) REFERENCES public.pending_deals(id) ON DELETE SET NULL;

-- Waitlist Entries
CREATE TABLE public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  buyer_phone TEXT NOT NULL,
  status waitlist_entry_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_items_user_id ON public.items(user_id);
CREATE INDEX idx_items_status ON public.items(status);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_buyer_phone ON public.conversations(buyer_phone);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_pending_deals_item_id ON public.pending_deals(item_id);
CREATE INDEX idx_waitlist_entries_item_id ON public.waitlist_entries(item_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own items" ON public.items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own pending deals" ON public.pending_deals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = pending_deals.item_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own waitlist entries" ON public.waitlist_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = waitlist_entries.item_id AND i.user_id = auth.uid()
    )
  );

-- Service role bypass (for webhook handler — server-side only)
-- The service role key bypasses RLS by default in Supabase.
-- No additional policies needed for server-side operations.

-- Function: auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: reset items_listed_this_month at the start of each billing cycle
-- (Called from Stripe webhook on subscription renewal)
CREATE OR REPLACE FUNCTION public.reset_monthly_item_count(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users SET items_listed_this_month = 0 WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
