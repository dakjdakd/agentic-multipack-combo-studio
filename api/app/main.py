from __future__ import annotations

import json
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from api.app.config import get_settings
from api.app.db.app_store import AppStore
from api.app.db.mysql_repository import ProductRepository
from api.app.models import ChatRequest, EvalRequest, ListingRequest
from api.app.services.compliance import ComplianceService
from api.app.services.cost_tracker import CostTracker
from api.app.services.enrichment import EnrichmentService
from api.app.services.eval_harness import EvalHarness
from api.app.services.image_service import ImageService
from api.app.services.listing_workflow import ListingWorkflow
from api.app.services.recomposition import RecompositionService


settings = get_settings()
store = AppStore(settings.app_db_path)
repo = ProductRepository(settings)
cost_tracker = CostTracker(settings, store)
enrichment_service = EnrichmentService(settings, store, cost_tracker)
image_service = ImageService(settings)
compliance_service = ComplianceService()
listing_workflow = ListingWorkflow(settings, store, cost_tracker, enrichment_service, image_service, compliance_service)
recomposition_service = RecompositionService(repo, listing_workflow)
eval_harness = EvalHarness(settings, store)

app = FastAPI(title="SSB Listing Studio API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(settings.artifact_dir).mkdir(parents=True, exist_ok=True)
Path(settings.samples_dir).mkdir(parents=True, exist_ok=True)
app.mount("/artifacts", StaticFiles(directory=settings.artifact_dir), name="artifacts")


@app.on_event("startup")
def startup() -> None:
    store.upsert_schema(repo.schema_snapshot())


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "mode": "demo" if settings.demo_mode else "live", "version": "1.0.0", "time": datetime.utcnow().isoformat()}


@app.get("/api/settings/status")
def settings_status() -> dict[str, Any]:
    db_reachable = repo.db_reachable()
    messages = []
    if settings.demo_mode:
        messages.append("DEMO_MODE enabled: deterministic local providers are used for reproducible review.")
    if not settings.llm_configured:
        messages.append("LLM_API_KEY missing: listing generation uses demo LLM provider.")
    if not settings.image_configured:
        messages.append("IMAGE_API_KEY missing: images use deterministic Pillow demo provider.")
    if not settings.search_configured:
        messages.append(f"SEARCH_API_KEY missing: enrichment uses demo citations instead of {settings.search_provider}.")
    if settings.db_configured and not db_reachable:
        messages.append(f"SSB MySQL not reachable; demo catalog fallback is active. Last error: {repo.last_error}")
    return {
        "dbConfigured": settings.db_configured,
        "dbReachable": db_reachable,
        "dbDialect": "mysql",
        "llmApiConfigured": settings.llm_configured,
        "imageApiConfigured": settings.image_configured,
        "searchApiConfigured": settings.search_configured,
        "demoMode": settings.demo_mode,
        "llmProvider": settings.llm_provider,
        "llmModel": settings.llm_model,
        "llmBaseUrlConfigured": bool(settings.llm_base_url),
        "imageProvider": settings.image_provider,
        "imageModel": settings.image_model,
        "imageBaseUrlConfigured": bool(settings.image_base_url),
        "searchProvider": settings.search_provider,
        "searchBaseUrlConfigured": bool(settings.search_base_url),
        "visionModel": settings.vision_model or "",
        "secretsExposed": False,
        "messages": messages,
    }


@app.get("/api/schema")
def schema() -> dict[str, Any]:
    snap = repo.schema_snapshot()
    store.upsert_schema(snap)
    return snap


@app.get("/api/jobs")
def jobs() -> dict[str, Any]:
    return {
        "items": [
            {
                "jobId": row["job_id"],
                "sku": row["sku"],
                "workflowType": row["workflow_type"],
                "status": row["status"],
                "costRmb": row["cost_rmb"],
                "artifactDir": row["artifact_dir"],
                "createdAt": row["created_at"],
                "completedAt": row["completed_at"],
            }
            for row in store.list_jobs()
        ]
    }


@app.get("/api/products")
def products(q: str = "", brand: str = "", category: str = "", limit: int = 50, cursor: str | None = None) -> dict[str, Any]:
    items = repo.list_products(q=q, brand=brand, category=category, limit=limit, cursor=cursor)
    return {"items": [p.model_dump() for p in items], "nextCursor": items[-1].sku if len(items) == limit else None, "source": items[0].source if items else "demo"}


@app.get("/api/products/{sku}")
def product(sku: str) -> dict[str, Any]:
    item = repo.get_product(sku)
    if not item:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found")
    return item.model_dump()


@app.post("/api/enrich/{sku}")
def enrich(sku: str) -> dict[str, Any]:
    item = repo.get_product(sku)
    if not item:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found")
    return enrichment_service.enrich(item).model_dump()


@app.post("/api/listings/{sku}")
def create_listing(sku: str, req: ListingRequest = ListingRequest()) -> dict[str, Any]:
    item = repo.get_product(sku)
    if not item:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found")
    response = listing_workflow.generate(item, req)
    write_sample(response.jobId, "sku_" + safe_name(sku))
    return response.model_dump()


@app.get("/api/listings/{job_id}")
def get_listing(job_id: str) -> dict[str, Any]:
    row = store.get_listing(job_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    row["costSummary"] = cost_tracker.summary().model_dump()
    return row


@app.get("/api/listings/{job_id}/events")
def listing_events(job_id: str) -> StreamingResponse:
    def stream():
        steps = store.get_trace(job_id)
        if not steps:
            yield "event: error\n"
            yield f"data: {json.dumps({'jobId': job_id, 'error': 'No trace found for job'}, ensure_ascii=False)}\n\n"
            return
        for idx, step in enumerate(steps):
            payload = {"jobId": job_id, "index": idx, **step}
            yield "event: agent_step\n"
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            time.sleep(0.03)
        yield "event: complete\n"
        yield f"data: {json.dumps({'jobId': job_id, 'status': 'completed'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/api/traces/{job_id}")
def trace(job_id: str) -> dict[str, Any]:
    listing = store.get_listing(job_id)
    job_rows = [j for j in store.list_jobs() if j["job_id"] == job_id]
    sku = listing["sku"] if listing else (job_rows[0]["sku"] if job_rows else "")
    workflow = listing["workflowType"] if listing else (job_rows[0]["workflow_type"] if job_rows else "listing")
    return {"jobId": job_id, "sku": sku, "workflowType": workflow, "timestamp": datetime.utcnow().isoformat(), "steps": store.get_trace(job_id)}


@app.get("/api/artifacts/{job_id}")
def artifacts(job_id: str) -> dict[str, Any]:
    base = Path(settings.artifact_dir) / job_id
    if not base.exists():
        raise HTTPException(status_code=404, detail=f"No artifacts for {job_id}")
    files = [f"/artifacts/{job_id}/{p.name}" for p in base.iterdir() if p.is_file()]
    return {"jobId": job_id, "files": files}


@app.get("/api/providers/status")
def provider_status() -> dict[str, Any]:
    return {
        "demoMode": settings.demo_mode,
        "db": {"configured": settings.db_configured, "reachable": repo.db_reachable(), "dialect": "mysql", "lastError": repo.last_error},
        "llm": {"configured": settings.llm_configured, "provider": settings.llm_provider, "baseUrlConfigured": bool(settings.llm_base_url), "model": settings.llm_model, "liveReady": bool(settings.llm_api_key and settings.llm_base_url and settings.llm_model)},
        "image": {"configured": settings.image_configured, "provider": settings.image_provider, "baseUrlConfigured": bool(settings.image_base_url), "model": settings.image_model, "liveReady": bool(settings.image_api_key and settings.image_base_url and settings.image_model)},
        "search": {"configured": settings.search_configured, "provider": settings.search_provider, "baseUrlConfigured": bool(settings.search_base_url), "liveReady": bool(settings.search_api_key)},
        "secretsExposed": False,
    }


@app.post("/api/providers/self-test")
def provider_self_test() -> dict[str, Any]:
    status = provider_status()
    checks = [
        {"name": "db", "status": "passed" if status["db"]["reachable"] or settings.demo_mode else "warning", "message": "Read-only MySQL reachable or demo fallback available."},
        {"name": "llm", "status": "passed" if status["llm"]["liveReady"] else "warning", "message": "Live LLM configured." if status["llm"]["liveReady"] else "Demo LLM fallback will be used."},
        {"name": "image", "status": "passed" if status["image"]["liveReady"] else "warning", "message": "Live image provider configured." if status["image"]["liveReady"] else "Pillow demo image fallback will be used."},
        {"name": "search", "status": "passed" if status["search"]["liveReady"] else "warning", "message": "Live search configured." if status["search"]["liveReady"] else "Demo citations will be used."},
    ]
    return {"ok": True, "checks": checks, "status": status}


@app.post("/api/chat")
def chat(req: ChatRequest) -> dict[str, Any]:
    response = recomposition_service.handle(req)
    history = store.get_chat(req.sessionId).get("history", [])
    history.extend(
        [
            {"sender": "user", "text": req.message, "timestamp": datetime.utcnow().isoformat()},
            {"sender": "assistant", "text": response.assistantMessage, "timestamp": datetime.utcnow().isoformat(), "recomposeResult": response.recomposeResult.model_dump() if response.recomposeResult else None},
        ]
    )
    store.save_chat(req.sessionId, req.currentSku, history, response.jobId)
    if response.jobId:
        write_sample(response.jobId, response.intent)
    return response.model_dump()


@app.get("/api/chat/{session_id}")
def chat_session(session_id: str) -> dict[str, Any]:
    return store.get_chat(session_id)


@app.get("/api/reviews")
def reviews() -> dict[str, Any]:
    items = []
    for row in store.list_reviews():
        listing = store.get_listing(row["job_id"])
        if not listing:
            continue
        product_item = repo.get_product(row["sku"])
        original = {"title": product_item.title, "bullets": [product_item.rawFields.get("sku_description") or product_item.title], "description": product_item.rawFields.get("sku_description") or ""} if product_item else None
        items.append(
            {
                "id": row["review_id"],
                "sku": row["sku"],
                "workflowType": row["workflow_type"],
                "requestDate": row["created_at"].replace("T", " ")[:19],
                "originalListing": original,
                "generatedListing": listing["listing"],
                "complianceReport": listing["complianceReport"],
                "physicalConsistency": listing["physicalConsistency"],
                "status": row["status"],
                "revisionNotes": row["revision_notes"],
            }
        )
    return {"items": items}


@app.post("/api/reviews/{review_id}/approve")
def approve_review(review_id: str) -> dict[str, Any]:
    store.update_review_status(review_id, "approved")
    return {"ok": True, "reviewId": review_id, "status": "approved"}


@app.post("/api/reviews/{review_id}/reject")
def reject_review(review_id: str) -> dict[str, Any]:
    store.update_review_status(review_id, "rejected")
    return {"ok": True, "reviewId": review_id, "status": "rejected"}


@app.post("/api/reviews/{review_id}/request-revision")
def revision_review(review_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    store.update_review_status(review_id, "revision-requested", payload.get("notes") or payload.get("revisionNotes") or "")
    return {"ok": True, "reviewId": review_id, "status": "revision-requested"}


@app.get("/api/costs/summary")
def costs_summary() -> dict[str, Any]:
    return cost_tracker.summary().model_dump()


@app.get("/api/costs/jobs/{job_id}")
def costs_for_job(job_id: str) -> dict[str, Any]:
    rows = [r for r in store.cost_rows() if r["job_id"] == job_id]
    return {"jobId": job_id, "rows": rows}


@app.post("/api/evals/run")
def run_eval(req: EvalRequest) -> dict[str, Any]:
    return eval_harness.run(req.skus).model_dump()


@app.get("/api/evals/{eval_id}")
def get_eval(eval_id: str) -> dict[str, Any]:
    result = store.get_eval(eval_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Eval {eval_id} not found")
    return result


@app.get("/api/variations")
def variations() -> dict[str, Any]:
    products_list = repo.list_products(limit=200)
    groups: dict[str, dict[str, Any]] = {}
    for p in products_list:
        key = f"{p.brand}|{p.category}|{p.rawFields.get('sku_style_code') or p.title[:24]}"
        group = groups.setdefault(key, {"parentSku": None, "items": [], "pricingSuggestion": {}})
        if p.rawFields.get("sku_relation_type") == "M":
            group["parentSku"] = p.sku
        group["items"].append({"sku": p.sku, "color": p.color, "size": p.rawFields.get("sku_size"), "volume": p.rawFields.get("sku_volume"), "relationType": p.rawFields.get("sku_relation_type")})
        cost = float(p.rawFields.get("cost") or 0)
        group["pricingSuggestion"] = {"suggestedPrice": round(cost * 2.8, 2) if cost else None, "confidence": 0.55, "notes": "Cost-based suggestion; enrich competitor prices before publishing."}
    return {"groups": list(groups.values())}


@app.get("/api/variations/{sku}")
def variation_for_sku(sku: str) -> dict[str, Any]:
    all_groups = variations()["groups"]
    for group in all_groups:
        if any(item["sku"] == sku for item in group["items"]):
            return group
    raise HTTPException(status_code=404, detail=f"No variation group for {sku}")


def safe_name(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in value)[:80]


def write_sample(job_id: str, folder_name: str) -> None:
    listing = store.get_listing(job_id)
    if not listing:
        return
    out_dir = Path(settings.samples_dir) / safe_name(folder_name)
    out_dir.mkdir(parents=True, exist_ok=True)
    product_item = repo.get_product(listing["sku"])
    if product_item:
        (out_dir / "product.json").write_text(json.dumps(product_item.model_dump(), indent=2), encoding="utf-8")
        enrich_payload = enrichment_service.enrich(product_item).model_dump()
        (out_dir / "enrichment.json").write_text(json.dumps(enrich_payload, indent=2), encoding="utf-8")
    (out_dir / "listing.json").write_text(json.dumps(listing["listing"], indent=2), encoding="utf-8")
    (out_dir / "compliance_report.json").write_text(json.dumps(listing["complianceReport"], indent=2), encoding="utf-8")
    (out_dir / "physical_consistency_report.json").write_text(json.dumps(listing["physicalConsistency"], indent=2), encoding="utf-8")
    (out_dir / "trace.json").write_text(json.dumps(store.get_trace(job_id), indent=2), encoding="utf-8")
    (out_dir / "cost_summary.json").write_text(json.dumps(cost_tracker.summary().model_dump(), indent=2), encoding="utf-8")
    if product_item:
        diff = {
            "sku": listing["sku"],
            "workflowType": listing["workflowType"],
            "title": {"before": product_item.title, "after": listing["listing"].get("title")},
            "unitCount": {"before": product_item.unitCount, "after": listing["physicalConsistency"].get("expectedUnitCount")},
            "weight": {"before": product_item.weight.model_dump(), "after": listing["listing"].get("physicalAttributes", {}).get("weight")},
            "dimensions": {"before": product_item.dimensions.model_dump(), "after": listing["listing"].get("physicalAttributes", {}).get("dimensions")},
            "images": {"after": listing["listing"].get("images")},
            "compliancePassed": listing["listing"].get("compliancePassed"),
        }
        (out_dir / "diff.json").write_text(json.dumps(diff, indent=2), encoding="utf-8")
        (out_dir / "request.json").write_text(json.dumps({"jobId": job_id, "sku": listing["sku"], "workflowType": listing["workflowType"]}, indent=2), encoding="utf-8")
    src_dir = Path(settings.artifact_dir) / job_id
    img_dir = out_dir / "images"
    img_dir.mkdir(exist_ok=True)
    if src_dir.exists():
        for file in src_dir.iterdir():
            if file.is_file():
                shutil.copyfile(file, img_dir / file.name)
