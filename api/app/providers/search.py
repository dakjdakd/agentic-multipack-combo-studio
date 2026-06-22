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
    """Search provider with Tavily/SerpAPI live modes and demo citations."""

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
            if self.settings.search_provider.lower() == "tavily":
                results = self._search_tavily(queries)
            else:
                results = self._search_serpapi(queries)
        except Exception as exc:  # noqa: BLE001
            warning = f"Live search failed; deterministic cited results used: {exc}"
            results = [self._demo_result(q, idx) for idx, q in enumerate(queries)]

        return SearchBatch(results=results, latency_ms=self._elapsed(started), provider=self.settings.search_provider, warning=warning)

    def _search_tavily(self, queries: list[str]) -> list[SearchResult]:
        results: list[SearchResult] = []
        endpoint = self.settings.search_base_url.rstrip("/")
        if not endpoint.endswith("/search"):
            endpoint = f"{endpoint}/search"
        headers = {"Authorization": f"Bearer {self.settings.search_api_key}", "Content-Type": "application/json"}
        with httpx.Client(timeout=25.0) as client:
            for query in queries:
                response = client.post(
                    endpoint,
                    headers=headers,
                    json={
                        "query": query,
                        "search_depth": "basic",
                        "max_results": 3,
                        "include_answer": False,
                        "include_raw_content": False,
                        "include_images": False,
                        "include_usage": True,
                    },
                )
                response.raise_for_status()
                data: dict[str, Any] = response.json()
                tavily_results = data.get("results") or []
                if tavily_results:
                    first = tavily_results[0]
                    results.append(
                        SearchResult(
                            query=query,
                            title=first.get("title") or query,
                            snippet=first.get("content") or first.get("snippet") or "",
                            url=first.get("url") or "https://www.tavily.com/search",
                            demo=False,
                        )
                    )
                else:
                    results.append(self._demo_result(query, len(results), demo=False))
        return results

    def _search_serpapi(self, queries: list[str]) -> list[SearchResult]:
        results: list[SearchResult] = []
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
        return results

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
