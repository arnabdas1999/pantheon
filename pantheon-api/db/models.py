from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class AgentOutput(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teardown_id: str
    agent_name: str
    model_used: str
    output_text: str
    confidence_score: Optional[int] = None
    passed_eval: Optional[bool] = None
    retry_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Teardown(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    share_slug: str
    idea_raw: str
    structured_brief: Optional[str] = None
    critical_question: Optional[str] = None
    overall_verdict: Optional[str] = None
    verdict_reasoning: Optional[str] = None
    critical_insight: Optional[str] = None
    themis_confidence: Optional[int] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = True
    agent_outputs: list[AgentOutput] = []


class TeardownCreate(BaseModel):
    idea: str = Field(..., min_length=10, max_length=2000)
    user_id: Optional[str] = None
    groq_api_key: Optional[str] = None


class TeardownSummary(BaseModel):
    id: str
    share_slug: str
    idea_raw: str
    overall_verdict: Optional[str]
    themis_confidence: Optional[int]
    status: str
    created_at: datetime
