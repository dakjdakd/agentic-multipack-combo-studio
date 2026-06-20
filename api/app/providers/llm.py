from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

import httpx

from api.app.config import Settings


@dataclass
class LLMResult:
    content: str
    json_value: dict[str, Any] | None
    input_tokens: int
    output_tokens: int
    latency_ms: int
    model: str
    provider: str
    estimated_usage: bool = False
    warning: str | None = None


class LLMProvider:
    """Small OpenAI-compatible LLM adapter with deterministic fallback.

    The app must be reviewable without keys, so callers can always fall back
    to local deterministic generation. When a reviewer supplies an
    OpenAI-compatible base URL and key, this adapter performs the live call and
    returns usage metadata for the cost ledger.
    """

    def __init__(self, settings: Settings):
        self.settings = settings

    def configured(self) -> bool:
        return bool(self.settings.llm_api_key and self.settings.llm_base_url and self.settings.llm_model)

    def chat_json(self, system: str, user: str, *, timeout_s: float = 45.0) -> LLMResult:
        started = time.perf_counter()
        provider = "demo_llm"
        model = self.settings.llm_model or "demo-deterministic"
        if self.settings.demo_mode or not self.configured():
            content = "{}"
            return LLMResult(
                content=content,
                json_value={},
                input_tokens=self._estimate_tokens(system + "\n" + user),
                output_tokens=2,
                latency_ms=self._elapsed(started),
                model=model,
                provider=provider,
                estimated_usage=True,
                warning="LLM provider not configured; deterministic local fallback used.",
            )

        url = self.settings.llm_base_url.rstrip("/")
        if not url.endswith("/chat/completions"):
            url = f"{url}/chat/completions"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self.settings.llm_api_key}", "Content-Type": "application/json"}
        try:
            with httpx.Client(timeout=timeout_s) as client:
                response = client.post(url, headers=headers, json=payload)
                response.raise_for_status()
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            usage = data.get("usage") or {}
            parsed = self._parse_json(content)
            return LLMResult(
                content=content,
                json_value=parsed,
                input_tokens=int(usage.get("prompt_tokens") or self._estimate_tokens(system + "\n" + user)),
                output_tokens=int(usage.get("completion_tokens") or self._estimate_tokens(content)),
                latency_ms=self._elapsed(started),
                model=model,
                provider=self.settings.llm_provider,
                estimated_usage=not bool(usage),
            )
        except Exception as exc:  # noqa: BLE001
            content = "{}"
            return LLMResult(
                content=content,
                json_value={},
                input_tokens=self._estimate_tokens(system + "\n" + user),
                output_tokens=2,
                latency_ms=self._elapsed(started),
                model=model,
                provider=self.settings.llm_provider,
                estimated_usage=True,
                warning=f"Live LLM call failed; deterministic fallback used: {exc}",
            )

    @staticmethod
    def _parse_json(content: str) -> dict[str, Any]:
        try:
            value = json.loads(content)
            return value if isinstance(value, dict) else {}
        except json.JSONDecodeError:
            start = content.find("{")
            end = content.rfind("}")
            if start >= 0 and end > start:
                try:
                    value = json.loads(content[start : end + 1])
                    return value if isinstance(value, dict) else {}
                except json.JSONDecodeError:
                    return {}
            return {}

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        return max(1, int(len(text) / 4))

    @staticmethod
    def _elapsed(started: float) -> int:
        return max(1, int((time.perf_counter() - started) * 1000))
