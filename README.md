# The Pantheon

> Stress-test any startup idea in under 2 minutes using 7 AI agents.

**[Live demo →](https://your-domain.vercel.app)**

---

## What it does

You describe a startup idea. Seven agents tear it apart simultaneously and deliver a structured verdict.

| Agent | Role |
|---|---|
| **Kronos** | Structures your raw idea into a brief all agents work from |
| **Market** | TAM, competitors, demand signals, customer segments |
| **Technical** | Build complexity, stack, MVP scope, technical moat |
| **GTM** | ICP, channels, first 100 users playbook |
| **Financial** | Pricing, unit economics, path to break-even |
| **Risk** | Top failure modes, bear case, regulatory landmines |
| **Themis** | Eval judge — scores agents, retries weak outputs, delivers verdict |

Verdict: **BUILD IT** / **VALIDATE FIRST** / **AVOID** — with a confidence score and shareable URL.

All agents run on **Llama 3.3 70B via Groq** (free tier). Users bring their own Groq API key.

---

## Architecture

```
Idea input
    │
    ▼
Kronos — single-shot brief structuring
    │
    ▼
Phase 1 (parallel): Market + Technical
  Each agent runs a bounded ReAct loop:
    for up to 3 iterations:
      → agent reasons about what it needs
      → issues <search> queries via Serper
      → reads results, decides if more research needed
    → writes final analysis (streaming)
    │
    ▼
Phase 2 (parallel): GTM + Financial + Risk
  Same ReAct loop + receives Phase 1 findings via shared context
    │
    ▼
Cross-agent contradiction check
    │
    ▼
Themis — confidence-weighted eval → retries weak agents → devil's advocate
    │
    ▼
Verdict stored in PostgreSQL → shareable URL
WebSocket streams every step live to the browser
```

---

## Tech stack

**Backend** — `pantheon-api/`
- Python 3.11, FastAPI, asyncio
- LiteLLM (unified LLM interface)
- Groq API — Llama 3.3 70B (user-provided key)
- Serper API (web search grounding)
- PostgreSQL via Supabase
- WebSockets for real-time streaming

**Frontend** — `pantheon-web/`
- Next.js 14 App Router
- Tailwind CSS
- Supabase Auth (magic link)

**Infrastructure**
- Frontend: Vercel
- Backend: Railway
- Database + Auth: Supabase

---

## Local setup

### 1. Clone

```bash
git clone https://github.com/yourhandle/pantheon
cd pantheon
```

### 2. Backend

```bash
cd pantheon-api
pip install -r requirements.txt
```

Create `pantheon-api/.env`:
```env
GROQ_API_KEY=gsk_...          # your Groq key (for local dev only)
SERPER_API_KEY=...             # serper.dev — free tier available
DATABASE_URL=postgresql://...  # Supabase connection string
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_KEY=...       # service_role key from Supabase settings
```

### 3. Frontend

```bash
cd pantheon-web
npm install
```

Create `pantheon-web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 4. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `pantheon-api/db/schema.sql` in the SQL Editor
3. Run this additional fix to drop the users FK (Supabase auth lives in `auth.users`, not `public.users`):
```sql
ALTER TABLE teardowns DROP CONSTRAINT IF EXISTS teardowns_user_id_fkey;
CREATE POLICY "Service role can insert teardowns" ON teardowns FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update teardowns" ON teardowns FOR UPDATE USING (true);
CREATE POLICY "Service role can insert agent outputs" ON agent_outputs FOR INSERT WITH CHECK (true);
```

### 5. Get API keys

| Key | Where |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — free |
| `SERPER_API_KEY` | [serper.dev](https://serper.dev) — 2,500 free searches/month |
| Supabase keys | Your Supabase project → Settings → API |

### 6. Run

```bash
# Terminal 1
cd pantheon-api && uvicorn main:app --reload

# Terminal 2
cd pantheon-web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with magic link, add your Groq key in Settings, then run a teardown.

---

## Deploy

**Backend → Railway**
1. Connect GitHub repo to Railway
2. Set root directory to `pantheon-api`
3. Add all env vars from the backend `.env` above
4. Railway auto-detects the `Dockerfile`

**Frontend → Vercel**
1. Import repo on Vercel
2. Set root directory to `pantheon-web`
3. Add all env vars from `.env.local` above
4. Set `NEXT_PUBLIC_API_URL` to your Railway domain (`https://...`)
5. Set `NEXT_PUBLIC_WS_URL` to your Railway domain (`wss://...`)

---

## Project structure

```
pantheon/
├── pantheon-api/
│   ├── api/routes/        # REST + WebSocket endpoints
│   ├── config/            # Model config, settings
│   ├── core/              # Orchestrator, parsers, contradiction checker
│   ├── db/                # Schema, connection pool, Pydantic models
│   ├── prompts/           # System prompts for all 7 agents
│   ├── tools/             # Serper web search
│   ├── utils/             # Slug generator
│   └── main.py
└── pantheon-web/
    ├── app/               # Pages: /, /teardown/[slug], /dashboard, /auth, /settings
    ├── components/        # AgentCard, VerdictBanner, IdeaInput, etc.
    └── lib/               # Types, API client, WebSocket hook, utils
```

---

## Note on API keys

Users bring their own free Groq API key (Settings page). Groq's free tier gives 14,400 requests/day — plenty for personal use. The key is stored in Supabase Auth user metadata and sent with each request; it is never persisted to the database.
