from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    environment: Literal["development", "production"] = "development"

    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # AI
    anthropic_api_key: str
    mistral_api_key: str

    # Stripe
    stripe_secret_key: str
    stripe_webhook_secret: str

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


settings = Settings()  # type: ignore[call-arg]
