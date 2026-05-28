from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings
from db.database import get_pool, close_pool
from api.routes.teardowns import router as teardowns_router, ws_router
from api.routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await get_pool()
    except Exception as e:
        import logging
        logging.warning(f"DB pool init failed (will retry on first request): {e}")
    yield
    await close_pool()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="The Pantheon API",
        description="Startup idea validator powered by 7 GLM agents",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(teardowns_router)
    app.include_router(ws_router)
    app.include_router(users_router)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
