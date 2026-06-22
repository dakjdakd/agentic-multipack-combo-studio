from __future__ import annotations

import json
import re
from typing import Any
try:
    import pymysql
    from pymysql.cursors import DictCursor
except Exception:  # pragma: no cover
    pymysql = None
    DictCursor = None

from api.app.config import Settings
from api.app.json_utils import json_safe
from api.app.models import Dimensions, Product, Weight


DEMO_PRODUCTS: list[dict[str, Any]] = [
    {
        "sku": "MUG-STEEL-01",
        "title": "AeroTherm Matte Black Stainless Steel Travel Mug - 16oz Vacuum Insulated Tumbler",
        "brand": "AeroTherm",
        "sku_category": "Kitchen & Dining > Drinkware > Tumblers",
        "sku_color": "Matte Black",
        "sku_composition": "18/8 Double-Wall Stainless Steel",
        "sku_length": "3.2",
        "sku_width": "3.2",
        "sku_height": "6.8",
        "sku_weight": "0.75",
        "image_url": "",
        "remark": "Pack of 1",
        "cost": 5.4,
        "sku_relation_type": "C",
        "sku_size": "16oz",
        "sku_volume": "16oz",
        "sku_description": "Vacuum insulated travel mug with spill-resistant slider lid.",
    },
    {
        "sku": "STAND-ALUM-09",
        "title": "ErgoLift Aluminum Laptop Stand - 6-Angle Adjustable Portable Notebook Riser",
        "brand": "ErgoLift",
        "sku_category": "Office Products > Computer Accessories > Laptop Stands",
        "sku_color": "Space Gray",
        "sku_composition": "6000-Series Aerospace Grade Aluminum",
        "sku_length": "9.8",
        "sku_width": "8.5",
        "sku_height": "1.2",
        "sku_weight": "1.4",
        "image_url": "",
        "remark": "Pack of 1",
        "cost": 8.2,
        "sku_relation_type": "C",
        "sku_size": "Portable",
        "sku_style_code": "6-angle",
        "sku_description": "Foldable adjustable laptop stand with airflow cutouts.",
    },
    {
        "sku": "CHARGER-GAN-65",
        "title": "Veloce 65W GaN Charger - Ultra-Compact Dual USB-C Fast Charger Block",
        "brand": "Veloce",
        "sku_category": "Cell Phones & Accessories > Chargers & Power Adapters",
        "sku_color": "Arctic White",
        "sku_composition": "Fireproof Polycarbonate (V0 Rating)",
        "sku_length": "2.1",
        "sku_width": "1.5",
        "sku_height": "1.5",
        "sku_weight": "0.32",
        "image_url": "",
        "remark": "Pack of 1",
        "cost": 6.1,
        "sku_relation_type": "C",
        "sku_size": "65W",
        "sku_style_code": "Dual USB-C",
        "sku_description": "Compact GaN wall charger with dual USB-C ports.",
    },
    {
        "sku": "MAT-ECO-02",
        "title": "ZenFlow 6mm Eco-Friendly TPE Gym Yoga Mat - Non-Slip Dual Texture Alignment Lines",
        "brand": "ZenFlow",
        "sku_category": "Sports & Outdoors > Exercise & Fitness > Yoga Mats",
        "sku_color": "Forest Green",
        "sku_composition": "Thermoplastic Elastomer (TPE)",
        "sku_length": "72",
        "sku_width": "24",
        "sku_height": "0.24",
        "sku_weight": "1.9",
        "image_url": "",
        "remark": "Pack of 1",
        "cost": 7.8,
        "sku_relation_type": "C",
        "sku_size": "6mm",
        "sku_description": "Eco-friendly TPE yoga mat with alignment guide lines.",
    },
]


def parse_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"-?\d+(?:\.\d+)?", str(value))
    return float(match.group(0)) if match else None


def parse_pack_count(remark: Any) -> int:
    text = str(remark or "")
    patterns = [r"pack\s*of\s*(\d+)", r"(\d+)\s*[- ]?\s*pack", r"(\d+)\s*件", r"(\d+)\s*pcs"]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return max(1, int(match.group(1)))
    return 1


def parse_pack_count(remark: Any) -> int:
    text = str(remark or "")
    patterns = [
        r"pack\s*of\s*(\d+)",
        r"(\d+)\s*[- ]?\s*pack",
        r"(\d+)\s*(?:件装|个装|件套|个套|只装|支装|片装)",
        r"(\d+)\s*pcs",
        r"(\d+)\s*pieces?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return max(1, int(match.group(1)))
    return 1


def normalize_product(row: dict[str, Any], source: str) -> Product:
    row = json_safe(row)
    length = parse_number(row.get("sku_length"))
    width = parse_number(row.get("sku_width"))
    height = parse_number(row.get("sku_height"))
    weight = parse_number(row.get("sku_weight"))
    normalized = {
        "sku": row.get("sku") or "",
        "title": row.get("title") or "",
        "brand": row.get("brand") or "",
        "category": row.get("sku_category") or "",
        "color": row.get("sku_color") or "",
        "material": row.get("sku_composition") or "",
        "dimensions": {"length": length, "width": width, "height": height, "unit": "in"},
        "weight": {"value": weight, "unit": "lb"},
        "unitCount": parse_pack_count(row.get("remark")),
        "variation": {
            "relationType": row.get("sku_relation_type"),
            "size": row.get("sku_size"),
            "volume": row.get("sku_volume"),
            "scent": row.get("sku_scent"),
            "flavour": row.get("sku_flavour"),
            "styleCode": row.get("sku_style_code"),
            "variance": row.get("sku_variance"),
        },
    }
    missing = []
    for label, value in [
        ("brand", normalized["brand"]),
        ("category", normalized["category"]),
        ("color", normalized["color"]),
        ("material", normalized["material"]),
        ("length", length),
        ("width", width),
        ("height", height),
        ("weight", weight),
        ("image", row.get("image_url")),
        ("title", normalized["title"]),
    ]:
        if value in (None, "", 0):
            missing.append(label)
    warnings = []
    if source == "demo":
        warnings.append("Demo product: live SSB MySQL was unavailable or DEMO_MODE is enabled.")
    return Product(
        sku=str(row.get("sku") or ""),
        title=str(row.get("title") or ""),
        brand=str(row.get("brand") or ""),
        category=str(row.get("sku_category") or ""),
        color=str(row.get("sku_color") or ""),
        material=str(row.get("sku_composition") or ""),
        dimensions=Dimensions(length=length, width=width, height=height),
        weight=Weight(value=weight),
        image=str(row.get("image_url") or ""),
        normalizedJson=json.dumps(normalized, indent=2),
        rawFields=row,
        missingFields=missing,
        unitCount=normalized["unitCount"],
        source=source,  # type: ignore[arg-type]
        warnings=warnings,
    )


class ProductRepository:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._schema_name: str | None = settings.ssb_db_name or None
        self.last_error: str | None = None

    def configured(self) -> bool:
        return self.settings.db_configured and not self.settings.demo_mode

    def _connect(self, database: str | None = None):
        if pymysql is None or DictCursor is None:
            raise RuntimeError("pymysql is not installed; using demo product repository fallback")
        return pymysql.connect(
            host=self.settings.ssb_db_host,
            port=self.settings.ssb_db_port,
            user=self.settings.ssb_db_user,
            password=self.settings.ssb_db_password,
            database=database,
            charset=self.settings.ssb_db_charset,
            cursorclass=DictCursor,
            connect_timeout=5,
            read_timeout=10,
            write_timeout=10,
        )

    def _schema(self) -> str | None:
        if self._schema_name:
            return self._schema_name
        if not self.configured():
            return None
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT table_schema FROM information_schema.tables
                        WHERE table_name='fbm_sku'
                        ORDER BY table_schema LIMIT 1
                        """
                    )
                    row = cur.fetchone()
                    self._schema_name = row["table_schema"] if row else None
                    return self._schema_name
        except Exception as exc:  # noqa: BLE001
            self.last_error = str(exc)
            return None

    def db_reachable(self) -> bool:
        if not self.configured():
            return False
        return self._schema() is not None

    def schema_snapshot(self) -> dict[str, Any]:
        schema = self._schema()
        if not schema:
            return {
                "dialect": "mysql",
                "source": "demo",
                "tables": [{"name": "fbm_sku", "columns": list(DEMO_PRODUCTS[0].keys())}],
                "error": self.last_error,
            }
        try:
            with self._connect(schema) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT column_name, data_type FROM information_schema.columns
                        WHERE table_schema=%s AND table_name='fbm_sku'
                        ORDER BY ordinal_position
                        """,
                        (schema,),
                    )
                    cols = cur.fetchall()
            return {"dialect": "mysql", "source": "ssb_mysql", "schema": schema, "tables": [{"name": "fbm_sku", "columns": cols}]}
        except Exception as exc:  # noqa: BLE001
            self.last_error = str(exc)
            return {"dialect": "mysql", "source": "demo", "tables": [], "error": self.last_error}

    def list_products(self, q: str = "", brand: str = "", category: str = "", limit: int = 50, cursor: str | None = None) -> list[Product]:
        schema = self._schema()
        if not schema:
            return self._demo_products(q, brand, category, limit)
        safe_limit = min(max(limit, 1), 200)
        where = []
        params: list[Any] = []
        if q:
            where.append("(sku LIKE %s OR title LIKE %s)")
            params.extend([f"%{q}%", f"%{q}%"])
        if brand:
            where.append("brand=%s")
            params.append(brand)
        if category:
            where.append("sku_category LIKE %s")
            params.append(f"{category}%")
        if cursor:
            where.append("sku > %s")
            params.append(cursor)
        sql = "SELECT * FROM fbm_sku"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY sku LIMIT %s"
        params.append(safe_limit)
        try:
            with self._connect(schema) as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, tuple(params))
                    rows = cur.fetchall()
            return [normalize_product(r, "ssb_mysql") for r in rows]
        except Exception as exc:  # noqa: BLE001
            self.last_error = str(exc)
            return self._demo_products(q, brand, category, limit)

    def get_product(self, sku: str) -> Product | None:
        schema = self._schema()
        if not schema:
            return self._demo_product(sku)
        try:
            with self._connect(schema) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM fbm_sku WHERE sku=%s LIMIT 1", (sku,))
                    row = cur.fetchone()
            return normalize_product(row, "ssb_mysql") if row else self._demo_product(sku)
        except Exception as exc:  # noqa: BLE001
            self.last_error = str(exc)
            return self._demo_product(sku)

    def get_products_by_skus(self, skus: list[str]) -> dict[str, Product]:
        unique_skus = list(dict.fromkeys([sku for sku in skus if sku]))
        if not unique_skus:
            return {}
        schema = self._schema()
        if not schema:
            return {sku: product for sku in unique_skus if (product := self._demo_product(sku))}
        placeholders = ",".join(["%s"] * len(unique_skus))
        try:
            with self._connect(schema) as conn:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT * FROM fbm_sku WHERE sku IN ({placeholders})", tuple(unique_skus))
                    rows = cur.fetchall()
            products = {p.sku: p for p in [normalize_product(row, "ssb_mysql") for row in rows]}
            for sku in unique_skus:
                if sku not in products:
                    demo_product = self._demo_product(sku)
                    if demo_product:
                        products[sku] = demo_product
            return products
        except Exception as exc:  # noqa: BLE001
            self.last_error = str(exc)
            return {sku: product for sku in unique_skus if (product := self._demo_product(sku))}

    def _demo_products(self, q: str = "", brand: str = "", category: str = "", limit: int = 50) -> list[Product]:
        rows = DEMO_PRODUCTS
        if q:
            ql = q.lower()
            rows = [r for r in rows if ql in str(r.get("sku", "")).lower() or ql in str(r.get("title", "")).lower()]
        if brand:
            rows = [r for r in rows if r.get("brand") == brand]
        if category:
            rows = [r for r in rows if str(r.get("sku_category", "")).startswith(category)]
        return [normalize_product(r, "demo") for r in rows[:limit]]

    def _demo_product(self, sku: str) -> Product | None:
        row = next((r for r in DEMO_PRODUCTS if r["sku"] == sku), None)
        return normalize_product(row, "demo") if row else None
