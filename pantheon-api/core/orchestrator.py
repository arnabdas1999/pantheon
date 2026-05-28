import asyncio
import json
import logging
import re
from typing import Callable, Optional, Awaitable

import litellm

logger = logging.getLogger(__name__)

from config.models import AGENT_MODELS, AGENT_TIMEOUT
from config.settings import get_settings
from prompts import AGENT_PROMPTS
from prompts.themis import THEMIS_DEVILS_ADVOCATE_PROMPT
from tools.search import web_search, format_search_results
from core.parsers import (
    parse_kronos_brief,
    parse_themis_scores,
    extract_key_findings,
    extract_confidence,
    extract_search_queries,
    format_brief_for_agents,
    format_for_themis,
    apply_confidence_weights,
)
from core.contradiction import check_contradictions

WsCallback = Optional[Callable[[dict], Awaitable[None]]]


def _rate_limit_wait(error: Exception) -> float:
    """Parse the actual retry-after seconds from a Groq rate limit error."""
    match = re.search(r"try again in (\d+\.?\d*)s", str(error), re.IGNORECASE)
    if match:
        return float(match.group(1)) + 1.0
    return 20.0

# Each agent may search up to this many times before writing
MAX_SEARCH_ITERATIONS = 3
# Max queries acted on per search round (keeps latency bounded)
MAX_SEARCHES_PER_ROUND = 2

# Phase 1 agents run first; Phase 2 agents receive their findings
PHASE_1_AGENTS = ["market", "technical"]
PHASE_2_AGENTS = ["gtm", "financial", "risk"]


async def _emit(ws_callback: WsCallback, msg: dict):
    if ws_callback:
        await ws_callback(msg)


# ── LLM callers ──────────────────────────────────────────────────────────────

async def _call(agent_name: str, messages: list[dict], api_key: Optional[str] = None) -> str:
    """Non-streaming completion with retry on rate limit."""
    for attempt in range(4):
        try:
            response = await litellm.acompletion(
                model=AGENT_MODELS[agent_name],
                messages=messages,
                stream=False,
                timeout=AGENT_TIMEOUT,
                api_key=api_key,
            )
            return response.choices[0].message.content or ""
        except litellm.RateLimitError as e:
            wait = _rate_limit_wait(e)
            logger.warning("[%s] rate limited, retrying in %.1fs", agent_name, wait)
            await asyncio.sleep(wait)
        except Exception as e:
            logger.error("[%s] _call failed: %s", agent_name, e)
            return ""
    return ""


async def _stream(
    agent_name: str,
    messages: list[dict],
    ws_callback: WsCallback,
    api_key: Optional[str] = None,
) -> str:
    """
    Streaming completion for the final write phase.
    The final-write prompt explicitly forbids <search> tags, so none should
    appear in the stream. As a safety net we strip any that slip through
    before emitting each delta.
    """
    full_output = ""
    for attempt in range(4):
        try:
            response = await litellm.acompletion(
                model=AGENT_MODELS[agent_name],
                messages=messages,
                stream=True,
                timeout=AGENT_TIMEOUT,
                api_key=api_key,
            )
            async for chunk in response:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_output += delta
                    clean_delta = re.sub(
                        r"<search>.*?</search>", "", delta,
                        flags=re.IGNORECASE | re.DOTALL
                    )
                    if clean_delta:
                        await _emit(ws_callback, {
                            "agent": agent_name,
                            "status": "streaming",
                            "content": clean_delta,
                        })
            return full_output
        except litellm.RateLimitError as e:
            wait = _rate_limit_wait(e)
            logger.warning("[%s] stream rate limited, retrying in %.1fs", agent_name, wait)
            full_output = ""
            await _emit(ws_callback, {"agent": agent_name, "status": "stream_reset"})
            await asyncio.sleep(wait)
        except Exception as e:
            await _emit(ws_callback, {
                "agent": agent_name, "status": "error", "content": str(e)
            })
            return full_output
    return full_output


async def _stream_themis(messages: list[dict], ws_callback: WsCallback, api_key: Optional[str] = None) -> str:
    """Streaming completion for Themis devil's advocate pass."""
    full_output = ""
    try:
        response = await litellm.acompletion(
            model=AGENT_MODELS["themis"],
            messages=messages,
            stream=True,
            timeout=AGENT_TIMEOUT,
            api_key=api_key,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                full_output += delta
                await _emit(ws_callback, {
                    "type": "themis",
                    "status": "devils_advocate",
                    "content": delta,
                })
    except Exception:
        pass
    return full_output


# ── Prompt helpers ────────────────────────────────────────────────────────────

def _build_initial_user_msg(agent_name: str, brief: dict, shared_context: dict) -> str:
    """
    First user turn for a worker agent:
    - Structured brief from Kronos
    - Reminder that search is available
    - Findings from Phase 1 agents (if Phase 2 agent and Phase 1 has completed)
    """
    parts = [format_brief_for_agents(brief)]
    parts.append(
        "Search the web for any data you need before writing your analysis. "
        "Use <search>your query</search> to trigger a search."
    )
    available = {k: v for k, v in shared_context.items() if k != agent_name and v}
    if available:
        lines = ["\n## Findings from Earlier Agents (use these to inform your analysis)"]
        for other, findings in available.items():
            if findings:
                findings_text = "\n".join(f"  - {f}" for f in findings[:3])
                lines.append(f"**{other.capitalize()}**:\n{findings_text}")
        parts.append("\n".join(lines))
    return "\n\n".join(parts)


_FINAL_WRITE_PROMPT = (
    "You have completed your research. "
    "Now write your final complete analysis following the structure in your instructions. "
    "As you write each section, verify that every claim is grounded in your research — "
    "if something lacks evidence, either note the gap explicitly or remove the claim. "
    "Do NOT include any <search> tags. "
    "End with the JSON block exactly as specified."
)


# ── ReAct loop ────────────────────────────────────────────────────────────────

async def run_agent_react_loop(
    agent_name: str,
    brief: dict,
    shared_context: dict,
    ws_callback: WsCallback,
    retry_count: int = 0,
    api_key: Optional[str] = None,
) -> dict:
    """
    Worker agent execution with a bounded ReAct loop:

    Research phase (non-streaming, hidden from user):
      for up to MAX_SEARCH_ITERATIONS rounds:
        - agent reasons about what it needs
        - if <search> tags found: execute searches, append results, repeat
        - if no <search> tags: research complete, exit loop

    Write phase (streaming, visible to user):
      - single streaming call with explicit "write final analysis" prompt
      - prompt includes inline reflexion instruction (merged Fix 3)
      - search tags filtered from stream as safety net (Fix 1)

    Context sharing (Fix 2):
      - shared_context is populated as agents complete
      - Phase 2 agents receive Phase 1 findings via _build_initial_user_msg
    """
    await _emit(ws_callback, {"agent": agent_name, "status": "thinking"})

    messages: list[dict] = [
        {"role": "system", "content": AGENT_PROMPTS[agent_name]},
        {"role": "user",   "content": _build_initial_user_msg(agent_name, brief, shared_context)},
    ]

    search_count = 0
    last_research_response = ""

    # ── Research phase (non-streaming) ──────────────────────────────────────
    for _ in range(MAX_SEARCH_ITERATIONS):
        research_response = await _call(agent_name, messages, api_key)
        last_research_response = research_response

        queries = extract_search_queries(research_response)
        if not queries:
            # Agent has enough data — exit research phase
            break

        # Emit searching status for all queries, then execute in parallel
        bounded_queries = queries[:MAX_SEARCHES_PER_ROUND]
        for query in bounded_queries:
            await _emit(ws_callback, {
                "agent": agent_name,
                "status": "searching",
                "content": query,
            })

        async def _do_search(query: str) -> str:
            try:
                results = await web_search(query, num_results=5)
                return format_search_results(results)
            except Exception:
                return f'Search("{query}"): request failed — proceed with available knowledge.'

        search_parts: list[str] = await asyncio.gather(
            *[_do_search(q) for q in bounded_queries]
        )

        search_count += len(queries[:MAX_SEARCHES_PER_ROUND])

        messages.append({"role": "assistant", "content": research_response})
        messages.append({
            "role": "user",
            "content": (
                "## Search Results\n\n"
                + "\n\n---\n\n".join(search_parts)
                + "\n\nContinue your research, or if you have enough data, "
                  "write your final analysis."
            ),
        })

    # ── Write phase (streaming) — reflexion merged into prompt ───────────────
    # Append the last research turn so the model has full context
    if last_research_response:
        messages.append({"role": "assistant", "content": last_research_response})
    messages.append({"role": "user", "content": _FINAL_WRITE_PROMPT})

    final_output = await _stream(agent_name, messages, ws_callback, api_key)
    # Fallback: if streaming call returned nothing, use last research response
    if not final_output.strip():
        final_output = last_research_response

    # Strip any accidental search tags from stored output
    final_output_clean = re.sub(
        r"<search>.*?</search>", "", final_output,
        flags=re.IGNORECASE | re.DOTALL
    ).strip()

    confidence = extract_confidence(final_output_clean)
    key_findings = extract_key_findings(agent_name, final_output_clean)
    shared_context[agent_name] = key_findings

    await _emit(ws_callback, {
        "agent": agent_name,
        "status": "done",
        "confidence": confidence,
    })

    return {
        "agent": agent_name,
        "output": final_output_clean,
        "confidence": confidence,
        "key_findings": key_findings,
        "retry_count": retry_count,
    }


# ── Themis ────────────────────────────────────────────────────────────────────

async def run_themis(
    agent_results: list[dict],
    contradictions: list[str],
    brief: dict,
    ws_callback: WsCallback,
    api_key: Optional[str] = None,
) -> tuple[dict, list[dict]]:
    """
    Confidence-weighted Themis evaluation:
    1. Score all 5 agents
    2. Retry agents that score < 65
    3. Devil's advocate streaming pass
    """
    await _emit(ws_callback, {"type": "themis", "status": "evaluating"})

    themis_input = format_for_themis(agent_results, contradictions)
    weighted_input = apply_confidence_weights(agent_results, themis_input)

    themis_raw = await _call("themis", [
        {"role": "system", "content": AGENT_PROMPTS["themis"]},
        {"role": "user",   "content": weighted_input},
    ], api_key)
    scores = parse_themis_scores(themis_raw)

    # Retry failing agents
    failed_agents = [
        name for name, data in scores.get("agent_scores", {}).items()
        if not data.get("passed", True)
    ]
    if failed_agents:
        shared_context = {r["agent"]: r.get("key_findings", []) for r in agent_results}
        for name in failed_agents:
            await _emit(ws_callback, {"agent": name, "status": "retry"})

        retry_tasks = []
        for name in failed_agents:
            orig_count = next(
                (r.get("retry_count", 0) for r in agent_results if r["agent"] == name), 0
            )
            retry_tasks.append(
                run_agent_react_loop(name, brief, shared_context, ws_callback, orig_count + 1, api_key)
            )
        retry_results = await asyncio.gather(*retry_tasks)
        retry_by_name = {r["agent"]: r for r in retry_results}
        agent_results = [retry_by_name.get(r["agent"], r) for r in agent_results]

        # Re-evaluate with updated outputs
        await _emit(ws_callback, {"type": "themis", "status": "evaluating"})
        themis_input = format_for_themis(agent_results, contradictions)
        weighted_input = apply_confidence_weights(agent_results, themis_input)
        themis_raw = await _call("themis", [
            {"role": "system", "content": AGENT_PROMPTS["themis"]},
            {"role": "user",   "content": weighted_input},
        ], api_key)
        scores = parse_themis_scores(themis_raw)

    # Devil's advocate — streaming
    verdict = scores.get("verdict", "VALIDATE FIRST")
    await _emit(ws_callback, {"type": "themis", "status": "devils_advocate"})
    da_output = await _stream_themis(
        messages=[
            {"role": "system", "content": AGENT_PROMPTS["themis"]},
            {"role": "user",   "content": THEMIS_DEVILS_ADVOCATE_PROMPT.format(verdict=verdict)},
        ],
        ws_callback=ws_callback,
        api_key=api_key,
    )
    scores["devils_advocate"] = da_output

    return scores, agent_results


# ── Main pipeline ─────────────────────────────────────────────────────────────

async def run_pantheon(
    idea: str,
    teardown_id: Optional[str] = None,
    ws_callback: WsCallback = None,
    api_key: Optional[str] = None,
) -> dict:
    """
    Full Pantheon pipeline.
    api_key: user-supplied Groq API key; falls back to GROQ_API_KEY env var if None.
    """
    settings = get_settings()
    effective_key = api_key or settings.groq_api_key or None

    # ── 1. Kronos — single-shot brief structuring ────────────────────────────
    await _emit(ws_callback, {"agent": "kronos", "status": "thinking"})
    kronos_raw = await _stream(
        "kronos",
        messages=[
            {"role": "system", "content": AGENT_PROMPTS["kronos"]},
            {"role": "user",   "content": idea},
        ],
        ws_callback=ws_callback,
        api_key=effective_key,
    )
    brief = parse_kronos_brief(kronos_raw)
    await _emit(ws_callback, {
        "agent": "kronos",
        "status": "done",
        "content": brief.get("one_liner", ""),
    })

    shared_context: dict = {}

    # ── 2a. Phase 1 — foundational agents (parallel) ─────────────────────────
    phase1_results = await asyncio.gather(*[
        run_agent_react_loop(name, brief, shared_context, ws_callback, api_key=effective_key)
        for name in PHASE_1_AGENTS
    ])
    # shared_context now contains market + technical key findings

    # ── 2b. Phase 2 — contextual agents (parallel, with Phase 1 findings) ────
    phase2_results = await asyncio.gather(*[
        run_agent_react_loop(name, brief, shared_context, ws_callback, api_key=effective_key)
        for name in PHASE_2_AGENTS
    ])

    agent_results = list(phase1_results) + list(phase2_results)

    # ── 3. Cross-agent contradiction check ───────────────────────────────────
    contradictions = await check_contradictions(agent_results, ws_callback, api_key=effective_key)

    # ── 4. Themis — confidence-weighted eval + retry + devil's advocate ───────
    themis_scores, agent_results = await run_themis(
        agent_results, contradictions, brief, ws_callback, api_key=effective_key
    )

    teardown = {
        "teardown_id": teardown_id,
        "idea_raw": idea,
        "structured_brief": json.dumps(brief),
        "critical_question": brief.get("critical_question", ""),
        "overall_verdict": themis_scores.get("verdict", "VALIDATE FIRST"),
        "verdict_reasoning": themis_scores.get("verdict_reasoning", ""),
        "critical_insight": themis_scores.get("cross_domain_insight", ""),
        "devils_advocate": themis_scores.get("devils_advocate", ""),
        "themis_confidence": themis_scores.get("overall_confidence", 70),
        "contradictions": contradictions,
        "agent_outputs": agent_results,
        "agent_scores": themis_scores.get("agent_scores", {}),
    }

    await _emit(ws_callback, {
        "type": "verdict",
        "verdict": teardown["overall_verdict"],
        "confidence": teardown["themis_confidence"],
        "reasoning": teardown["verdict_reasoning"],
    })

    return teardown
