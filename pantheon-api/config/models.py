import litellm
import os

# Groq is natively supported by litellm — no custom api_base needed
AGENT_MODELS = {
    "kronos":    "groq/llama-3.3-70b-versatile",
    "market":    "groq/llama-3.3-70b-versatile",
    "technical": "groq/llama-3.3-70b-versatile",
    "gtm":       "groq/llama-3.3-70b-versatile",
    "financial": "groq/llama-3.3-70b-versatile",
    "risk":      "groq/llama-3.3-70b-versatile",
    "themis":    "groq/llama-3.3-70b-versatile",
}

AGENT_TIMEOUT = 60

litellm.set_verbose = False
litellm.suppress_debug_info = True


def configure_litellm(api_key: str):
    os.environ["GROQ_API_KEY"] = api_key
