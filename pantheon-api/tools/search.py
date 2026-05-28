import httpx
from config.settings import get_settings

SERPER_BASE = "https://google.serper.dev/search"


async def web_search(query: str, num_results: int = 5) -> dict:
    """Call Serper API and return structured results."""
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SERPER_BASE,
            headers={
                "X-API-KEY": settings.serper_api_key,
                "Content-Type": "application/json",
            },
            json={"q": query, "num": num_results},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("organic", [])[:num_results]:
        results.append(
            {
                "title": item.get("title"),
                "snippet": item.get("snippet"),
                "url": item.get("link"),
            }
        )

    knowledge_graph = data.get("knowledgeGraph", {})
    answer_box = data.get("answerBox", {})

    return {
        "query": query,
        "results": results,
        "knowledge_graph": knowledge_graph if knowledge_graph else None,
        "answer_box": answer_box if answer_box else None,
    }


def format_search_results(search_data: dict) -> str:
    """Format Serper results into readable text for LLM context."""
    lines = [f"Search: \"{search_data['query']}\""]

    if search_data.get("answer_box"):
        ab = search_data["answer_box"]
        answer_text = ab.get("answer") or ab.get("snippet", "")
        if answer_text:
            lines.append(f"Answer: {answer_text}")

    if search_data.get("knowledge_graph"):
        kg = search_data["knowledge_graph"]
        kg_desc = kg.get("description", "")
        if kg_desc:
            lines.append(f"Knowledge Graph: {kg_desc}")

    for i, r in enumerate(search_data.get("results", []), 1):
        title = r.get("title", "No title")
        snippet = r.get("snippet", "No description available.")
        url = r.get("url", "")
        lines.append(f"{i}. {title}\n   {snippet}\n   Source: {url}")

    return "\n".join(lines)
