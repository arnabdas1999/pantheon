import json
import re
from typing import Optional

import litellm
from config.models import AGENT_MODELS

CONTRADICTION_PROMPT = """You are a cross-domain consistency checker. You have received outputs from 5 startup analysis agents. Your ONLY job is to find factual or logical contradictions between their analyses.

Examples of contradictions to flag:
- Market agent says TAM is $50B, Financial agent assumes revenue ceiling of $100K/year (implies <0.001% share is the business case)
- Technical agent says MVP takes 2 weeks, GTM agent's plan assumes 6 months of development before launch
- Market agent identifies enterprise customers, GTM agent plans a self-serve product-led growth motion
- Financial agent models $10/month pricing, Market agent found the category standard is $500/month enterprise contracts

Examples of things that are NOT contradictions:
- Different agents using different estimates for the same number (that's uncertainty, not contradiction)
- One agent being more optimistic than another (that's perspective, not contradiction)

Output ONLY a JSON array of contradiction strings. If no contradictions exist, output an empty array [].
Each string should be one sentence: "Agent A says X, but Agent B says Y."

Example output:
["Market says TAM is $50B but Financial models only $500K ARR ceiling implying 0.001% market capture as the base case.", "Technical estimates 2-week MVP but GTM plan assumes a 4-month beta period before any user acquisition."]

Do NOT output prose. Output ONLY the JSON array.
"""


async def check_contradictions(
    agent_results: list[dict],
    ws_callback=None,
    api_key: Optional[str] = None,
) -> list[str]:
    """
    Run a lightweight cross-agent contradiction check.
    Returns a list of contradiction strings (may be empty).
    """
    summaries = []
    for result in agent_results:
        agent = result["agent"]
        output = result.get("output", "")
        summaries.append(f"### {agent.upper()} AGENT\n{output[:800]}")

    combined = "\n\n".join(summaries)
    user_msg = f"Check these 5 agent analyses for contradictions:\n\n{combined}"

    try:
        response = await litellm.acompletion(
            model=AGENT_MODELS["themis"],
            messages=[
                {"role": "system", "content": CONTRADICTION_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            stream=False,
            timeout=20,
            api_key=api_key,
        )
        raw = response.choices[0].message.content or "[]"
        raw = raw.strip()

        fence_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", raw, re.DOTALL)
        if fence_match:
            raw = fence_match.group(1)

        contradictions = json.loads(raw)
        if not isinstance(contradictions, list):
            contradictions = []

        if ws_callback and contradictions:
            for c in contradictions:
                await ws_callback({"type": "contradiction", "content": c})

        return [str(c) for c in contradictions]

    except Exception:
        return []
