from api.app.db.mysql_repository import normalize_product, parse_pack_count
from api.app.main import app
from api.app.models import AmazonListing, APlusModule, ListingImages
from api.app.config import Settings
from api.app.providers.image import ImageProvider
from api.app.services.compliance import ComplianceService, byte_len
from api.app.services.cost_tracker import CostTracker
from api.app.services.recomposition import RecompositionService
from fastapi.testclient import TestClient


client = TestClient(app)


def test_parse_pack_count():
    assert parse_pack_count("Pack of 3") == 3
    assert parse_pack_count("2-pack") == 2
    assert parse_pack_count("3 件装") == 3
    assert parse_pack_count("4个装") == 4
    assert parse_pack_count("") == 1


def test_normalize_product_missing_fields():
    product = normalize_product({"sku": "A", "title": "T", "remark": "Pack of 2"}, "demo")
    assert product.unitCount == 2
    assert "brand" in product.missingFields
    assert product.dimensions.unit == "in"


def test_backend_search_terms_bytes():
    assert byte_len("charger gan usb c") <= 250


def test_provider_defaults_for_live_stack():
    settings = Settings(_env_file=None)
    assert settings.llm_provider == "deepseek"
    assert settings.llm_model == "deepseek-v4-flash"
    assert settings.image_provider == "agnes"
    assert settings.image_model == "agnes-image-2.1-flash"
    assert settings.search_provider == "tavily"


def test_agnes_endpoint_builder():
    provider = ImageProvider(Settings(image_provider="agnes", image_base_url="https://apihub.agnes-ai.com"))
    assert provider._agnes_endpoint() == "https://apihub.agnes-ai.com/v1/images/generations"

    provider = ImageProvider(Settings(image_provider="agnes", image_base_url="https://apihub.agnes-ai.com/v1"))
    assert provider._agnes_endpoint() == "https://apihub.agnes-ai.com/v1/images/generations"


def test_cost_estimate_uses_configured_agnes_unit_price():
    class DummyStore:
        pass

    tracker = CostTracker(Settings(image_generation_usd=0.003, search_request_usd=0.005), DummyStore())
    assert tracker.estimate_usd(0, 0, 1, 1) == 0.008


def test_compliance_rules_title_and_bullets():
    product = normalize_product(
        {
            "sku": "A",
            "title": "Widget",
            "brand": "Brand",
            "sku_category": "Home > Widget",
            "sku_color": "Black",
            "sku_composition": "Steel",
            "sku_length": "1",
            "sku_width": "1",
            "sku_height": "1",
            "sku_weight": "1",
        },
        "demo",
    )
    listing = AmazonListing(
        sku="A",
        title="Brand Widget Black Steel",
        bullets=["Benefit tied to steel specs."] * 5,
        description="Description",
        searchTerms="brand widget black steel",
        aPlusModules=[APlusModule(id="m", moduleType="hero", headline="H", body="B", altText="Alt", imageSize="970x600")],
        images=ListingImages(main="missing.jpg"),
    )
    reports = ComplianceService().validate(listing, product)
    assert any(r.id == "title_brand_first" and r.status == "passed" for r in reports)


def test_chat_parse_english_and_chinese():
    intent, qty, other = RecompositionService._parse("Combine this with SKU STAND-ALUM-09")
    assert intent == "combo"
    assert other == "STAND-ALUM-09"

    intent, qty, other = RecompositionService._parse("把这个 SKU 做成 3 件装")
    assert intent == "multipack"
    assert qty == 3

    intent, qty, other = RecompositionService._parse("把它和 SKU STAND-ALUM-09 组合")
    assert intent == "combo"
    assert other == "STAND-ALUM-09"


def test_api_health_products_and_jobs():
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["ok"] is True

    products = client.get("/api/products")
    assert products.status_code == 200
    assert len(products.json()["items"]) >= 1

    jobs = client.get("/api/jobs")
    assert jobs.status_code == 200
    assert "items" in jobs.json()


def test_api_listing_trace_review_eval_flow():
    sku = client.get("/api/products").json()["items"][0]["sku"]
    listing = client.post(f"/api/listings/{sku}", json={"mode": "full", "sendToReview": True})
    assert listing.status_code == 200
    payload = listing.json()
    assert payload["jobId"].startswith("job_")
    assert len(payload["trace"]) >= 7
    assert [step["agentName"] for step in payload["trace"]][:3] == ["Supervisor", "Product Loader", "Research"]
    assert len(payload["listing"]["bullets"]) == 5

    trace = client.get(f"/api/traces/{payload['jobId']}")
    assert trace.status_code == 200
    assert trace.json()["steps"][-1]["agentName"] == "Supervisor"

    events = client.get(f"/api/listings/{payload['jobId']}/events")
    assert events.status_code == 200
    assert "text/event-stream" in events.headers["content-type"]
    assert "event: agent_step" in events.text

    reviews = client.get("/api/reviews")
    assert reviews.status_code == 200
    assert any(item["id"] == payload["reviewId"] for item in reviews.json()["items"])

    approved = client.post(f"/api/reviews/{payload['reviewId']}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    eval_result = client.post("/api/evals/run", json={"skus": [sku], "includeGeneration": False})
    assert eval_result.status_code == 200
    assert eval_result.json()["overallScore"] >= 0

    provider_status = client.get("/api/providers/status")
    assert provider_status.status_code == 200
    assert provider_status.json()["secretsExposed"] is False


def test_api_chat_multipack_and_combo():
    products = client.get("/api/products").json()["items"]
    sku = products[0]["sku"]
    other = products[1]["sku"] if len(products) > 1 else products[0]["sku"]

    multipack = client.post("/api/chat", json={"sessionId": "test-chat", "currentSku": sku, "message": "把这个 SKU 做成 3 件装"})
    assert multipack.status_code == 200
    mp_payload = multipack.json()
    assert mp_payload["intent"] == "multipack"
    assert mp_payload["recomposeResult"]["unitCount"] == 3
    assert mp_payload["listing"]["physicalAttributes"]["unitCount"] == 3

    combo = client.post("/api/chat", json={"sessionId": "test-chat", "currentSku": sku, "message": f"Combine this with SKU {other}"})
    assert combo.status_code == 200
    combo_payload = combo.json()
    assert combo_payload["intent"] == "combo"
    assert other in combo_payload["referencedSkus"]
    assert combo_payload["listing"]["physicalAttributes"]["unitCount"] >= 2
