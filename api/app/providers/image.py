from __future__ import annotations

import base64
import time
from dataclasses import dataclass
from pathlib import Path

import httpx

from api.app.config import Settings


@dataclass
class ImageGenerationResult:
    path: Path | None
    latency_ms: int
    provider: str
    model: str
    warning: str | None = None


class ImageProvider:
    """OpenAI-compatible image adapter with local demo fallback in ImageService."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def configured(self) -> bool:
        return bool(self.settings.image_api_key and self.settings.image_base_url and self.settings.image_model)

    def generate_to_file(self, prompt: str, path: Path, *, size: str = "1024x1024") -> ImageGenerationResult:
        started = time.perf_counter()
        if self.settings.demo_mode or not self.configured():
            return ImageGenerationResult(
                path=None,
                latency_ms=self._elapsed(started),
                provider="demo_image",
                model=self.settings.image_model,
                warning="Image provider not configured; Pillow demo image should be used.",
            )

        url = self.settings.image_base_url.rstrip("/")
        if not url.endswith("/images/generations"):
            url = f"{url}/images/generations"
        payload = {"model": self.settings.image_model, "prompt": prompt, "size": size, "response_format": "b64_json"}
        headers = {"Authorization": f"Bearer {self.settings.image_api_key}", "Content-Type": "application/json"}
        try:
            with httpx.Client(timeout=90.0) as client:
                response = client.post(url, headers=headers, json=payload)
                response.raise_for_status()
            data = response.json()
            b64 = data.get("data", [{}])[0].get("b64_json")
            if not b64:
                return ImageGenerationResult(None, self._elapsed(started), self.settings.image_provider, self.settings.image_model, "Image API did not return b64_json; Pillow fallback should be used.")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(base64.b64decode(b64))
            return ImageGenerationResult(path, self._elapsed(started), self.settings.image_provider, self.settings.image_model)
        except Exception as exc:  # noqa: BLE001
            return ImageGenerationResult(None, self._elapsed(started), self.settings.image_provider, self.settings.image_model, f"Live image call failed; Pillow fallback should be used: {exc}")

    @staticmethod
    def _elapsed(started: float) -> int:
        return max(1, int((time.perf_counter() - started) * 1000))
