from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from api.app.config import Settings


@dataclass
class SearchResult:
    query: str
    title: str
    snippet: str
    url: str
    demo: bool = False


@dataclass
class SearchBatch:
    results: list[SearchResult] = field(default_factory=list)
    latency_ms: int = 0
    provider: str = "demo_search"
    warning: str | None = None


class SearchProvider:
    """Search provider with SerpAPI-compatible live mode and demo citations."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def configured(self) -> bool:
        return bool(self.settings.search_api_key)

    def search_many(self, queries: list[str]) -> SearchBatch:
        started = time.perf_counter()
        if self.settings.demo_mode or not self.configured():
            return SearchBatch(
                results=[self._demo_result(q, idx) for idx, q in enumerate(queries)],
                latency_ms=self._elapsed(started),
                provider="demo_search",
                warning="SEARCH_API_KEY missing or demo mode enabled; deterministic cited search results used.",
            )

        results: list[SearchResult] = []
        warning = None
        try:
            with httpx.Client(timeout=20.0) as client:
                for query in queries:
                    response = client.get(
                        "https://serpapi.com/search.json",
                        params={"engine": "google", "q": query, "api_key": self.settings.search_api_key, "num": 3},
                    )
                    response.raise_for_status()
                    data: dict[str, Any] = response.json()
                    organic = data.get("organic_results") or []
                    if organic:
                        first = organic[0]
                        results.append(
                            SearchResult(
                                query=query,
                                title=first.get("title") or query,
                                snippet=first.get("snippet") or "",
                                url=first.get("link") or "https://www.google.com/search",
                                demo=False,
                            )
                        )
                    else:
                        results.append(self._demo_result(query, len(results), demo=False))
        except Exception as exc:  # noqa: BLE001
            warning = f"Live search failed; deterministic cited results used: {exc}"
            results = [self._demo_result(q, idx) for idx, q in enumerate(queries)]

        return SearchBatch(results=results, latency_ms=self._elapsed(started), provider=self.settings.search_provider, warning=warning)

    @staticmethod
    def _demo_result(query: str, idx: int, demo: bool = True) -> SearchResult:
        sources = [
            ("Amazon product listing guidance", "https://sell.amazon.com/blog/amazon-product-listings"),
            ("Amazon A+ Content overview", "https://sell.amazon.com/tools/a-content"),
            ("Amazon SEO and search terms", "https://sell.amazon.com/blog/amazon-seo"),
            ("Seller Central reference hub", "https://sellercentral.amazon.com/help/hub/reference"),
        ]
        title, url = sources[idx % len(sources)]
        return SearchResult(query=query, title=title, snippet=f"Reference result used for: {query}", url=url, demo=demo)

    @staticmethod
    def _elapsed(started: float) -> int:
        return max(1, int((time.perf_counter() - started) * 1000))
