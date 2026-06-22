from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Promo Navigator API"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "dev"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = (
        "postgresql+psycopg://admin:admin@localhost:5432/promo_constructor"
    )
    SECRET_KEY: str = "123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7200
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 7200
    ACCESS_COOKIE_NAME: str = "pc_access_token"
    REFRESH_COOKIE_NAME: str = "pc_refresh_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    API_ADMIN_PROTECTION_ENABLED: bool = True
    API_ADMIN_KEY: str = "123-456-789"
    FRONTEND_INTERNAL_API_KEY: str = "123-frontend-proxy-456"
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen3:1.7b"
    OLLAMA_CONNECT_TIMEOUT_SECONDS: float = 3.0
    OLLAMA_READ_TIMEOUT_SECONDS: float = 120.0
    OLLAMA_QUEUE_WAIT_TIMEOUT_SECONDS: float = 5.0
    OLLAMA_KEEP_ALIVE: str = "10m"
    OLLAMA_NUM_CTX: int = 1792
    OLLAMA_NUM_PREDICT: int = 112
    OLLAMA_TEMPERATURE: float = 0.0
    OLLAMA_SEED: int = 42
    OLLAMA_USER_MESSAGE_MAX_CHARS: int = 2600
    BACKEND_CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ]
    )

    @model_validator(mode="after")
    def validate_api_admin_protection(self) -> "Settings":
        if self.API_ADMIN_PROTECTION_ENABLED and not self.API_ADMIN_KEY:
            raise ValueError(
                "API_ADMIN_KEY must be configured when API_ADMIN_PROTECTION_ENABLED is true."
            )
        if self.API_ADMIN_PROTECTION_ENABLED and not self.FRONTEND_INTERNAL_API_KEY:
            raise ValueError(
                "FRONTEND_INTERNAL_API_KEY must be configured when API_ADMIN_PROTECTION_ENABLED is true."
            )
        if not self.OLLAMA_BASE_URL:
            raise ValueError("OLLAMA_BASE_URL must not be blank.")
        if not self.OLLAMA_MODEL:
            raise ValueError("OLLAMA_MODEL must not be blank.")
        if self.OLLAMA_CONNECT_TIMEOUT_SECONDS <= 0:
            raise ValueError("OLLAMA_CONNECT_TIMEOUT_SECONDS must be positive.")
        if self.OLLAMA_READ_TIMEOUT_SECONDS <= 0:
            raise ValueError("OLLAMA_READ_TIMEOUT_SECONDS must be positive.")
        if self.OLLAMA_QUEUE_WAIT_TIMEOUT_SECONDS <= 0:
            raise ValueError("OLLAMA_QUEUE_WAIT_TIMEOUT_SECONDS must be positive.")
        if self.OLLAMA_NUM_CTX < 512:
            raise ValueError("OLLAMA_NUM_CTX must be at least 512.")
        if self.OLLAMA_NUM_PREDICT < 32:
            raise ValueError("OLLAMA_NUM_PREDICT must be at least 32.")
        if self.OLLAMA_USER_MESSAGE_MAX_CHARS < 1000:
            raise ValueError("OLLAMA_USER_MESSAGE_MAX_CHARS must be at least 1000.")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
