from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


class AppStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.init()

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def init(self) -> None:
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                  job_id TEXT PRIMARY KEY,
                  sku TEXT,
                  workflow_type TEXT,
                  status TEXT,
                  created_at TEXT,
                  completed_at TEXT,
                  cost_rmb REAL DEFAULT 0,
                  artifact_dir TEXT
                );
                CREATE TABLE IF NOT EXISTS traces (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  job_id TEXT,
                  step_index INTEGER,
                  agent_name TEXT,
                  input_summary TEXT,
                  tool_calls_json TEXT,
                  output_artifact TEXT,
                  latency_ms INTEGER,
                  input_tokens INTEGER,
                  output_tokens INTEGER,
                  estimated_cost_usd REAL,
                  prompt_snippet TEXT,
                  warnings_or_errors TEXT
                );
                CREATE TABLE IF NOT EXISTS listings (
                  job_id TEXT PRIMARY KEY,
                  sku TEXT,
                  workflow_type TEXT,
                  listing_json TEXT,
                  compliance_json TEXT,
                  physical_consistency_json TEXT,
                  status TEXT
                );
                CREATE TABLE IF NOT EXISTS enrichment_cache (
                  cache_key TEXT PRIMARY KEY,
                  sku TEXT,
                  payload_json TEXT,
                  created_at TEXT,
                  expires_at TEXT
                );
                CREATE TABLE IF NOT EXISTS cost_ledger (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  job_id TEXT,
                  agent_name TEXT,
                  provider TEXT,
                  model TEXT,
                  input_tokens INTEGER DEFAULT 0,
                  cached_input_tokens INTEGER DEFAULT 0,
                  output_tokens INTEGER DEFAULT 0,
                  image_count INTEGER DEFAULT 0,
                  search_count INTEGER DEFAULT 0,
                  latency_ms INTEGER DEFAULT 0,
                  estimated_usd REAL DEFAULT 0,
                  estimated_rmb REAL DEFAULT 0,
                  created_at TEXT
                );
                CREATE TABLE IF NOT EXISTS reviews (
                  review_id TEXT PRIMARY KEY,
                  job_id TEXT,
                  sku TEXT,
                  workflow_type TEXT,
                  status TEXT,
                  revision_notes TEXT,
                  created_at TEXT
                );
                CREATE TABLE IF NOT EXISTS chat_sessions (
                  session_id TEXT PRIMARY KEY,
                  current_sku TEXT,
                  history_json TEXT,
                  last_job_id TEXT
                );
                CREATE TABLE IF NOT EXISTS eval_runs (
                  eval_id TEXT PRIMARY KEY,
                  selected_skus_json TEXT,
                  result_json TEXT,
                  created_at TEXT
                );
                CREATE TABLE IF NOT EXISTS schema_snapshots (
                  id INTEGER PRIMARY KEY CHECK (id = 1),
                  payload_json TEXT,
                  updated_at TEXT
                );
                """
            )

    def upsert_schema(self, payload: dict[str, Any]) -> None:
        with self.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO schema_snapshots (id, payload_json, updated_at) VALUES (1, ?, ?)",
                (json.dumps(payload), datetime.utcnow().isoformat()),
            )

    def get_schema(self) -> dict[str, Any]:
        with self.connect() as conn:
            row = conn.execute("SELECT payload_json, updated_at FROM schema_snapshots WHERE id = 1").fetchone()
        if not row:
            return {"tables": [], "updatedAt": None}
        payload = json.loads(row["payload_json"])
        payload["updatedAt"] = row["updated_at"]
        return payload

    def create_job(self, job_id: str, sku: str, workflow_type: str, artifact_dir: str) -> None:
        now = datetime.utcnow().isoformat()
        with self.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (job_id, sku, workflow_type, "running", now, None, 0.0, artifact_dir),
            )

    def complete_job(self, job_id: str, status: str = "completed") -> None:
        with self.connect() as conn:
            total = conn.execute("SELECT COALESCE(SUM(estimated_rmb), 0) AS total FROM cost_ledger WHERE job_id=?", (job_id,)).fetchone()["total"]
            conn.execute(
                "UPDATE jobs SET status=?, completed_at=?, cost_rmb=? WHERE job_id=?",
                (status, datetime.utcnow().isoformat(), total, job_id),
            )

    def list_jobs(self, limit: int = 50) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def add_trace_steps(self, job_id: str, steps: list[dict[str, Any]]) -> None:
        with self.connect() as conn:
            conn.execute("DELETE FROM traces WHERE job_id=?", (job_id,))
            for idx, step in enumerate(steps):
                conn.execute(
                    """
                    INSERT INTO traces (
                      job_id, step_index, agent_name, input_summary, tool_calls_json, output_artifact,
                      latency_ms, input_tokens, output_tokens, estimated_cost_usd, prompt_snippet, warnings_or_errors
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        job_id,
                        idx,
                        step.get("agentName"),
                        step.get("inputSummary"),
                        json.dumps(step.get("toolCalls", [])),
                        step.get("outputArtifact"),
                        step.get("latencyMs", 0),
                        step.get("inputTokens", 0),
                        step.get("outputTokens", 0),
                        step.get("estimatedCostUsd", 0),
                        step.get("promptSnippet", ""),
                        step.get("warningsOrErrors"),
                    ),
                )

    def get_trace(self, job_id: str) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute("SELECT * FROM traces WHERE job_id=? ORDER BY step_index", (job_id,)).fetchall()
        steps = []
        for row in rows:
            steps.append(
                {
                    "agentName": row["agent_name"],
                    "inputSummary": row["input_summary"],
                    "toolCalls": json.loads(row["tool_calls_json"] or "[]"),
                    "outputArtifact": row["output_artifact"],
                    "latencyMs": row["latency_ms"],
                    "inputTokens": row["input_tokens"],
                    "outputTokens": row["output_tokens"],
                    "estimatedCostUsd": row["estimated_cost_usd"],
                    "promptSnippet": row["prompt_snippet"],
                    "warningsOrErrors": row["warnings_or_errors"],
                }
            )
        return steps

    def save_listing(self, job_id: str, sku: str, workflow_type: str, listing: dict[str, Any], compliance: list[dict[str, Any]], physical: dict[str, Any]) -> None:
        with self.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO listings VALUES (?, ?, ?, ?, ?, ?, ?)",
                (job_id, sku, workflow_type, json.dumps(listing), json.dumps(compliance), json.dumps(physical), "generated"),
            )

    def get_listing(self, job_id: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM listings WHERE job_id=?", (job_id,)).fetchone()
        if not row:
            return None
        return {
            "jobId": row["job_id"],
            "sku": row["sku"],
            "workflowType": row["workflow_type"],
            "listing": json.loads(row["listing_json"]),
            "complianceReport": json.loads(row["compliance_json"]),
            "physicalConsistency": json.loads(row["physical_consistency_json"]),
        }

    def latest_listing_for_sku(self, sku: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT l.* FROM listings l JOIN jobs j ON l.job_id=j.job_id
                WHERE l.sku=? ORDER BY j.created_at DESC LIMIT 1
                """,
                (sku,),
            ).fetchone()
        if not row:
            return None
        return {
            "jobId": row["job_id"],
            "sku": row["sku"],
            "workflowType": row["workflow_type"],
            "listing": json.loads(row["listing_json"]),
            "complianceReport": json.loads(row["compliance_json"]),
            "physicalConsistency": json.loads(row["physical_consistency_json"]),
        }

    def get_cache(self, key: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM enrichment_cache WHERE cache_key=?", (key,)).fetchone()
        if not row:
            return None
        if datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
            return None
        return json.loads(row["payload_json"])

    def set_cache(self, key: str, sku: str, payload: dict[str, Any], ttl_hours: int) -> None:
        now = datetime.utcnow()
        with self.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO enrichment_cache VALUES (?, ?, ?, ?, ?)",
                (key, sku, json.dumps(payload), now.isoformat(), (now + timedelta(hours=ttl_hours)).isoformat()),
            )

    def add_cost(self, row: dict[str, Any]) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO cost_ledger (
                  job_id, agent_name, provider, model, input_tokens, cached_input_tokens,
                  output_tokens, image_count, search_count, latency_ms, estimated_usd, estimated_rmb, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row.get("job_id"),
                    row.get("agent_name"),
                    row.get("provider"),
                    row.get("model"),
                    row.get("input_tokens", 0),
                    row.get("cached_input_tokens", 0),
                    row.get("output_tokens", 0),
                    row.get("image_count", 0),
                    row.get("search_count", 0),
                    row.get("latency_ms", 0),
                    row.get("estimated_usd", 0),
                    row.get("estimated_rmb", 0),
                    datetime.utcnow().isoformat(),
                ),
            )

    def cost_rows(self) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute("SELECT * FROM cost_ledger ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

    def create_review(self, review_id: str, job_id: str, sku: str, workflow_type: str) -> None:
        with self.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?)",
                (review_id, job_id, sku, workflow_type, "pending", None, datetime.utcnow().isoformat()),
            )

    def update_review_status(self, review_id: str, status: str, notes: str | None = None) -> None:
        with self.connect() as conn:
            conn.execute("UPDATE reviews SET status=?, revision_notes=? WHERE review_id=?", (status, notes, review_id))

    def list_reviews(self) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute("SELECT * FROM reviews ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

    def save_chat(self, session_id: str, current_sku: str, history: list[dict[str, Any]], last_job_id: str | None) -> None:
        with self.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO chat_sessions VALUES (?, ?, ?, ?)",
                (session_id, current_sku, json.dumps(history), last_job_id),
            )

    def get_chat(self, session_id: str) -> dict[str, Any]:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM chat_sessions WHERE session_id=?", (session_id,)).fetchone()
        if not row:
            return {"sessionId": session_id, "history": [], "lastJobId": None}
        return {"sessionId": row["session_id"], "currentSku": row["current_sku"], "history": json.loads(row["history_json"]), "lastJobId": row["last_job_id"]}

    def save_eval(self, eval_id: str, skus: list[str], result: dict[str, Any]) -> None:
        with self.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO eval_runs VALUES (?, ?, ?, ?)",
                (eval_id, json.dumps(skus), json.dumps(result), datetime.utcnow().isoformat()),
            )

    def get_eval(self, eval_id: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM eval_runs WHERE eval_id=?", (eval_id,)).fetchone()
        return json.loads(row["result_json"]) if row else None
