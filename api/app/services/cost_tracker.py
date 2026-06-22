from __future__ import annotations

from collections import defaultdict
from typing import Any

from api.app.config import Settings
from api.app.db.app_store import AppStore
from api.app.models import CostSummary


class CostTracker:
    def __init__(self, settings: Settings, store: AppStore):
        self.settings = settings
        self.store = store

    def record(
        self,
        job_id: str,
        agent_name: str,
        provider: str,
        model: str,
        input_tokens: int = 0,
        cached_input_tokens: int = 0,
        output_tokens: int = 0,
        image_count: int = 0,
        search_count: int = 0,
        latency_ms: int = 0,
        estimated_usd: float | None = None,
    ) -> float:
        if estimated_usd is None:
            estimated_usd = self.estimate_usd(input_tokens, output_tokens, image_count, search_count)
        estimated_rmb = estimated_usd * self.settings.usd_to_rmb
        self.store.add_cost(
            {
                "job_id": job_id,
                "agent_name": agent_name,
                "provider": provider,
                "model": model,
                "input_tokens": input_tokens,
                "cached_input_tokens": cached_input_tokens,
                "output_tokens": output_tokens,
                "image_count": image_count,
                "search_count": search_count,
                "latency_ms": latency_ms,
                "estimated_usd": estimated_usd,
                "estimated_rmb": estimated_rmb,
            }
        )
        return estimated_usd

    def estimate_usd(self, input_tokens: int, output_tokens: int, image_count: int, search_count: int) -> float:
        return (
            (input_tokens / 1_000_000 * self.settings.llm_input_usd_per_million)
            + (output_tokens / 1_000_000 * self.settings.llm_output_usd_per_million)
            + (image_count * self.settings.image_generation_usd)
            + (search_count * self.settings.search_request_usd)
        )

    def summary(self) -> CostSummary:
        rows = self.store.cost_rows()
        spent = sum(float(r["estimated_rmb"] or 0) for r in rows)
        input_tokens = sum(int(r["input_tokens"] or 0) for r in rows)
        output_tokens = sum(int(r["output_tokens"] or 0) for r in rows)
        cached_tokens = sum(int(r["cached_input_tokens"] or 0) for r in rows)
        images = sum(int(r["image_count"] or 0) for r in rows)
        searches = sum(int(r["search_count"] or 0) for r in rows)
        grouped: dict[str, dict[str, Any]] = defaultdict(lambda: {"name": "", "calls": 0, "tokens": 0, "latencyMs": 0, "costRmb": 0.0})
        for row in rows:
            name = row["agent_name"] or "Unknown"
            g = grouped[name]
            g["name"] = name
            g["calls"] += 1
            g["tokens"] += int(row["input_tokens"] or 0) + int(row["output_tokens"] or 0)
            g["tokens"] += int(row["cached_input_tokens"] or 0)
            g["latencyMs"] += int(row["latency_ms"] or 0)
            g["costRmb"] += float(row["estimated_rmb"] or 0)
        per_agent = []
        for g in grouped.values():
            calls = max(1, g["calls"])
            per_agent.append(
                {
                    "name": g["name"],
                    "calls": g["calls"],
                    "tokens": f"{g['tokens']:,}",
                    "latency": f"{int(g['latencyMs'] / calls)}ms",
                    "costRmb": round(g["costRmb"], 4),
                    "efficiency": "tracked",
                }
            )
        forecast = spent + max(50.0, spent * 0.45) if rows else 610.0
        return CostSummary(
            targetRmb=self.settings.budget_target_rmb,
            spentRmb=round(spent, 4),
            remainingRmb=round(max(0.0, self.settings.budget_target_rmb - spent), 4),
            forecastRmb=round(min(self.settings.budget_target_rmb, forecast), 4),
            llmInputTokens=input_tokens,
            llmOutputTokens=output_tokens,
            imageGenerationsCount=images,
            webSearchesCount=searches,
            retriesCount=0,
            cachedSavingsRmb=round((cached_tokens / 1_000_000 * self.settings.llm_input_usd_per_million) * self.settings.usd_to_rmb + searches * self.settings.search_request_usd * self.settings.usd_to_rmb, 2),
            perAgentCosts=per_agent,
        )
