from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # Qdrant
    QDRANT_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OpenAI / DeepSeek
    OPENAI_API_KEY: str
    LLM_BASE_URL: str = "https://api.deepseek.com"
    LLM_MODEL: str = "deepseek-chat"
    EMBEDDING_BASE_URL: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8002/api/v1/auth/google/callback"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Server
    PORT: int = 8002
    CORS_ORIGINS: str = "http://localhost:3000"

    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
