from __future__ import annotations

import hashlib
import json
import time
from typing import Any
from uuid import uuid4

from api.app.config import Settings
from api.app.db.app_store import AppStore
from api.app.models import AgentStepTrace, EnrichedField, EnrichmentResponse, Product, ToolCall
from api.app.providers.llm import LLMProvider
from api.app.providers.search import SearchProvider
from api.app.services.cost_tracker import CostTracker


class EnrichmentService:
    def __init__(self, settings: Settings, store: AppStore, cost: CostTracker):
        self.settings = settings
        self.store = store
        self.cost = cost
        self.search = SearchProvider(settings)
        self.llm = LLMProvider(settings)

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
        evidence_docs = self._evidence_docs(sources, queries)
        llm_result = self.llm.chat_json(
            (
                "You are the Research Agent for an Amazon listing workflow. Return strict JSON with "
                "summary, fields, and conflicts. Each field must include field, value, sourceUrl, "
                "confidence, notes, evidence array, citations array with sourceId/title/url, and conflict "
                "object or null. Use only the supplied sources; do not invent certifications, dimensions, "
                "weight, color, material, or pricing."
            ),
            json.dumps(
                {
                    "product": product.model_dump(),
                    "sources": evidence_docs,
                    "requiredFields": [
                        "category_norm",
                        "common_selling_points",
                        "compliance_keywords",
                        "certifications",
                        "pricing_signals",
                    ],
                },
                ensure_ascii=False,
            ),
        )
        fields, llm_conflicts = self._fields_from_llm(product, evidence_docs, llm_result.json_value)
        if not fields:
            fields = self._deterministic_fields(product, evidence_docs)
        conflicts = []
        if product.missingFields:
            conflicts.append({"type": "missing_product_fields", "fields": product.missingFields, "policy": "do_not_fabricate"})
        if search_batch.warning:
            conflicts.append({"type": "search_provider_warning", "message": search_batch.warning, "policy": "fallback_with_demo_citations"})
        if llm_result.warning:
            conflicts.append({"type": "research_llm_warning", "message": llm_result.warning, "policy": "deterministic_evidence_summary"})
        conflicts.extend(llm_conflicts)
        latency = max(search_batch.latency_ms, int((time.perf_counter() - started) * 1000))
        search_usd = self.cost.record(job_id, "Research Search", search_batch.provider, "search", input_tokens=900, output_tokens=350, search_count=len(queries), latency_ms=search_batch.latency_ms)
        llm_usd = self.cost.record(job_id, "Research LLM Summary", llm_result.provider, llm_result.model, input_tokens=llm_result.input_tokens, output_tokens=llm_result.output_tokens, latency_ms=llm_result.latency_ms)
        warning_text = "; ".join(c["message"] for c in conflicts if c.get("message")) or None
        trace = [
            AgentStepTrace(
                agentName="Research",
                inputSummary=f"Enrich SKU {product.sku} using {len(evidence_docs)} cited search result(s), then summarize with LLM field evidence.",
                toolCalls=[ToolCall(name="web_search", input=q, durationMs=max(50, latency // 4)) for q in queries]
                + [
                    ToolCall(name="llm_research_summarizer", input=f"sources={len(evidence_docs)} required_fields=5", durationMs=llm_result.latency_ms),
                    ToolCall(name="field_evidence_guard", input="require citation/evidence/conflict per enriched field", durationMs=20),
                ],
                outputArtifact=f"{len(fields)} enriched fields with citations, evidence snippets, and field-level conflicts. Conflicts retained: {len(conflicts)}.",
                latencyMs=latency,
                inputTokens=900 + llm_result.input_tokens,
                outputTokens=350 + llm_result.output_tokens,
                estimatedCostUsd=round(search_usd + llm_usd, 6),
                promptSnippet="Research Agent: search results -> LLM summary -> sourceUrl/evidence/citation/conflict per field; never fabricate specs.",
                warningsOrErrors=warning_text,
            ).model_dump()
        ]
        response = EnrichmentResponse(jobId=job_id, sku=product.sku, cacheHit=False, enrichedFields=fields, conflicts=conflicts, missingFields=product.missingFields, trace=trace)
        self.store.set_cache(cache_key, product.sku, response.model_dump(), self.settings.cache_ttl_hours)
        return response

    @staticmethod
    def _cache_key(product: Product) -> str:
        raw = f"enrichment-v2|{product.sku}|{product.title}|{product.category}|{product.material}|{product.color}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _evidence_docs(sources, queries: list[str]) -> list[dict[str, Any]]:
        docs = []
        for idx, result in enumerate(sources):
            docs.append(
                {
                    "sourceId": f"S{idx + 1}",
                    "query": result.query,
                    "title": result.title,
                    "snippet": result.snippet,
                    "url": result.url,
                    "demo": result.demo,
                }
            )
        if docs:
            return docs
        return [
            {
                "sourceId": "S1",
                "query": queries[0] if queries else "amazon listing guidance",
                "title": "Amazon product listing guidance",
                "snippet": "Fallback citation for listing enrichment when search returns no results.",
                "url": "https://sell.amazon.com/blog/amazon-product-listings",
                "demo": True,
            }
        ]

    def _fields_from_llm(self, product: Product, docs: list[dict[str, Any]], payload: dict[str, Any] | None) -> tuple[list[EnrichedField], list[dict[str, Any]]]:
        if not payload:
            return [], []
        raw_fields = payload.get("fields")
        if not isinstance(raw_fields, list):
            return [], [{"type": "research_llm_schema", "message": "LLM response omitted fields array.", "policy": "deterministic_evidence_summary"}]
        fields: list[EnrichedField] = []
        conflicts: list[dict[str, Any]] = []
        for raw in raw_fields:
            if not isinstance(raw, dict) or not raw.get("field"):
                continue
            citations = self._safe_citations(raw.get("citations"), docs)
            source_url = str(raw.get("sourceUrl") or (citations[0]["url"] if citations else docs[0]["url"]))
            if source_url not in {d["url"] for d in docs}:
                conflicts.append({"type": "uncited_field_url", "field": raw.get("field"), "sourceUrl": source_url, "policy": "replaced_with_known_source"})
                source_url = citations[0]["url"] if citations else docs[0]["url"]
            evidence = self._safe_evidence(raw.get("evidence"), citations)
            conflict = raw.get("conflict") if isinstance(raw.get("conflict"), dict) else None
            fields.append(
                EnrichedField(
                    field=str(raw["field"]),
                    value=raw.get("value"),
                    sourceUrl=source_url,
                    confidence=self._confidence(raw.get("confidence")),
                    notes=str(raw.get("notes") or "LLM summarized this field from cited search evidence."),
                    evidence=evidence,
                    citations=citations,
                    conflict=conflict,
                    demo=any(c.get("demo") for c in citations),
                )
            )
        fields_by_name = {field.field for field in fields}
        for fallback in self._deterministic_fields(product, docs):
            if fallback.field not in fields_by_name:
                fields.append(fallback)
                conflicts.append({"type": "missing_required_research_field", "field": fallback.field, "policy": "deterministic_fallback"})
        return fields, conflicts

    def _deterministic_fields(self, product: Product, docs: list[dict[str, Any]]) -> list[EnrichedField]:
        specs, requirements, selling, safety = self._doc(docs, 0), self._doc(docs, 1), self._doc(docs, 2), self._doc(docs, 3)
        demo_mode = self.settings.demo_mode or not self.settings.search_configured
        return [
            self._field(
                "category_norm",
                product.category or "General Amazon Product",
                specs,
                0.78,
                "Category normalized from SSB category and cited listing/spec guidance.",
                [f"SSB category: {product.category or 'missing'}", specs["snippet"]],
                None,
                demo_mode,
            ),
            self._field(
                "common_selling_points",
                [
                    f"Emphasize {product.material or 'documented material'} construction only when the SKU record supports it.",
                    f"Showcase {product.color or 'catalog color'} visual consistency across copy and images.",
                    "Highlight measured dimensions and everyday usage scenarios without inventing performance claims.",
                ],
                selling,
                0.74,
                "Selling points are derived from product attributes plus marketplace content norms.",
                [selling["snippet"], f"Source-of-truth physical attributes remain SKU {product.sku}."],
                None,
                demo_mode,
            ),
            self._field(
                "compliance_keywords",
                ["brand-first title", "no promotional claims", "backend search terms under 250 bytes"],
                requirements,
                0.72,
                "Compliance-safe keyword handling for Amazon listing content.",
                [requirements["snippet"], "Compliance keywords are generic listing constraints, not product performance claims."],
                None,
                demo_mode,
            ),
            self._field(
                "certifications",
                "not found" if not product.material else f"Do not mention certifications unless evidence is provided for {product.material}.",
                safety,
                0.55,
                "No unverified certification is promoted; missing evidence is retained as a field conflict.",
                [safety["snippet"]],
                {"type": "insufficient_evidence", "policy": "do_not_claim_certification"},
                demo_mode,
            ),
            self._field(
                "pricing_signals",
                "competitor range requires live marketplace review" if demo_mode else "live search evidence available; still advisory only",
                specs,
                0.5,
                "Pricing signal is advisory only and never treated as a final price.",
                [specs["snippet"], "No price is written back to SSB; reviewer approval is required."],
                {"type": "weak_pricing_evidence", "policy": "manual_review_required"},
                demo_mode,
            ),
        ]

    @staticmethod
    def _field(
        name: str,
        value: Any,
        doc: dict[str, Any],
        confidence: float,
        notes: str,
        evidence: list[str],
        conflict: dict[str, Any] | None,
        demo: bool,
    ) -> EnrichedField:
        citation = {
            "sourceId": doc["sourceId"],
            "title": doc["title"],
            "url": doc["url"],
            "snippet": doc["snippet"],
            "demo": doc.get("demo", demo),
        }
        return EnrichedField(
            field=name,
            value=value,
            sourceUrl=doc["url"],
            confidence=confidence,
            notes=notes,
            evidence=[item for item in evidence if item],
            citations=[citation],
            conflict=conflict,
            demo=demo or bool(doc.get("demo")),
        )

    @staticmethod
    def _doc(docs: list[dict[str, Any]], idx: int) -> dict[str, Any]:
        return docs[idx] if len(docs) > idx else docs[0]

    @staticmethod
    def _safe_citations(raw_citations: Any, docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        known_by_id = {doc["sourceId"]: doc for doc in docs}
        known_by_url = {doc["url"]: doc for doc in docs}
        citations = []
        if isinstance(raw_citations, list):
            for raw in raw_citations[:3]:
                if not isinstance(raw, dict):
                    continue
                doc = known_by_id.get(str(raw.get("sourceId"))) or known_by_url.get(str(raw.get("url")))
                if doc:
                    citations.append({"sourceId": doc["sourceId"], "title": doc["title"], "url": doc["url"], "snippet": doc["snippet"], "demo": doc.get("demo", False)})
        if not citations:
            doc = docs[0]
            citations.append({"sourceId": doc["sourceId"], "title": doc["title"], "url": doc["url"], "snippet": doc["snippet"], "demo": doc.get("demo", False)})
        return citations

    @staticmethod
    def _safe_evidence(raw_evidence: Any, citations: list[dict[str, Any]]) -> list[str]:
        evidence = [str(item)[:240] for item in raw_evidence if item] if isinstance(raw_evidence, list) else []
        if evidence:
            return evidence[:4]
        return [str(citation.get("snippet") or citation.get("title") or "")[:240] for citation in citations if citation.get("snippet") or citation.get("title")]

    @staticmethod
    def _confidence(value: Any) -> float:
        try:
            return max(0.0, min(1.0, float(value)))
        except (TypeError, ValueError):
            return 0.65
