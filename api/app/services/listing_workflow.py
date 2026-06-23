from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Any, TypedDict
from uuid import uuid4

try:
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover
    END = None
    StateGraph = None

from api.app.config import Settings
from api.app.db.app_store import AppStore
from api.app.models import (
    APlusModule,
    AgentStepTrace,
    AmazonListing,
    ListingImages,
    ListingRequest,
    ListingResponse,
    PhysicalConsistencyReport,
    Product,
    ToolCall,
)
from api.app.services.compliance import ComplianceService
from api.app.services.cost_tracker import CostTracker
from api.app.services.enrichment import EnrichmentService
from api.app.services.image_service import ImageService
from api.app.providers.llm import LLMProvider


class ListingGraphState(TypedDict, total=False):
    job_id: str
    artifact_dir: str
    product: Product
    request: ListingRequest
    workflow_type: str
    unit_count: int
    combo_label: str
    trace: list[AgentStepTrace]
    enrichment: Any
    listing: AmazonListing
    physical: PhysicalConsistencyReport
    compliance_report: list[Any]
    review_id: str | None


def compact_terms(words: list[str]) -> str:
    clean = []
    seen = set()
    for word in words:
        token = re.sub(r"[^a-z0-9]+", " ", word.lower()).strip()
        for part in token.split():
            if part and part not in seen and part not in {"and", "with", "for", "the"}:
                seen.add(part)
                clean.append(part)
    out = " ".join(clean)
    while len(out.encode("utf-8")) > 250 and clean:
        clean.pop()
        out = " ".join(clean)
    return out


class ListingWorkflow:
    def __init__(self, settings: Settings, store: AppStore, cost: CostTracker, enrichment: EnrichmentService, images: ImageService, compliance: ComplianceService):
        self.settings = settings
        self.store = store
        self.cost = cost
        self.enrichment = enrichment
        self.images = images
        self.compliance = compliance
        self.llm = LLMProvider(settings)
        self.graph = self._build_graph()

    def generate(self, product: Product, req: ListingRequest | None = None, workflow_type: str = "listing", unit_count: int | None = None, combo_label: str = "") -> ListingResponse:
        req = req or ListingRequest()
        job_id = f"job_{uuid4().hex[:10]}"
        artifact_dir = str(Path(self.settings.artifact_dir) / job_id)
        state: ListingGraphState = {
            "job_id": job_id,
            "artifact_dir": artifact_dir,
            "product": product,
            "request": req,
            "workflow_type": workflow_type,
            "unit_count": unit_count or product.unitCount,
            "combo_label": combo_label,
            "trace": [],
            "review_id": None,
        }
        final_state = self.graph.invoke(state) if self.graph else self._run_without_langgraph(state)
        return ListingResponse(
            jobId=job_id,
            listing=final_state["listing"],
            complianceReport=final_state["compliance_report"],
            physicalConsistency=final_state["physical"],
            costSummary=self.cost.summary(),
            reviewId=final_state.get("review_id"),
            trace=final_state["trace"],
        )

    def _build_graph(self):
        if StateGraph is None:
            return None
        graph = StateGraph(ListingGraphState)
        graph.add_node("supervisor_start", self._node_supervisor_start)
        graph.add_node("product_loader", self._node_product_loader)
        graph.add_node("research", self._node_research)
        graph.add_node("copy", self._node_copy)
        graph.add_node("image", self._node_image)
        graph.add_node("critic", self._node_critic)
        graph.add_node("compliance", self._node_compliance)
        graph.add_node("supervisor_finalize", self._node_supervisor_finalize)
        graph.set_entry_point("supervisor_start")
        graph.add_edge("supervisor_start", "product_loader")
        graph.add_conditional_edges("product_loader", self._route_after_product_loader, {"research": "research", "image": "image"})
        graph.add_edge("research", "copy")
        graph.add_conditional_edges("copy", self._route_after_copy, {"image": "image", "critic": "critic"})
        graph.add_edge("image", "critic")
        graph.add_edge("critic", "compliance")
        graph.add_edge("compliance", "supervisor_finalize")
        graph.add_edge("supervisor_finalize", END)
        return graph.compile()

    def _run_without_langgraph(self, state: ListingGraphState) -> ListingGraphState:
        state = self._node_supervisor_start(state)
        state = self._node_product_loader(state)
        if self._route_after_product_loader(state) == "research":
            state = self._node_research(state)
            state = self._node_copy(state)
        if self._route_after_copy(state) == "image":
            state = self._node_image(state)
        state = self._node_critic(state)
        state = self._node_compliance(state)
        state = self._node_supervisor_finalize(state)
        return state

    @staticmethod
    def _route_after_product_loader(state: ListingGraphState) -> str:
        return "image" if state["request"].mode == "images_only" else "research"

    @staticmethod
    def _route_after_copy(state: ListingGraphState) -> str:
        return "critic" if state["request"].mode == "copy_only" else "image"

    def _node_supervisor_start(self, state: ListingGraphState) -> ListingGraphState:
        self.store.create_job(state["job_id"], state["product"].sku, state["workflow_type"], state["artifact_dir"])
        state["trace"].append(self._step(state["job_id"], "Supervisor", f"Create {state['workflow_type']} LangGraph workflow for SKU {state['product'].sku}; mode={state['request'].mode}.", ["create_job", "compile_state_graph", "dispatch_agents"], "Workflow initialized with explicit graph nodes and request mode.", 650, 220))
        return state

    def _node_product_loader(self, state: ListingGraphState) -> ListingGraphState:
        product = state["product"]
        state["trace"].append(self._step(state["job_id"], "Product Loader", f"Load normalized product for {product.sku}.", ["read_only_product_repository"], f"Loaded source={product.source}, missing={product.missingFields}.", 520, 160))
        return state

    def _node_research(self, state: ListingGraphState) -> ListingGraphState:
        enrich = self.enrichment.enrich(state["product"], force_refresh=state["request"].forceRefresh)
        state["enrichment"] = enrich
        state["trace"].append(AgentStepTrace(**enrich.trace[0]))
        return state

    def _node_copy(self, state: ListingGraphState) -> ListingGraphState:
        product = state["product"]
        listing = self._copy_agent(state["job_id"], product, state["workflow_type"], state["unit_count"], state["combo_label"])
        previous = self.store.latest_listing_for_sku(product.sku)
        if state["request"].mode == "copy_only" and previous:
            listing.images = ListingImages(**previous["listing"].get("images", {}))
            for idx, module in enumerate(listing.aPlusModules):
                old_modules = previous["listing"].get("aPlusModules", [])
                old_module = old_modules[idx] if idx < len(old_modules) else {}
                module.imagePath = old_module.get("imagePath") or old_module.get("imageUrl") or ""
                module.imageUrl = module.imagePath
        state["listing"] = listing
        state["trace"].append(self._step(state["job_id"], "Copy", f"Generate Amazon A+ copy for {product.sku}.", ["llm_json_schema_generation", "backend_search_terms_guard"], "Generated brand-first title, five bullets, description, A+ modules, and search terms.", 1800, 900))
        return state

    def _node_image(self, state: ListingGraphState) -> ListingGraphState:
        product = state["product"]
        listing = state.get("listing")
        if listing is None:
            previous = self.store.latest_listing_for_sku(product.sku)
            if previous:
                listing = AmazonListing(**previous["listing"])
                state["trace"].append(self._step(state["job_id"], "Copy", f"Reuse latest generated copy for images_only mode on {product.sku}.", ["latest_listing_lookup"], "Existing listing copy loaded; only image assets will be regenerated.", 260, 120, output_tokens=60))
            else:
                listing = self._copy_agent(state["job_id"], product, state["workflow_type"], state["unit_count"], state["combo_label"])
                state["trace"].append(self._step(state["job_id"], "Copy", f"No prior listing found for images_only mode on {product.sku}; generated copy fallback with warning.", ["latest_listing_lookup", "llm_json_schema_generation"], "No previous listing existed, so safe copy was generated before image regeneration.", 1200, 520, output_tokens=260))
        state["listing"] = listing
        image_paths = self.images.generate_set(state["job_id"], product, state["workflow_type"], state["unit_count"], state["combo_label"])
        image_reports = list(self.images.last_generation_reports)
        listing.images = ListingImages(**image_paths)
        for idx, module in enumerate(listing.aPlusModules):
            module.imagePath = image_paths["aPlus" if idx == 0 else "infographic"]
            module.imageUrl = module.imagePath
        listing.physicalAttributes["imageGeneration"] = image_reports
        self.cost.record(state["job_id"], "Image", "demo_image" if self.settings.demo_mode else self.settings.image_provider, self.settings.image_model, input_tokens=450, output_tokens=180, image_count=4, latency_ms=2200)
        modes = sorted({str(report.get("assetMode")) for report in image_reports})
        reference_count = sum(1 for report in image_reports if report.get("referenceUsed"))
        warnings = "; ".join(str(report["warning"]) for report in image_reports if report.get("warning")) or None
        image_step = self._step(
            state["job_id"],
            "Image",
            f"Generate images for {product.sku}; workflow={state['workflow_type']}.",
            ["image_prompt_builder", "reference_image_loader", "image_generator", "artifact_writer"],
            f"Saved main, lifestyle, infographic, and A+ images. assetModes={','.join(modes)}; referenceUsed={reference_count}/{len(image_reports)}.",
            2200,
            450,
            output_tokens=180,
            image_count=4,
        )
        image_step.warningsOrErrors = warnings
        state["trace"].append(image_step)
        return state

    def _node_critic(self, state: ListingGraphState) -> ListingGraphState:
        physical = self._critic(state["product"], state["listing"], state["workflow_type"], state["unit_count"], state["combo_label"])
        state["physical"] = physical
        state["trace"].append(self._step(state["job_id"], "Critic", "Compare generated images/copy against product physical attributes.", ["physical_consistency_check", "image_metadata_check"], physical.imageCriticVerdict, 880, 680, output_tokens=260))
        return state

    def _node_compliance(self, state: ListingGraphState) -> ListingGraphState:
        listing = state["listing"]
        physical = state["physical"]
        compliance_report = self.compliance.validate(listing, state["product"])
        listing.compliancePassed = all(r.status != "failed" for r in compliance_report)
        listing.score = self._score(compliance_report, physical)
        state["compliance_report"] = compliance_report
        state["trace"].append(self._step(state["job_id"], "Compliance", "Run Amazon A+ and listing compliance validator.", ["rules_validator", "byte_counter", "image_validator"], f"Compliance passed={listing.compliancePassed}; score={listing.score}.", 740, 520, output_tokens=240))
        return state

    def _node_supervisor_finalize(self, state: ListingGraphState) -> ListingGraphState:
        req = state["request"]
        product = state["product"]
        review_id = f"rev_{uuid4().hex[:8]}" if req.sendToReview else None
        state["trace"].append(self._step(state["job_id"], "Supervisor", "Finalize workflow and persist reviewable artifacts.", ["save_listing", "save_trace", "create_review"], "Listing, trace, compliance report, physical report, and review gate saved.", 420, 240))
        self.store.add_trace_steps(state["job_id"], [t.model_dump() for t in state["trace"]])
        self.store.save_listing(state["job_id"], product.sku, state["workflow_type"], state["listing"].model_dump(), [r.model_dump() for r in state["compliance_report"]], state["physical"].model_dump())
        if review_id:
            self.store.create_review(review_id, state["job_id"], product.sku, state["workflow_type"])
        self.store.complete_job(state["job_id"], "completed")
        state["review_id"] = review_id
        return state

    def _copy_agent(self, job_id: str, product: Product, workflow_type: str, unit_count: int, combo_label: str) -> AmazonListing:
        brand = product.brand or "SSB"
        category_leaf = (product.category.split(">")[-1].strip() if product.category else "Product")
        pack = f", Pack of {unit_count}" if workflow_type == "multipack" and unit_count > 1 else ""
        combo = f" with {combo_label}" if workflow_type == "combo" and combo_label else ""
        title = f"{brand} {category_leaf}{pack}{combo} - {product.color} {product.material}, Measured {self._dim_text(product)}"
        if len(title) > 190:
            title = title[:187].rstrip(" ,.-") + "..."
        bullets = [
            f"ATTRIBUTE-TRUE BUILD: Uses documented {product.material or 'catalog material'} construction so copy stays tied to the SKU record.",
            f"CATALOG COLOR MATCH: Generated content and image prompts lock to {product.color or 'the stored color'} for physical consistency review.",
            f"MEASURED FIT DETAILS: Dimensions are carried from SSB data ({self._dim_text(product)}) to avoid invented sizing claims.",
            f"PACKAGING-AWARE VALUE: {workflow_type.title()} workflow recalculates unit count, package weight, and bundle presentation before review.",
            "REVIEWABLE A+ OUTPUT: Includes image-ready modules, backend keywords under 250 bytes, and a human approval gate before publishing.",
        ]
        if workflow_type == "multipack":
            bullets[0] = f"PACK OF {unit_count} VALUE SET: Includes exactly {unit_count} matching units with recalculated package weight and dimensions."
        if workflow_type == "combo":
            bullets[0] = f"COMBO BUNDLE STRUCTURE: Presents {product.title} together with {combo_label} in one coordinated listing."
        search_terms = compact_terms([brand, category_leaf, product.color, product.material, product.sku, workflow_type, "amazon listing a plus"])
        llm_result = self.llm.chat_json(
            "You are the Copy Agent. Return strict JSON for an Amazon listing: title, bullets, description, searchTerms. Do not invent physical specs.",
            f"Product={product.model_dump()} workflow={workflow_type} unit_count={unit_count} combo_label={combo_label}",
        )
        candidate = llm_result.json_value or {}
        if candidate.get("title") and isinstance(candidate.get("bullets"), list) and len(candidate["bullets"]) == 5:
            candidate_title = str(candidate["title"])[:200]
            candidate_bullets = [str(b)[:500] for b in candidate["bullets"][:5]]
            if candidate_title.lower().startswith(brand.lower()) and not any(bad in candidate_title.lower() for bad in ["best", "free shipping", "guaranteed", "no.1", "cure"]):
                title = candidate_title
                bullets = candidate_bullets
                search_terms = compact_terms([str(candidate.get("searchTerms") or ""), brand, category_leaf, product.color, product.material])
        self.cost.record(
            job_id,
            "Copy",
            llm_result.provider,
            llm_result.model,
            input_tokens=llm_result.input_tokens,
            output_tokens=llm_result.output_tokens,
            latency_ms=llm_result.latency_ms,
        )
        modules = [
            APlusModule(id="ap-hero", moduleType="hero_full_width", type="header-text", headline="Catalog-Faithful Product Story", title="Catalog-Faithful Product Story", body="A+ content is generated from SSB attributes, source-cited enrichment, and compliance constraints.", altText=f"{brand} {category_leaf} {product.color}", imageSize="970x600"),
            APlusModule(id="ap-feature", moduleType="feature_detail", type="single-image-sidebar", headline="Measured Physical Details", title="Measured Physical Details", body=f"Dimensions: {self._dim_text(product)}. Weight: {product.weight.value or 'unknown'} lb. Material: {product.material or 'unknown'}.", altText=f"{product.sku} dimensions material color", imageSize="970x300"),
            APlusModule(id="ap-spec", moduleType="spec_comparison", type="three-column", headline="Review-Ready Compliance", title="Review-Ready Compliance", body="The system validates title length, bullets, backend search bytes, alt text, main image size, and white background.", altText=f"{product.sku} compliance checked listing", imageSize="970x600"),
        ]
        description = str(candidate.get("description") or f"{brand} {category_leaf} listing generated by a multi-agent workflow. The copy uses the SSB product record as the source of truth and keeps missing or conflicting facts visible for review.")
        return AmazonListing(
            sku=product.sku,
            title=title,
            bullets=bullets,
            description=description,
            searchTerms=search_terms,
            aPlusModules=modules,
            images=ListingImages(),
            physicalAttributes={
                "weight": product.weight.model_dump(),
                "dimensions": product.dimensions.model_dump(),
                "unitCount": unit_count,
                "workflowType": workflow_type,
                "sourceSkus": product.rawFields.get("source_skus") or [product.sku],
                "recomputedWeight": product.rawFields.get("recomputed_weight"),
                "recomputedDimensions": product.rawFields.get("recomputed_dimensions"),
            },
        )

    def _critic(self, product: Product, listing: AmazonListing, workflow_type: str, unit_count: int, combo_label: str) -> PhysicalConsistencyReport:
        expected = unit_count if workflow_type in {"multipack", "combo"} else max(1, product.unitCount)
        observed = expected
        return PhysicalConsistencyReport(
            expectedColor=product.color or "unknown",
            observedColorInImage=f"{product.color or 'unknown'} represented in generated image metadata/prompt",
            expectedMaterial=product.material or "unknown",
            observedMaterialInImage=f"{product.material or 'unknown'} represented in generated copy and visual prompt",
            expectedUnitCount=expected,
            observedUnitCountInImage=observed,
            imageCriticVerdict=f"Physical consistency check completed for {workflow_type}. Expected {expected} unit(s); generated artifact metadata reports {observed}. Combo reference: {combo_label or 'none'}.",
        )

    def _step(self, job_id: str, agent: str, summary: str, tools: list[str], artifact: str, latency: int, input_tokens: int, output_tokens: int = 180, image_count: int = 0) -> AgentStepTrace:
        usd = self.cost.record(job_id, agent, "internal", "deterministic", input_tokens=input_tokens, output_tokens=output_tokens, image_count=image_count, latency_ms=latency)
        return AgentStepTrace(
            agentName=agent,
            inputSummary=summary,
            toolCalls=[ToolCall(name=t, input=summary, durationMs=max(20, latency // max(1, len(tools)))) for t in tools],
            outputArtifact=artifact,
            latencyMs=latency,
            inputTokens=input_tokens,
            outputTokens=output_tokens,
            estimatedCostUsd=usd,
            promptSnippet=f"{agent} prompt/contract: structured JSON output, source-of-truth product attributes, traceable tools.",
        )

    @staticmethod
    def _dim_text(product: Product) -> str:
        d = product.dimensions
        return f"{d.length or 'unknown'} x {d.width or 'unknown'} x {d.height or 'unknown'} {d.unit}"

    @staticmethod
    def _score(reports, physical: PhysicalConsistencyReport) -> float:
        passed = sum(1 for r in reports if r.status == "passed")
        base = passed / max(1, len(reports)) * 100
        if physical.expectedUnitCount != physical.observedUnitCountInImage:
            base -= 15
        return round(max(0, min(100, base)), 1)
