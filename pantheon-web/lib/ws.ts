"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentName,
  AgentState,
  TeardownStreamState,
  WsMessage,
  WORKER_AGENTS,
} from "@/lib/types";
import { WORKER_AGENTS as WORKERS } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

function makeInitialAgents(): Record<AgentName, AgentState> {
  const agents = {} as Record<AgentName, AgentState>;
  for (const name of WORKERS) {
    agents[name] = {
      name,
      status: "thinking",
      content: "",
      confidence: null,
      retryCount: 0,
    };
  }
  return agents;
}

function makeInitialState(): TeardownStreamState {
  return {
    agents: makeInitialAgents(),
    contradictions: [],
    verdict: null,
    verdictConfidence: null,
    verdictReasoning: null,
    devilsAdvocate: "",
    shareSlug: null,
    isDone: false,
    error: null,
    themisStatus: null,
  };
}

export function useTeardownStream(teardownId: string | null) {
  const [state, setState] = useState<TeardownStreamState>(makeInitialState);
  const wsRef = useRef<WebSocket | null>(null);
  const devilsAdvocateRef = useRef("");
  const isDoneRef = useRef(false); // ref so onerror sees it synchronously

  const connect = useCallback(() => {
    if (!teardownId || wsRef.current) return;

    const ws = new WebSocket(`${WS_URL}/ws/teardowns/${teardownId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      // Set synchronously here — setState updater may run after onclose fires
      if ("type" in msg && msg.type === "done") {
        isDoneRef.current = true;
      }

      setState((prev) => {
        const next = { ...prev };

        // Agent-specific message
        if ("agent" in msg && msg.agent !== "kronos" && msg.agent !== "themis") {
          const agentName = msg.agent as AgentName;
          const agent = { ...prev.agents[agentName] };

          if (msg.status === "streaming" && msg.content) {
            agent.content = agent.content + msg.content;
          } else if (msg.status === "retry") {
            agent.retryCount = agent.retryCount + 1;
            agent.content = "";
          } else if (msg.status === "stream_reset") {
            // Rate-limit retry — clear streamed content before re-streaming
            agent.content = "";
          } else if (msg.status === "done") {
            agent.confidence = msg.confidence ?? null;
          }
          agent.status = msg.status === "stream_reset" ? "streaming" : msg.status;
          next.agents = { ...prev.agents, [agentName]: agent };
          return next;
        }

        // System messages
        if ("type" in msg) {
          switch (msg.type) {
            case "contradiction":
              next.contradictions = [...prev.contradictions, msg.content ?? ""];
              break;
            case "themis":
              next.themisStatus = msg.status ?? null;
              if (msg.status === "devils_advocate" && msg.content) {
                devilsAdvocateRef.current += msg.content;
                next.devilsAdvocate = devilsAdvocateRef.current;
              }
              break;
            case "verdict":
              next.verdict = msg.verdict ?? null;
              next.verdictConfidence = msg.confidence ?? null;
              next.verdictReasoning = msg.reasoning ?? null;
              break;
            case "done":
              next.shareSlug = msg.share_slug ?? null;
              next.isDone = true;
              break;
            case "error":
              next.error = msg.content ?? "Unknown error";
              break;
          }
        }

        return next;
      });
    };

    ws.onerror = () => {
      // Intentionally empty — onerror fires on transient issues and is always
      // followed by onclose. We handle user-visible errors in onclose only.
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      // Show error only if the connection closed abnormally before completion
      if (!isDoneRef.current && event.code !== 1000) {
        setState((prev) => ({ ...prev, error: "Connection lost — results may be incomplete." }));
      }
    };
  }, [teardownId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return state;
}
