from __future__ import annotations

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    environment: Literal["development", "production"] = "development"

    # Supabase (EU Frankfurt)
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # LLM Proxy (OpenAI-compatible)
    llm_proxy_url: str = "https://llm-proxy.edgez.live/"
    llm_proxy_key: str

    # Model config — use fast model for extraction, can override per-call
    llm_model: str = "gemini-2.5-flash"          # main extraction model
    llm_model_ocr: str = "gemini-2.5-flash"       # vision OCR model

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Resend
    resend_api_key: str = ""

    # App
    frontend_url: AnyHttpUrl = "http://localhost:3000"  # type: ignore[assignment]

    # Subscription plan limits (units per tier)
    plan_limits: dict[str, int] = {
        "free": 1,
        "solo": 3,
        "pro": 10,
        "portfolio": 999_999,
    }

    @property
    def openai_base_url(self) -> str:
        return self.llm_proxy_url.rstrip("/")


settings = Settings()  # type: ignore[call-arg]
