import asyncio
import json
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from db.database import get_pool
from db.models import TeardownCreate, TeardownSummary
from core.orchestrator import run_pantheon
from utils.slug import generate_slug

router = APIRouter(prefix="/api/teardowns", tags=["teardowns"])

# In-memory store: teardown_id → user's Groq API key
# Populated by POST, consumed (popped) when the WebSocket connects and starts the pipeline.
_pending_api_keys: dict[str, str] = {}


async def _save_teardown(pool, teardown_id: str, slug: str, idea: str, result: dict):
    """Persist a completed teardown and its agent outputs to PostgreSQL."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO teardowns (
                id, share_slug, idea_raw, structured_brief,
                critical_question, overall_verdict, verdict_reasoning,
                critical_insight, themis_confidence, status, is_public
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'completed',true)
            ON CONFLICT (id) DO UPDATE SET
                overall_verdict = EXCLUDED.overall_verdict,
                verdict_reasoning = EXCLUDED.verdict_reasoning,
                critical_insight = EXCLUDED.critical_insight,
                themis_confidence = EXCLUDED.themis_confidence,
                status = 'completed'
            """,
            teardown_id,
            slug,
            idea,
            result.get("structured_brief", ""),
            result.get("critical_question", ""),
            result.get("overall_verdict", "VALIDATE FIRST"),
            result.get("verdict_reasoning", ""),
            result.get("critical_insight", ""),
            result.get("themis_confidence", 70),
        )

        for agent_out in result.get("agent_outputs", []):
            agent_scores = result.get("agent_scores", {})
            score_data = agent_scores.get(agent_out["agent"], {})
            await conn.execute(
                """
                INSERT INTO agent_outputs (
                    id, teardown_id, agent_name, model_used,
                    output_text, confidence_score, passed_eval, retry_count
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                """,
                str(uuid.uuid4()),
                teardown_id,
                agent_out["agent"],
                "",
                agent_out.get("output", ""),
                agent_out.get("confidence", 70),
                score_data.get("passed", True),
                agent_out.get("retry_count", 0),
            )


@router.post("")
async def create_teardown(body: TeardownCreate):
    """Create a teardown and return the teardown_id + share_slug + websocket URL."""
    teardown_id = str(uuid.uuid4())
    slug = generate_slug(8)

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO teardowns (id, share_slug, idea_raw, user_id, status, is_public)
            VALUES ($1, $2, $3, $4, 'pending', true)
            """,
            teardown_id, slug, body.idea, body.user_id,
        )

    # Stash the user's API key until the WebSocket connects and starts the pipeline
    if body.groq_api_key:
        _pending_api_keys[teardown_id] = body.groq_api_key

    return {
        "teardown_id": teardown_id,
        "share_slug": slug,
        "websocket_url": f"/ws/teardowns/{teardown_id}",
    }


@router.get("/{slug}")
async def get_teardown(slug: str):
    """Fetch a completed teardown by share slug."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM teardowns WHERE share_slug = $1", slug
        )
        if not row:
            raise HTTPException(status_code=404, detail="Teardown not found")

        agent_rows = await conn.fetch(
            "SELECT * FROM agent_outputs WHERE teardown_id = $1 ORDER BY created_at",
            row["id"],
        )

    teardown = dict(row)
    teardown["agent_outputs"] = [dict(r) for r in agent_rows]
    return teardown


@router.get("")
async def list_teardowns(limit: int = 20, offset: int = 0):
    """List recent public teardowns (no auth required for public feed)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, share_slug, idea_raw, overall_verdict,
                   themis_confidence, status, created_at
            FROM teardowns
            WHERE is_public = true AND status = 'completed'
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            """,
            limit, offset,
        )
    return [dict(r) for r in rows]


# ── WebSocket endpoint ──────────────────────────────────────────────────────

class _ConnectionManager:
    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, teardown_id: str, ws: WebSocket):
        await ws.accept()
        self._connections[teardown_id] = ws

    def disconnect(self, teardown_id: str):
        self._connections.pop(teardown_id, None)

    async def send(self, teardown_id: str, msg: dict):
        ws = self._connections.get(teardown_id)
        if ws:
            try:
                await ws.send_text(json.dumps(msg, default=str))
                if msg.get("type") == "done":
                    await ws.close(code=1000)
                    self.disconnect(teardown_id)
            except Exception:
                self.disconnect(teardown_id)


manager = _ConnectionManager()


async def _run_and_save(teardown_id: str, slug: str, idea: str, api_key: Optional[str] = None):
    """Background task: run pipeline and persist result."""
    pool = await get_pool()

    async def ws_callback(msg: dict):
        await manager.send(teardown_id, msg)

    try:
        result = await run_pantheon(idea, teardown_id=teardown_id, ws_callback=ws_callback, api_key=api_key)
        await _save_teardown(pool, teardown_id, slug, idea, result)
        await manager.send(teardown_id, {"type": "done", "share_slug": slug})
    except Exception as e:
        await manager.send(teardown_id, {"type": "error", "content": str(e)})
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE teardowns SET status = 'failed' WHERE id = $1", teardown_id
            )


from fastapi import APIRouter as _AR  # noqa — re-import to register ws separately

ws_router = APIRouter(tags=["websocket"])


@ws_router.websocket("/ws/teardowns/{teardown_id}")
async def teardown_websocket(websocket: WebSocket, teardown_id: str):
    await manager.connect(teardown_id, websocket)

    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT idea_raw, share_slug, status FROM teardowns WHERE id = $1",
            teardown_id,
        )

    if not row:
        await websocket.send_text(json.dumps({"type": "error", "content": "Teardown not found"}))
        await websocket.close()
        return

    if row["status"] != "pending":
        await websocket.send_text(json.dumps({"type": "error", "content": "Already processed"}))
        await websocket.close()
        return

    # Retrieve and clear the user's API key that was stashed during POST
    api_key = _pending_api_keys.pop(teardown_id, None)

    task = asyncio.create_task(
        _run_and_save(teardown_id, row["share_slug"], row["idea_raw"], api_key)
    )

    try:
        # Keep connection alive until client disconnects or pipeline finishes
        while not task.done():
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            except WebSocketDisconnect:
                break
    finally:
        manager.disconnect(teardown_id)
        if not task.done():
            task.cancel()
