from fastapi import APIRouter, Header, HTTPException
from db.database import get_pool

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/teardowns")
async def get_user_teardowns(
    x_user_id: str = Header(..., alias="x-user-id"),
    limit: int = 20,
    offset: int = 0,
):
    """Return teardown history for an authenticated user (JWT user_id in header)."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, share_slug, idea_raw, overall_verdict,
                   themis_confidence, status, created_at
            FROM teardowns
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            x_user_id, limit, offset,
        )
    return [dict(r) for r in rows]
