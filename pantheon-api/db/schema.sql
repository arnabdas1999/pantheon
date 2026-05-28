-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  teardowns_used INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro'))
);

-- Teardowns
CREATE TABLE IF NOT EXISTS teardowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,  -- Supabase auth.users UUID, no FK (auth schema not accessible from public)
  share_slug TEXT UNIQUE NOT NULL,
  idea_raw TEXT NOT NULL,
  structured_brief TEXT,
  critical_question TEXT,
  overall_verdict TEXT CHECK (overall_verdict IN ('BUILD IT', 'VALIDATE FIRST', 'AVOID')),
  verdict_reasoning TEXT,
  critical_insight TEXT,
  themis_confidence INTEGER CHECK (themis_confidence BETWEEN 0 AND 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_public BOOLEAN DEFAULT true
);

-- Agent outputs
CREATE TABLE IF NOT EXISTS agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teardown_id UUID REFERENCES teardowns(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('market', 'technical', 'gtm', 'financial', 'risk')),
  model_used TEXT,
  output_text TEXT,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  passed_eval BOOLEAN,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teardowns_share_slug ON teardowns(share_slug);
CREATE INDEX IF NOT EXISTS idx_teardowns_user_id ON teardowns(user_id);
CREATE INDEX IF NOT EXISTS idx_teardowns_created_at ON teardowns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_teardown_id ON agent_outputs(teardown_id);

-- RLS (Row Level Security) for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teardowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;

-- Public teardowns readable by anyone
CREATE POLICY "Public teardowns are viewable by everyone"
  ON teardowns FOR SELECT
  USING (is_public = true);

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can read their own teardowns (including private)
CREATE POLICY "Users can view own teardowns"
  ON teardowns FOR SELECT
  USING (auth.uid() = user_id);

-- Backend (service role) can insert/update teardowns and agent outputs
CREATE POLICY "Service role can insert teardowns"
  ON teardowns FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update teardowns"
  ON teardowns FOR UPDATE
  USING (true);

CREATE POLICY "Service role can insert agent outputs"
  ON agent_outputs FOR INSERT
  WITH CHECK (true);

-- Agent outputs follow teardown visibility
CREATE POLICY "Agent outputs follow teardown access"
  ON agent_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teardowns t
      WHERE t.id = agent_outputs.teardown_id
      AND (t.is_public = true OR t.user_id = auth.uid())
    )
  );
