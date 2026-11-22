-- Pinging Your Day — Private Single-Owner Supabase PostgreSQL Schema
-- Run this SQL in your Supabase Project > SQL Editor

CREATE TABLE IF NOT EXISTS public.pinging_app_state (
  user_key TEXT PRIMARY KEY,
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pinging_saved_quotes (
  id TEXT PRIMARY KEY,
  user_key TEXT NOT NULL,
  quote TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pinging_share_links (
  slug TEXT PRIMARY KEY,
  friend_name TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'เพื่อนของคุณ',
  message TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  quote_source TEXT,
  owner_key TEXT DEFAULT 'owner-ping',
  owner_name TEXT DEFAULT 'คุณปิ้ง',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pinging_share_links
  ADD COLUMN IF NOT EXISTS owner_key TEXT DEFAULT 'owner-ping';
ALTER TABLE public.pinging_share_links
  ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT 'คุณปิ้ง';

CREATE INDEX IF NOT EXISTS idx_pinging_saved_quotes_user
  ON public.pinging_saved_quotes (user_key, created_at DESC);

-- Enable Row Level Security (Strict Single-Owner Privacy)
ALTER TABLE public.pinging_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinging_saved_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinging_share_links ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies if upgrading from an earlier schema
DROP POLICY IF EXISTS "Allow app state access" ON public.pinging_app_state;
DROP POLICY IF EXISTS "Allow saved quotes access" ON public.pinging_saved_quotes;
DROP POLICY IF EXISTS "Allow share links access" ON public.pinging_share_links;

-- Block ALL public (anon/authenticated) client queries to your personal routines, diary & quotes.
-- Only the server backend using SUPABASE_SERVICE_ROLE_KEY can read/write these tables.
CREATE POLICY "Deny public app state access"
  ON public.pinging_app_state
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny public saved quotes access"
  ON public.pinging_saved_quotes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Friend share cards (/ping/:slug) can be read safely without exposing personal tables
CREATE POLICY "Public read share links only"
  ON public.pinging_share_links
  FOR SELECT
  TO anon, authenticated
  USING (true);
