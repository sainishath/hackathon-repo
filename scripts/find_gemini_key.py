import os
import re
from pathlib import Path

KEY_PATTERN = re.compile(r"AIzaSy[A-Za-z0-9_\-]{33}")
EXCLUDE_DIRS = {"node_modules", ".venv", "venv", "env", ".git"}

def discover_gemini_key(search_root: str = r"C:\Users\saini") -> str:
    print(f"Scanning for .env files under {search_root} (excluding virtualenvs and node_modules)...")
    discovered_key = None
    
    # 1. Check .env files across search_root
    for dirpath, dirnames, filenames in os.walk(search_root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS and not d.startswith(".venv")]
        for fname in filenames:
            if fname == ".env" or fname.endswith(".env"):
                full_path = Path(dirpath) / fname
                try:
                    content = full_path.read_text(encoding="utf-8", errors="ignore")
                    matches = KEY_PATTERN.findall(content)
                    if matches:
                        discovered_key = matches[0]
                        print(f"[DISCOVERED] Key found in {full_path}: {discovered_key[:10]}...{discovered_key[-4:]}")
                        return discovered_key
                    # Also check for GEMINI_API_KEY assignment
                    for line in content.splitlines():
                        if line.strip().startswith("GEMINI_API_KEY="):
                            val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if val and val != "your_gemini_api_key_here":
                                discovered_key = val
                                print(f"[DISCOVERED] GEMINI_API_KEY found in {full_path}: {discovered_key[:10]}...")
                                return discovered_key
                except Exception:
                    pass

    # 2. Check environment variables if not in .env files
    if not discovered_key:
        env_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if env_key:
            print(f"[DISCOVERED] Key found in environment variables: {env_key[:10]}...")
            return env_key

    return discovered_key or ""

def update_env_file(key: str, repo_root: Path = Path(__file__).resolve().parent.parent):
    env_file = repo_root / ".env"
    print(f"Writing configuration to {env_file}...")
    
    # Best appropriate model for ollama: qwen2.5-coder:7b (installed locally)
    env_content = f"""# LLM Provider Configuration
LLM_PROVIDER=gemini
GEMINI_API_KEY={key}
GEMINI_MODEL=gemini-2.5-flash

# Resilient Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b

# Dense Retriever & Embeddings
DENSE_MODEL_NAME=BAAI/bge-small-en-v1.5
OFFLINE_EMBEDDINGS=true
"""
    env_file.write_text(env_content, encoding="utf-8")
    print("Successfully wrote .env file.")

if __name__ == "__main__":
    key = discover_gemini_key()
    update_env_file(key)
