from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from api.app.config import Settings
from api.app.models import Product
from api.app.providers.image import ImageProvider


class ImageService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.provider = ImageProvider(settings)

    def generate_set(self, job_id: str, product: Product, mode_label: str = "single", unit_count: int = 1, combo_label: str = "") -> dict[str, str]:
        job_dir = Path(self.settings.artifact_dir) / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        main = job_dir / "main.jpg"
        lifestyle = job_dir / "lifestyle.jpg"
        infographic = job_dir / "infographic.jpg"
        aplus = job_dir / "a_plus_hero.jpg"
        specs = [
            (main, 1600, 1600, mode_label, True, "Main Amazon product image on pure white background, no text, no props, product fills most of the frame."),
            (lifestyle, 1200, 900, "lifestyle " + mode_label, False, "Lifestyle product scene that remains faithful to color, material, and unit count."),
            (infographic, 970, 600, "infographic " + mode_label, False, "Amazon infographic image with clean layout, based only on verified specifications."),
            (aplus, 970, 600, "A+ " + mode_label, False, "Amazon A+ hero image showing product features faithfully."),
        ]
        for path, width, height, label, pure_white, prompt_prefix in specs:
            prompt = self._prompt(prompt_prefix, product, mode_label, unit_count, combo_label)
            result = self.provider.generate_to_file(prompt, path, size="1024x1024")
            if result.path and result.path.exists():
                self._normalize_image(result.path, path, width, height, pure_white)
            else:
                self._draw_product_image(path, width, height, product, label, unit_count, combo_label, pure_white=pure_white)
        return {
            "main": f"/artifacts/{job_id}/main.jpg",
            "lifestyle": f"/artifacts/{job_id}/lifestyle.jpg",
            "infographic": f"/artifacts/{job_id}/infographic.jpg",
            "aPlus": f"/artifacts/{job_id}/a_plus_hero.jpg",
        }

    @staticmethod
    def _prompt(prefix: str, product: Product, mode_label: str, unit_count: int, combo_label: str) -> str:
        count_text = f"exactly {unit_count} identical units" if mode_label == "multipack" else "one catalog-faithful unit"
        combo_text = f" show both Product A and Product B together, second SKU {combo_label}" if combo_label else ""
        return (
            f"{prefix} Product SKU {product.sku}. Show {count_text}{combo_text}. "
            f"Color: {product.color or 'unknown'}. Material: {product.material or 'unknown'}. "
            "No unverified certifications, no competitor branding, no misleading scale."
        )

    @staticmethod
    def _normalize_image(src: Path, dest: Path, width: int, height: int, pure_white: bool) -> None:
        bg = (255, 255, 255) if pure_white else (238, 244, 248)
        with Image.open(src) as img:
            img = img.convert("RGB")
            img.thumbnail((int(width * 0.92), int(height * 0.92)))
            canvas = Image.new("RGB", (width, height), bg)
            x = (width - img.width) // 2
            y = (height - img.height) // 2
            canvas.paste(img, (x, y))
            canvas.save(dest, "JPEG", quality=94)

    def _draw_product_image(self, path: Path, width: int, height: int, product: Product, mode_label: str, unit_count: int, combo_label: str, pure_white: bool) -> None:
        bg = (255, 255, 255) if pure_white else (238, 244, 248)
        img = Image.new("RGB", (width, height), bg)
        draw = ImageDraw.Draw(img)
        try:
            font_big = ImageFont.truetype("arial.ttf", max(28, width // 24))
            font_small = ImageFont.truetype("arial.ttf", max(18, width // 45))
        except Exception:
            font_big = ImageFont.load_default()
            font_small = ImageFont.load_default()
        color = self._color(product.color)
        count = max(1, min(unit_count, 12))
        box_w = int(width * (0.58 if pure_white and count == 1 else 0.30 if pure_white else 0.24))
        box_h = int(height * (0.70 if pure_white and count == 1 else 0.66 if pure_white else 0.52))
        gap = int(width * 0.025)
        if count > 4:
            cols = min(4, count)
            rows = (count + cols - 1) // cols
        else:
            cols = count
            rows = 1
        max_area_w = width * (0.92 if pure_white else 0.78)
        max_area_h = height * (0.86 if pure_white else 0.58)
        box_w = min(box_w, int((max_area_w - (cols - 1) * gap) / cols))
        box_h = min(box_h, int((max_area_h - (rows - 1) * gap) / rows))
        start_x = int((width - (cols * box_w + (cols - 1) * gap)) / 2)
        start_y = int((height - (rows * box_h + (rows - 1) * gap)) / 2)
        for i in range(count):
            col = i % cols
            row = i // cols
            x = start_x + col * (box_w + gap)
            y = start_y + row * (box_h + gap)
            draw.rounded_rectangle((x, y, x + box_w, y + box_h), radius=18, fill=color, outline=(20, 37, 69), width=max(3, width // 300))
            draw.rectangle((x + 18, y + 18, x + box_w - 18, y + 45), fill=(255, 255, 255))
        if combo_label:
            draw.rounded_rectangle((int(width * 0.58), int(height * 0.58), int(width * 0.82), int(height * 0.78)), radius=16, fill=(245, 180, 48), outline=(20, 37, 69), width=3)
            draw.text((int(width * 0.60), int(height * 0.64)), combo_label[:24], fill=(20, 37, 69), font=font_small)
        if not pure_white:
            draw.text((40, 36), mode_label.upper(), fill=(11, 37, 69), font=font_big)
            draw.text((40, height - 80), f"{product.sku} | {product.color} | {product.material}", fill=(20, 37, 69), font=font_small)
        img.save(path, "JPEG", quality=94)

    @staticmethod
    def _color(name: str) -> tuple[int, int, int]:
        text = (name or "").lower()
        if "black" in text:
            return (35, 35, 38)
        if "white" in text:
            return (235, 238, 240)
        if "gray" in text or "grey" in text:
            return (128, 134, 143)
        if "green" in text:
            return (44, 105, 77)
        if "blue" in text:
            return (42, 92, 170)
        return (98, 112, 135)
