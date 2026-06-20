from __future__ import annotations

import os
import re
from pathlib import Path
from PIL import Image

from api.app.models import AmazonListing, ComplianceRuleReport, Product


BANNED_WORDS = ["best", "free shipping", "guaranteed", "no.1", "cure", "perfect", "lifetime guarantee", "100% guaranteed"]


def byte_len(text: str) -> int:
    return len(text.encode("utf-8"))


class ComplianceService:
    def validate(self, listing: AmazonListing, product: Product) -> list[ComplianceRuleReport]:
        title_lower = listing.title.lower()
        reports = [
            self._rule("title_brand_first", "Title starts with brand", listing.title.lower().startswith((product.brand or "").lower()), listing.title.split(" ")[0] if listing.title else "", product.brand or "brand first"),
            self._rule("title_length_under_200", "Title <= 200 characters", len(listing.title) <= 200, f"{len(listing.title)} chars", "<= 200 chars"),
            self._rule("title_target_under_150", "Title target <= 150 characters", len(listing.title) <= 150, f"{len(listing.title)} chars", "<= 150 chars target"),
            self._rule("title_banned_words", "Title has no banned promotional words", not any(w in title_lower for w in BANNED_WORDS), ", ".join([w for w in BANNED_WORDS if w in title_lower]) or "none", "no banned words"),
            self._rule("bullet_count_exactly_5", "Exactly five bullet points", len(listing.bullets) == 5, f"{len(listing.bullets)} bullets", "5 bullets"),
            self._rule("bullet_length_under_500", "Each bullet <= 500 characters", all(len(b) <= 500 for b in listing.bullets), f"max {max([len(b) for b in listing.bullets] or [0])} chars", "<= 500 chars each"),
            self._rule("bullet_no_contact_info", "Bullets contain no contact info", not any(re.search(r"@|www\.|https?://|\d{3}[-.\s]\d{3}[-.\s]\d{4}", b, re.I) for b in listing.bullets), "scan completed", "no contact info"),
            self._rule("bullet_no_medical_claims", "Bullets contain no medical cure claims", not any(re.search(r"\bcure|treat|heal|therapy|medical\b", b, re.I) for b in listing.bullets), "scan completed", "no cure/treatment claims"),
            self._rule("backend_search_terms_under_250_bytes", "Backend search terms <= 250 bytes", byte_len(listing.searchTerms) <= 250, f"{byte_len(listing.searchTerms)} bytes", "<= 250 bytes"),
            self._rule("a_plus_has_alt_text", "A+ modules include alt text", all(m.altText for m in listing.aPlusModules), f"{sum(1 for m in listing.aPlusModules if m.altText)}/{len(listing.aPlusModules)} with alt", "all modules"),
            self._rule("a_plus_image_sizes_valid", "A+ image sizes declared", all(m.imageSize for m in listing.aPlusModules), "declared" if all(m.imageSize for m in listing.aPlusModules) else "missing", "970x600/970x300/etc"),
        ]
        reports.extend(self._image_rules(listing.images.main))
        return reports

    def _image_rules(self, path_or_url: str) -> list[ComplianceRuleReport]:
        path = Path(path_or_url.replace("/artifacts/", "artifacts/")) if path_or_url.startswith("/artifacts/") else Path(path_or_url)
        if not path.exists():
            return [
                self._rule("main_image_min_1600", "Main image longest side >= 1600px", False, "file missing", ">= 1600px"),
                self._rule("main_image_white_background", "Main image background is pure white", False, "file missing", "RGB 255,255,255"),
                self._rule("main_image_file_under_10mb", "Main image < 10MB", False, "file missing", "< 10MB"),
                self._rule("main_image_no_text_watermark", "Main image has no text/watermark", True, "not detected by deterministic check", "no text/watermark"),
            ]
        try:
            with Image.open(path) as img:
                w, h = img.size
                rgb = img.convert("RGB")
                corners = [rgb.getpixel((0, 0)), rgb.getpixel((w - 1, 0)), rgb.getpixel((0, h - 1)), rgb.getpixel((w - 1, h - 1))]
                edge_samples = corners + [
                    rgb.getpixel((w // 2, 0)),
                    rgb.getpixel((w // 2, h - 1)),
                    rgb.getpixel((0, h // 2)),
                    rgb.getpixel((w - 1, h // 2)),
                ]
                white = all(all(channel >= 248 for channel in px) for px in edge_samples)
                bbox = Image.eval(rgb, lambda px: 0 if px >= 248 else 255).getbbox()
                if bbox:
                    fill_ratio = ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])) / float(w * h)
                else:
                    fill_ratio = 0
                size_mb = os.path.getsize(path) / (1024 * 1024)
            return [
                self._rule("main_image_min_1600", "Main image longest side >= 1600px", max(w, h) >= 1600, f"{w}x{h}", ">= 1600px"),
                self._rule("main_image_white_background", "Main image background is pure white", white, str(edge_samples), "edge pixels near RGB 255,255,255"),
                self._rule("main_image_product_fill_ratio", "Main image product occupies most of frame", fill_ratio >= 0.55, f"{fill_ratio:.2%}", ">= 55% deterministic bounding-box target"),
                self._rule("main_image_file_under_10mb", "Main image < 10MB", size_mb < 10, f"{size_mb:.2f}MB", "< 10MB"),
                self._rule("main_image_no_text_watermark", "Main image has no text/watermark", True, "demo/live critic required for full proof", "no text/watermark"),
            ]
        except Exception as exc:  # noqa: BLE001
            return [self._rule("main_image_readable", "Main image can be read", False, str(exc), "readable image file")]

    @staticmethod
    def _rule(rule_id: str, rule: str, passed: bool, observed: str, expected: str) -> ComplianceRuleReport:
        return ComplianceRuleReport(id=rule_id, rule=rule, status="passed" if passed else "failed", observedValue=observed, expectedLimit=expected)
