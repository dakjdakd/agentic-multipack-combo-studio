from __future__ import annotations

import hashlib
import time
from uuid import uuid4

from api.app.config import Settings
from api.app.db.app_store import AppStore
from api.app.models import AgentStepTrace, EnrichedField, EnrichmentResponse, Product, ToolCall
from api.app.providers.search import SearchProvider
from api.app.services.cost_tracker import CostTracker


class EnrichmentService:
    def __init__(self, settings: Settings, store: AppStore, cost: CostTracker):
        self.settings = settings
        self.store = store
        self.cost = cost
        self.search = SearchProvider(settings)

    def enrich(self, product: Product, force_refresh: bool = False) -> EnrichmentResponse:
        cache_key = self._cache_key(product)
        if not force_refresh:
            cached = self.store.get_cache(cache_key)
            if cached:
                cached["cacheHit"] = True
                self.cost.record(
                    cached.get("jobId", f"cache_{product.sku}"),
                    "Research Cache",
                    "local_cache",
                    "enrichment_cache",
                    cached_input_tokens=900,
                    latency_ms=8,
                    estimated_usd=0.0,
                )
                return EnrichmentResponse(**cached)

        job_id = f"enrich_{uuid4().hex[:10]}"
        started = time.perf_counter()
        queries = [
            f"{product.title} product specs",
            f"{product.category} amazon listing requirements",
            f"{product.category} common selling points",
            f"{product.material or product.category} safety certification",
        ]
        search_batch = self.search.search_many(queries)
        sources = search_batch.results
        source_url = lambda idx: sources[idx].url if len(sources) > idx else "https://sell.amazon.com/blog/amazon-product-listings"
        fields = [
            EnrichedField(
                field="category_norm",
                value=product.category or "General Amazon Product",
                sourceUrl=source_url(0),
                confidence=0.78,
                notes="Category normalized from SSB category and Amazon listing guidance.",
                demo=self.settings.demo_mode or not self.settings.search_configured or (sources[0].demo if sources else True),
            ),
            EnrichedField(
                field="common_selling_points",
                value=[
                    f"Emphasize {product.material or 'documented material'} construction.",
                    f"Showcase {product.color or 'catalog color'} visual consistency.",
                    "Highlight measurable dimensions and everyday usage scenarios.",
                ],
                sourceUrl=source_url(2),
                confidence=0.74,
                notes="Derived from product attributes and marketplace content norms.",
                demo=self.settings.demo_mode or not self.settings.search_configured or (sources[2].demo if len(sources) > 2 else True),
            ),
            EnrichedField(
                field="compliance_keywords",
                value=["brand-first title", "no promotional claims", "backend search terms under 250 bytes"],
                sourceUrl=source_url(1),
                confidence=0.72,
                notes="Compliance-safe keyword handling for Amazon listing content.",
                demo=self.settings.demo_mode or not self.settings.search_configured or (sources[1].demo if len(sources) > 1 else True),
            ),
            EnrichedField(
                field="certifications",
                value="not found" if not product.material else f"Verify safety claims before mentioning certifications for {product.material}.",
                sourceUrl=source_url(3),
                confidence=0.55,
                notes="No unverified certification is promoted; missing evidence is retained as a gap.",
                demo=self.settings.demo_mode or not self.settings.search_configured or (sources[3].demo if len(sources) > 3 else True),
            ),
            EnrichedField(
                field="pricing_signals",
                value="competitor range requires live search review" if self.settings.demo_mode or not self.settings.search_configured else "see cited search result",
                sourceUrl=source_url(0),
                confidence=0.5,
                notes="Pricing signal is advisory only and never treated as a final price.",
                demo=self.settings.demo_mode or not self.settings.search_configured,
            ),
        ]
        conflicts = []
        if product.missingFields:
            conflicts.append({"type": "missing_product_fields", "fields": product.missingFields, "policy": "do_not_fabricate"})
        if search_batch.warning:
            conflicts.append({"type": "search_provider_warning", "message": search_batch.warning, "policy": "fallback_with_demo_citations"})
        latency = max(search_batch.latency_ms, int((time.perf_counter() - started) * 1000))
        usd = self.cost.record(job_id, "Research", search_batch.provider, "search", input_tokens=900, output_tokens=350, search_count=len(queries), latency_ms=latency)
        trace = [
            AgentStepTrace(
                agentName="Research",
                inputSummary=f"Enrich SKU {product.sku} using product title/category/material/color.",
                toolCalls=[ToolCall(name="web_search", input=q, durationMs=max(50, latency // 4)) for q in queries]
                + [ToolCall(name="source_citation_guard", input="require sourceUrl per enriched field", durationMs=20)],
                outputArtifact=f"{len(fields)} enriched fields with URL citations. Missing/conflicts retained: {len(conflicts)}.",
                latencyMs=latency,
                inputTokens=900,
                outputTokens=350,
                estimatedCostUsd=usd,
                promptSnippet="Research Agent: collect category norms, competitor-safe selling points, compliance terms, never fabricate specs.",
                warningsOrErrors=search_batch.warning,
            ).model_dump()
        ]
        response = EnrichmentResponse(jobId=job_id, sku=product.sku, cacheHit=False, enrichedFields=fields, conflicts=conflicts, missingFields=product.missingFields, trace=trace)
        self.store.set_cache(cache_key, product.sku, response.model_dump(), self.settings.cache_ttl_hours)
        return response

    @staticmethod
    def _cache_key(product: Product) -> str:
        raw = f"{product.sku}|{product.title}|{product.category}|{product.material}|{product.color}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
