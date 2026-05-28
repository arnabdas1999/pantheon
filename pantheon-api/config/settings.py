from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    zhipuai_api_key: str = ""
    groq_api_key: str = ""
    serper_api_key: str
    supabase_url: str
    supabase_service_key: str
    database_url: str
    redis_url: str = "redis://localhost:6379"
    sentry_dsn: str = ""
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
