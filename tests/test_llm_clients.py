import pytest
from procurement.config import settings
from procurement.models import AssistantResponse
from procurement.generation.llm import (
    MockLLMClient,
    OllamaLLMClient,
    GeminiLLMClient,
    get_llm_client,
    _clean_json_str,
)


def test_clean_json_str():
    raw = "```json\n{\"status\": \"ok\"}\n```"
    assert _clean_json_str(raw) == '{"status": "ok"}'

    raw_no_lang = "```\n{\"status\": \"ok\"}\n```"
    assert _clean_json_str(raw_no_lang) == '{"status": "ok"}'

    plain = '{"status": "ok"}'
    assert _clean_json_str(plain) == '{"status": "ok"}'


def test_mock_llm_client():
    client = MockLLMClient()
    prompt = """DECISION_BLOCK_JSON: {"status": "DECIDED", "method": "Direct Purchase", "approver": "HoD", "citations": ["MGP-2024-C4.12"]}
    ALLOWED_CITATIONS: ["MGP-2024-C4.12"]
    """
    res = client.generate_json(prompt, AssistantResponse)
    assert res["decision"]["status"] == "DECIDED"
    assert len(res["steps"]) > 0
    assert len(res["checklist"]) > 0


def test_ollama_fallback_to_mock_on_connection_error():
    # Point to an invalid unreachable port to ensure graceful fallback
    client = OllamaLLMClient(base_url="http://127.0.0.1:99999", model="nonexistent")
    prompt = """DECISION_BLOCK_JSON: {"status": "DECIDED", "method": "Direct Purchase", "approver": "HoD", "citations": ["MGP-2024-C4.12"]}
    ALLOWED_CITATIONS: ["MGP-2024-C4.12"]
    """
    res = client.generate_json(prompt, AssistantResponse)
    assert res["decision"]["status"] == "DECIDED"
    assert len(res["steps"]) > 0


def test_gemini_fallback_cascade_on_invalid_key():
    # With an invalid key, Gemini should catch error, try Ollama, and fall back to Mock
    client = GeminiLLMClient(api_key="AIzaSy_INVALID_FALLBACK_TEST")
    prompt = """DECISION_BLOCK_JSON: {"status": "DECIDED", "method": "Direct Purchase", "approver": "HoD", "citations": ["MGP-2024-C4.12"]}
    ALLOWED_CITATIONS: ["MGP-2024-C4.12"]
    """
    res = client.generate_json(prompt, AssistantResponse)
    assert res["decision"]["status"] == "DECIDED"
    assert len(res["steps"]) > 0


def test_get_llm_client_factory():
    assert isinstance(get_llm_client("mock"), MockLLMClient)
    assert isinstance(get_llm_client("ollama"), OllamaLLMClient)
    assert isinstance(get_llm_client("gemini"), GeminiLLMClient)
