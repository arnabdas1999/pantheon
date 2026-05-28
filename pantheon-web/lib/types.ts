// Agent names
export type AgentName = "kronos" | "market" | "technical" | "gtm" | "financial" | "risk" | "themis";

// WebSocket message statuses
export type AgentStatus =
  | "thinking"
  | "searching"
  | "streaming"
  | "stream_reset"
  | "reflexion"
  | "done"
  | "retry"
  | "error";

export type SystemMessageType =
  | "grounding"
  | "contradiction"
  | "themis"
  | "verdict"
  | "done"
  | "error";

// Individual WebSocket messages
export interface AgentMessage {
  agent: AgentName;
  status: AgentStatus;
  content?: string;
  confidence?: number;
}

export interface SystemMessage {
  type: SystemMessageType;
  status?: string;
  content?: string;
  verdict?: Verdict;
  confidence?: number;
  reasoning?: string;
  share_slug?: string;
}

export type WsMessage = AgentMessage | SystemMessage;

// Verdict types
export type Verdict = "BUILD IT" | "VALIDATE FIRST" | "AVOID";

// Live agent state built from WebSocket stream
export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  content: string;       // accumulated streaming text
  confidence: number | null;
  retryCount: number;
}

// Final teardown from REST API
export interface AgentOutput {
  id: string;
  teardown_id: string;
  agent_name: AgentName;
  model_used: string;
  output_text: string;
  confidence_score: number | null;
  passed_eval: boolean | null;
  retry_count: number;
  created_at: string;
}

export interface Teardown {
  id: string;
  share_slug: string;
  idea_raw: string;
  structured_brief: string | null;
  critical_question: string | null;
  overall_verdict: Verdict | null;
  verdict_reasoning: string | null;
  critical_insight: string | null;
  devils_advocate?: string | null;
  themis_confidence: number | null;
  status: "pending" | "completed" | "failed";
  is_public: boolean;
  created_at: string;
  agent_outputs: AgentOutput[];
}

export interface TeardownSummary {
  id: string;
  share_slug: string;
  idea_raw: string;
  overall_verdict: Verdict | null;
  themis_confidence: number | null;
  status: string;
  created_at: string;
}

// API response when creating a teardown
export interface CreateTeardownResponse {
  teardown_id: string;
  share_slug: string;
  websocket_url: string;
}

// The streaming state object managed by useTeardownStream
export interface TeardownStreamState {
  agents: Record<AgentName, AgentState>;
  contradictions: string[];
  verdict: Verdict | null;
  verdictConfidence: number | null;
  verdictReasoning: string | null;
  devilsAdvocate: string;
  shareSlug: string | null;
  isDone: boolean;
  error: string | null;
  themisStatus: string | null;
}

export const WORKER_AGENTS: AgentName[] = ["market", "technical", "gtm", "financial", "risk"];

export const AGENT_LABELS: Record<AgentName, string> = {
  kronos: "Kronos",
  market: "Market",
  technical: "Technical",
  gtm: "GTM",
  financial: "Financial",
  risk: "Risk",
  themis: "Themis",
};

export const AGENT_MODELS: Record<AgentName, string> = {
  kronos: "Llama-3.3-70B",
  market: "Llama-3.3-70B",
  technical: "Llama-3.3-70B",
  gtm: "Llama-3.3-70B",
  financial: "Llama-3.3-70B",
  risk: "Llama-3.3-70B",
  themis: "Llama-3.3-70B",
};

export const AGENT_ROLES: Record<AgentName, string> = {
  kronos: "Orchestrator",
  market: "Market Analyst",
  technical: "Senior Engineer",
  gtm: "Growth Founder",
  financial: "VC Analyst",
  risk: "Professional Skeptic",
  themis: "Eval Judge",
};
