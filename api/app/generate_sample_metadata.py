from __future__ import annotations

import json
from pathlib import Path

from api.app.config import get_settings
from api.app.db.mysql_repository import ProductRepository
from api.app.services.enrichment import EnrichmentService
from api.app.services.cost_tracker import CostTracker
from api.app.db.app_store import AppStore


def main() -> None:
    settings = get_settings()
    store = AppStore(settings.app_db_path)
    repo = ProductRepository(settings)
    enrichment = EnrichmentService(settings, store, CostTracker(settings, store))
    samples = Path(settings.samples_dir)
    samples.mkdir(parents=True, exist_ok=True)
    for folder in samples.iterdir():
        if not folder.is_dir():
            continue
        listing_path = folder / "listing.json"
        if not listing_path.exists():
            continue
        listing = json.loads(listing_path.read_text(encoding="utf-8"))
        sku = listing.get("sku") or folder.name.replace("sku_", "")
        product = repo.get_product(sku)
        if product:
            (folder / "product.json").write_text(json.dumps(product.model_dump(), indent=2), encoding="utf-8")
            enrich_payload = enrichment.enrich(product).model_dump()
            (folder / "enrichment.json").write_text(json.dumps(enrich_payload, indent=2), encoding="utf-8")
            physical_path = folder / "physical_consistency_report.json"
            physical = json.loads(physical_path.read_text(encoding="utf-8")) if physical_path.exists() else {}
            diff = {
                "sku": sku,
                "workflowType": "combo" if folder.name == "combo" else "multipack" if folder.name == "multipack" else "listing",
                "title": {"before": product.title, "after": listing.get("title")},
                "unitCount": {"before": product.unitCount, "after": physical.get("expectedUnitCount")},
                "weight": {"before": product.weight.model_dump(), "after": listing.get("physicalAttributes", {}).get("weight")},
                "dimensions": {"before": product.dimensions.model_dump(), "after": listing.get("physicalAttributes", {}).get("dimensions")},
                "images": {"after": listing.get("images")},
                "compliancePassed": listing.get("compliancePassed"),
            }
            (folder / "diff.json").write_text(json.dumps(diff, indent=2), encoding="utf-8")
        (folder / "request.json").write_text(json.dumps({"sku": sku, "sampleFolder": folder.name}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
