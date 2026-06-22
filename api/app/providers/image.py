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
    """Image adapter with Agnes/OpenAI-compatible live modes and demo fallback."""

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

        if self.settings.image_provider.lower() == "agnes":
            url = self._agnes_endpoint()
            payload = {
                "model": self.settings.image_model,
                "prompt": prompt,
                "size": size,
                "return_base64": True,
            }
        else:
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
            first = data.get("data", [{}])[0] if isinstance(data.get("data"), list) else {}
            b64 = first.get("b64_json")
            path.parent.mkdir(parents=True, exist_ok=True)
            if b64:
                path.write_bytes(base64.b64decode(b64))
            elif first.get("url"):
                with httpx.Client(timeout=60.0) as client:
                    image_response = client.get(first["url"])
                    image_response.raise_for_status()
                    path.write_bytes(image_response.content)
            else:
                return ImageGenerationResult(None, self._elapsed(started), self.settings.image_provider, self.settings.image_model, "Image API did not return b64_json or url; Pillow fallback should be used.")
            return ImageGenerationResult(path, self._elapsed(started), self.settings.image_provider, self.settings.image_model)
        except Exception as exc:  # noqa: BLE001
            return ImageGenerationResult(None, self._elapsed(started), self.settings.image_provider, self.settings.image_model, f"Live image call failed; Pillow fallback should be used: {exc}")

    def _agnes_endpoint(self) -> str:
        base = self.settings.image_base_url.rstrip("/")
        if base.endswith("/v1/images/generations"):
            return base
        if base.endswith("/images/generations"):
            return base
        if base.endswith("/v1"):
            return f"{base}/images/generations"
        return f"{base}/v1/images/generations"

    @staticmethod
    def _elapsed(started: float) -> int:
        return max(1, int((time.perf_counter() - started) * 1000))
