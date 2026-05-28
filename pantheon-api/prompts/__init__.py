from prompts.kronos import KRONOS_PROMPT
from prompts.market import MARKET_PROMPT
from prompts.technical import TECHNICAL_PROMPT
from prompts.gtm import GTM_PROMPT
from prompts.financial import FINANCIAL_PROMPT
from prompts.risk import RISK_PROMPT
from prompts.themis import THEMIS_PROMPT, THEMIS_DEVILS_ADVOCATE_PROMPT

AGENT_PROMPTS = {
    "kronos":    KRONOS_PROMPT,
    "market":    MARKET_PROMPT,
    "technical": TECHNICAL_PROMPT,
    "gtm":       GTM_PROMPT,
    "financial": FINANCIAL_PROMPT,
    "risk":      RISK_PROMPT,
    "themis":    THEMIS_PROMPT,
}
