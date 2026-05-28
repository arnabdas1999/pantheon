import json
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


def extract_search_queries(text: str) -> list[str]:
    """Extract <search>query</search> tags from an agent's output."""
    matches = re.findall(r"<search>(.*?)</search>", text, re.IGNORECASE | re.DOTALL)
    return [q.strip() for q in matches if q.strip()]


def _extract_json(text: str) -> Optional[dict]:
    """Extract the first JSON object from a text that may contain prose + JSON."""
    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown fences and try again
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Brace-counting: find the outermost { } block (handles arbitrary nesting)
    start = text.find("{")
    if start != -1:
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break

    logger.warning("_extract_json failed. Text tail (200 chars): %r", text[-200:])
    return None


def parse_kronos_brief(output: str) -> dict:
    """Parse Kronos output into a structured brief dict."""
    data = _extract_json(output)
    if not data:
        # Fallback: return raw text wrapped in a minimal struct
        return {
            "one_liner": "Idea brief (parse failed)",
            "problem": output[:500],
            "solution": "",
            "target_customer": "",
            "business_model": "",
            "critical_question": "",
            "context": "",
            "agent_relevance": {
                "market": 80, "technical": 80, "gtm": 80,
                "financial": 80, "risk": 80
            },
            "relevance_reasoning": "",
            "_raw": output,
        }

    # Ensure agent_relevance exists with defaults
    if "agent_relevance" not in data:
        data["agent_relevance"] = {
            "market": 80, "technical": 80, "gtm": 80,
            "financial": 80, "risk": 80
        }

    data["_raw"] = output
    return data


def parse_themis_scores(output: str) -> dict:
    """Parse Themis evaluation output into a scores dict."""
    data = _extract_json(output)
    if not data:
        return {
            "agent_scores": {
                agent: {"score": 70, "passed": True, "reason": "parse failed"}
                for agent in ["market", "technical", "gtm", "financial", "risk"]
            },
            "cross_domain_insight": "",
            "critical_question_answered": "",
            "overall_confidence": 70,
            "verdict": "VALIDATE FIRST",
            "verdict_reasoning": "Unable to parse Themis evaluation.",
            "top_risk": "",
            "top_opportunity": "",
            "_raw": output,
        }

    # Ensure passed flag is set correctly from score if missing
    for agent_name, agent_data in data.get("agent_scores", {}).items():
        if "passed" not in agent_data and "score" in agent_data:
            agent_data["passed"] = agent_data["score"] >= 65

    data["_raw"] = output
    return data


def extract_key_findings(agent_name: str, output: str) -> list[str]:
    """Extract the key_findings list from an agent's output JSON block."""
    data = _extract_json(output)
    if data and "key_findings" in data:
        return data["key_findings"][:3]
    # Fallback: extract first 3 lines that look like conclusions
    lines = [l.strip() for l in output.split("\n") if l.strip() and len(l.strip()) > 30]
    return lines[:3]


def extract_confidence(output: str) -> int:
    """Extract confidence score (0-100) from an agent's output JSON block."""
    data = _extract_json(output)
    if data and "confidence" in data:
        score = data["confidence"]
        if isinstance(score, (int, float)):
            return max(0, min(100, int(score)))
    # Fallback: look for "confidence: XX" pattern
    match = re.search(r'"confidence"\s*:\s*(\d+)', output)
    if match:
        return max(0, min(100, int(match.group(1))))
    return 70  # neutral default


def extract_agent_extras(agent_name: str, output: str) -> dict:
    """Extract agent-specific structured fields from output JSON."""
    data = _extract_json(output)
    if not data:
        return {}
    # Return everything except key_findings and confidence (already extracted)
    return {k: v for k, v in data.items() if k not in ("key_findings", "confidence")}


def format_brief_for_agents(brief: dict) -> str:
    """Convert a parsed Kronos brief into a clean text block for agent prompts."""
    lines = [
        f"## Startup Brief",
        f"**Idea**: {brief.get('one_liner', '')}",
        f"**Problem**: {brief.get('problem', '')}",
        f"**Solution**: {brief.get('solution', '')}",
        f"**Target Customer**: {brief.get('target_customer', '')}",
        f"**Business Model**: {brief.get('business_model', '')}",
        f"**Critical Question**: {brief.get('critical_question', '')}",
    ]
    if brief.get("context"):
        lines.append(f"**Context / Timing**: {brief['context']}")
    return "\n".join(lines)


def format_for_themis(agent_results: list[dict], contradictions: list[str]) -> str:
    """Build the input prompt body for Themis from all agent results."""
    sections = ["# Agent Analyses for Evaluation\n"]

    for result in agent_results:
        agent = result["agent"]
        confidence = result.get("confidence", 70)
        output = result.get("output", "")
        sections.append(
            f"## {agent.upper()} AGENT (self-reported confidence: {confidence})\n{output}\n"
        )

    if contradictions:
        sections.append("## CROSS-AGENT CONTRADICTIONS FLAGGED")
        for c in contradictions:
            sections.append(f"- {c}")
        sections.append("")

    sections.append(
        "## YOUR TASK\n"
        "Evaluate each agent output above. Score them, identify the cross-domain insight, "
        "and deliver the final verdict. Output ONLY the JSON as specified in your system prompt."
    )

    return "\n".join(sections)


def apply_confidence_weights(agent_results: list[dict], themis_input: str) -> str:
    """Prepend a confidence weight summary to the Themis input."""
    weights = []
    for r in agent_results:
        name = r["agent"]
        conf = r.get("confidence", 70)
        weight = "HIGH" if conf >= 80 else "MEDIUM" if conf >= 60 else "LOW"
        weights.append(f"- {name}: confidence {conf} → weight {weight}")

    weight_block = (
        "## Confidence Weights (higher confidence = more weight in verdict)\n"
        + "\n".join(weights)
        + "\n\n"
    )
    return weight_block + themis_input
