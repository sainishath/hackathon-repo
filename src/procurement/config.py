import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root resolution
# config.py is at: <repo_root>/src/procurement/config.py
CURRENT_FILE = Path(__file__).resolve()
SRC_DIR = CURRENT_FILE.parent.parent
REPO_ROOT = SRC_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    repo_root: Path = REPO_ROOT
    data_dir: Path = REPO_ROOT / "data"
    raw_dir: Path = REPO_ROOT / "data" / "raw"
    processed_dir: Path = REPO_ROOT / "data" / "processed"
    rules_path: Path = REPO_ROOT / "data" / "rules" / "rules.yaml"
    forms_dir: Path = REPO_ROOT / "data" / "forms"
    eval_dir: Path = REPO_ROOT / "data" / "eval"
    fixtures_dir: Path = REPO_ROOT / "data" / "fixtures"

    clauses_file: Path = REPO_ROOT / "data" / "processed" / "clauses.jsonl"
    bm25_index_file: Path = REPO_ROOT / "data" / "processed" / "bm25.pkl"
    dense_index_file: Path = REPO_ROOT / "data" / "processed" / "dense.npz"

    # LLM Settings: 'mock' | 'gemini' | 'ollama'
    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3")

    # Dense embeddings configuration
    dense_model_name: str = os.getenv("DENSE_MODEL_NAME", "BAAI/bge-small-en-v1.5")
    offline_embeddings: bool = os.getenv("OFFLINE_EMBEDDINGS", "true").lower() in (
        "1",
        "true",
        "yes",
    )


settings = Settings()
