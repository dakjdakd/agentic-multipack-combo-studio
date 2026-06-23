from __future__ import annotations

import base64
import mimetypes
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
    generation_mode: str = "text_to_image"
    reference_used: bool = False


class ImageProvider:
    """Image adapter with Agnes/OpenAI-compatible live modes and demo fallback."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def configured(self) -> bool:
        return bool(self.settings.image_api_key and self.settings.image_base_url and self.settings.image_model)

    def generate_to_file(self, prompt: str, path: Path, *, size: str = "1024x1024", reference_image: str | None = None) -> ImageGenerationResult:
        started = time.perf_counter()
        provider_name = self.settings.image_provider.lower()
        reference_input = self._image_input(reference_image)
        reference_supported = provider_name == "agnes"
        reference_used = bool(reference_input and reference_supported)
        generation_mode = "image_to_image_reference" if reference_used else "text_to_image"
        if self.settings.demo_mode or not self.configured():
            return ImageGenerationResult(
                path=None,
                latency_ms=self._elapsed(started),
                provider="demo_image",
                model=self.settings.image_model,
                warning="Image provider not configured; Pillow demo image should be used.",
                generation_mode="demo_fallback",
                reference_used=False,
            )

        if provider_name == "agnes":
            url = self._agnes_endpoint()
            payloads = self._agnes_payloads(prompt, size, reference_input)
        else:
            url = self.settings.image_base_url.rstrip("/")
            if not url.endswith("/images/generations"):
                url = f"{url}/images/generations"
            payloads = [{"model": self.settings.image_model, "prompt": prompt, "size": size, "response_format": "b64_json"}]
        headers = {"Authorization": f"Bearer {self.settings.image_api_key}", "Content-Type": "application/json"}
        try:
            last_error: Exception | None = None
            data = None
            with httpx.Client(timeout=180.0) as client:
                for payload in payloads:
                    try:
                        response = client.post(url, headers=headers, json=payload)
                        response.raise_for_status()
                        data = response.json()
                        break
                    except httpx.HTTPStatusError as exc:
                        last_error = exc
                        if exc.response.status_code not in {400, 422} or len(payloads) == 1:
                            raise
                if data is None and last_error:
                    raise last_error
            if data is None:
                raise RuntimeError("Image API returned no JSON payload.")
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
                return ImageGenerationResult(None, self._elapsed(started), self.settings.image_provider, self.settings.image_model, "Image API did not return b64_json or url; Pillow fallback should be used.", generation_mode, reference_used)
            return ImageGenerationResult(path, self._elapsed(started), self.settings.image_provider, self.settings.image_model, None, generation_mode, reference_used)
        except Exception as exc:  # noqa: BLE001
            return ImageGenerationResult(None, self._elapsed(started), self.settings.image_provider, self.settings.image_model, f"Live image call failed; Pillow fallback should be used: {exc}", generation_mode, reference_used)

    def _agnes_endpoint(self) -> str:
        base = self.settings.image_base_url.rstrip("/")
        if base.endswith("/v1/images/generations"):
            return base
        if base.endswith("/images/generations"):
            return base
        if base.endswith("/v1"):
            return f"{base}/images/generations"
        return f"{base}/v1/images/generations"

    def _agnes_payloads(self, prompt: str, size: str, reference_image: str | None) -> list[dict[str, object]]:
        image = reference_image
        base: dict[str, object] = {
            "model": self.settings.image_model,
            "prompt": prompt,
            "size": size,
        }
        if not image:
            return [{**base, "return_base64": True}]

        # Agnes docs have shown both `extra_body.image` and top-level `image`.
        # Try the documented extra_body shape first, then fall back to top-level
        # image if the gateway rejects the request schema.
        return [
            {
                **base,
                "extra_body": {
                    "image": [image],
                    "response_format": "b64_json",
                },
            },
            {
                **base,
                "image": [image],
                "extra_body": {
                    "response_format": "b64_json",
                },
            },
        ]

    @staticmethod
    def _image_input(reference_image: str | None) -> str | None:
        if not reference_image:
            return None
        image = reference_image.strip()
        if not image:
            return None
        if image.startswith(("http://", "https://")):
            data_uri = ImageProvider._remote_image_data_uri(image)
            return data_uri or image
        if image.startswith(("http://", "https://", "data:image/")):
            return image

        path = Path(image)
        if not path.exists() or not path.is_file():
            return None
        mime = mimetypes.guess_type(path.name)[0] or "image/png"
        return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"

    @staticmethod
    def _remote_image_data_uri(url: str) -> str | None:
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                response = client.get(url)
                response.raise_for_status()
            content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
            if not content_type.startswith("image/"):
                content_type = mimetypes.guess_type(url)[0] or "image/jpeg"
            if len(response.content) > 8 * 1024 * 1024:
                return None
            return f"data:{content_type};base64,{base64.b64encode(response.content).decode('ascii')}"
        except Exception:  # noqa: BLE001
            return None

    @staticmethod
    def _elapsed(started: float) -> int:
        return max(1, int((time.perf_counter() - started) * 1000))
