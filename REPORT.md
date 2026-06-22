# SSB Listing Studio Report

## 1. Executive Summary

SSB Listing Studio is an agentic Amazon listing generation prototype. It reads SKU data from the provided SSB catalog, enriches product facts with cited research, runs a multi-agent workflow, generates Amazon A+ listing content and images, validates compliance and physical consistency, supports chat-based multipack/combo recomposition, and records trace/cost/review/evaluation artifacts.

The system is intentionally reproducible without secrets: when live API keys or the SSB database are not configured, deterministic demo providers keep the full workflow runnable while clearly marking fallback mode.

## 2. Architecture

```mermaid
flowchart TD
    UI["React / Vite Frontend"] --> API["FastAPI Backend"]
    API --> Repo["Read-only Product Repository"]
    Repo --> MySQL["SSB MySQL fbm_sku"]
    API --> Store["SQLite App Store"]
    API --> Artifacts["Local Artifacts / Samples"]
    API --> Graph["LangGraph Agent Workflow"]
    Graph --> Research["Research Agent"]
    Graph --> Copy["Copy Agent"]
    Graph --> Image["Image Agent"]
    Graph --> Critic["Critic Agent"]
    Graph --> Compliance["Compliance Agent"]
    Graph --> Supervisor["Supervisor"]
    Research --> Search["Search Provider"]
    Copy --> LLM["LLM Provider"]
    Image --> Img["Image Provider / Pillow Demo"]
    Critic --> Vision["Vision / Deterministic Critic"]
```

## 3. Data Access and MySQL/PostgreSQL Mismatch

The challenge README mentions PostgreSQL, while the provided credential document specifies MySQL on port 3306 and a core table named `fbm_sku`. I implemented the runtime adapter against the provided MySQL source and documented the mismatch instead of asking for clarification.

The SSB database is treated as read-only. Generated listings, traces, cost records, review state, cache, samples, and images are stored locally in SQLite and `artifacts/`, never written back to SSB.

## 4. Agent Design

The listing workflow is implemented as an explicit LangGraph `StateGraph`, not a single mega prompt. The compiled graph passes a typed state through these nodes:

```text
supervisor_start
-> product_loader
-> research
-> copy
-> image
-> critic
-> compliance
-> supervisor_finalize
```

The chat recomposition path also uses a separate graph:

```text
recomposition_agent
-> product_resolver
-> physical_recalculator
-> copy_image_critic_compliance
-> finalize
```

The role split is:

- Supervisor: creates job, coordinates workflow, finalizes artifacts.
- Product Loader: reads normalized product data from the read-only repository.
- Research: produces source-cited enrichment fields and conflict/missing-field notes.
- Copy: calls the LLM provider when configured, validates JSON output, and falls back to deterministic safe copy if the output violates brand-first/title/bullet rules.
- Image: creates image prompts, attempts the image provider in live mode, and falls back to Pillow demo images when no image key is available.
- Critic: checks image/copy vs. physical attributes.
- Compliance: runs Amazon A+ and listing validators.
- Recomposition: parses natural language chat requests into multipack/combo workflows.

Each step records trace entries with tool calls, latency, token estimates, cost estimates, warnings, and intermediate artifacts. Trace inspection is job-based in the frontend, so multiple generations for the same SKU remain separately auditable. The API also exposes `GET /api/listings/{job_id}/events` as a `text/event-stream` replay endpoint for agent-step streaming.

## 4.1 Provider Modes

Providers are isolated behind adapters:

- `LLMProvider`: DeepSeek live mode through OpenAI-compatible `/chat/completions` with `LLM_BASE_URL=https://api.deepseek.com` and `LLM_MODEL=deepseek-v4-flash`; usage is parsed for the cost ledger, with deterministic fallback when not configured.
- `SearchProvider`: Tavily live search through `/search`; enrichment citations are parsed from Tavily `results[].url`, with cited demo fallback when not configured. The adapter still keeps a SerpAPI branch for reviewer substitution if needed.
- `ImageProvider`: Agnes Image 2.1 Flash live image generation through `https://apihub.agnes-ai.com/v1/images/generations`. The Agnes adapter uses `return_base64=true` for text-to-image output and saves images into local artifacts. Pillow fallback is used when no image key is available.

Demo mode is explicit. Demo citations and demo images are marked as demo/fallback behavior and are not presented as real marketplace research or real commercial photography.

Provider readiness is exposed through `/api/providers/status` and `/api/providers/self-test`. These endpoints report configured/missing/demo status and never return secret values.

## 5. Prompt Iteration

Prompts are stored under `api/app/prompts/` and separated by role. The main design change was moving from one broad generation instruction to narrow role contracts with structured JSON outputs, source requirements, and explicit "do not fabricate physical specs" rules.

## 6. Enrichment and Citation Strategy

Enrichment queries four research categories:

- `{title} product specs`
- `{category} amazon listing requirements`
- `{category} common selling points`
- `{material/category} safety certification`

It produces structured fields such as category norms, common selling points, compliance keywords, certifications, pricing signals, and risks. Every enriched field requires a `sourceUrl`, `confidence`, and `notes`.

Database physical fields remain the source of truth. Web research may add context, but conflicting dimensions, weight, material, color, or unit count are retained as conflicts instead of overwriting the SKU record.

## 7. Amazon A+ Compliance Enforcement

The validator checks:

- Brand-first title
- Title length target and hard limit
- Banned promotional / medical language
- Exactly five bullets
- Bullet length
- No contact info
- Backend search terms <= 250 UTF-8 bytes
- A+ alt text and declared image sizes
- Main image size, file size, white background, deterministic product-fill ratio, and text/watermark risk

The compliance report is saved with each listing and displayed in Review / Diff.

## 8. Physical Consistency Strategy

The system does not claim perfect physical consistency. It uses layered safeguards:

- Product DB attributes drive prompts and copy.
- Multipack/combo workflows recalculate unit count, package weight, and dimensions.
- Generated image metadata and deterministic image checks validate unit count, color, material, and white background.
- The Critic step records mismatches instead of hiding them.
- Human review remains the final gate.

## 9. Multipack and Combo Recomposition

The `/api/chat` workflow supports natural language requests such as "Make this a 3-pack", "把这个 SKU 做成 3 件装", "Combine this with SKU STAND-ALUM-09", and Chinese combo instructions such as "把它和 SKU STAND-ALUM-09 组合".

Multipack recomputes:

- Unit count
- Package weight
- Package dimensions
- Title with `Pack of N`
- Bullets and image prompt

Combo recomputes:

- Combined unit count
- Combined weight
- Combined package dimensions
- Merged title and deduplicated benefits
- Image prompt showing both products

The recomputed weight, dimensions, unit count, source SKUs, and workflow type are written into the generated listing's `physicalAttributes` and sample `diff.json`, so reviewers can inspect the exact before/after physical changes.

## 10. Cost Budget and Actual Spend

Target budget: 1700 RMB.

Planned allocation:

| Area | Budget RMB |
| --- | ---: |
| LLM multi-agent generation | 600 |
| Image generation | 550 |
| Web search / fetch | 150 |
| Vision / Critic / Eval | 200 |
| Retry buffer | 200 |
| Total | 1700 |

Every provider call writes a cost ledger row with input tokens, cached input tokens, output tokens, image count, search count, latency, estimated USD, and estimated RMB. Demo providers still record estimated cost so the budget dashboard remains meaningful.

Current live provider choices:

| Capability | Provider | Model / Endpoint |
| --- | --- | --- |
| LLM | DeepSeek | `deepseek-v4-flash` at `https://api.deepseek.com` |
| Image generation | Agnes | `agnes-image-2.1-flash` at `https://apihub.agnes-ai.com/v1/images/generations` |
| Search | Tavily | `https://api.tavily.com/search` |
| Product data | SSB MySQL | read-only `fbm_sku` via the provided database access document |

Provider unit prices are configurable through `.env`. The default image generation unit price is `IMAGE_GENERATION_USD=0.003`, matching the Agnes Image 2.1 Flash pricing note supplied for this project.

## 11. Observability and Cache

The app stores jobs, traces, listings, enrichment cache, cost ledger, reviews, chat sessions, and eval runs in SQLite. Enrichment cache defaults to 24 hours and reports cache savings in the Costs & Eval page.

## 12. Evaluation Harness

The eval harness scores selected SKUs on:

- Compliance: 40%
- Physical consistency: 35%
- Listing quality: 25%

It writes `samples/eval_report.json` and `samples/eval_report.md`.

## 13. Human Review Gate

Generated listings automatically enter a pending review queue. Reviewers can approve, reject, or request revision. The UI shows side-by-side copy diffs, compliance reports, physical attributes, and physical consistency reports.

## 14. AI Tool Usage

AI assistance was used for scaffolding, prompt drafting, implementation planning, and repetitive code generation. Engineering decisions, data mapping, compliance rules, safety constraints, and final integration checks were reviewed and adjusted to match the challenge requirements.

## 15. Verification Records

Executed verification commands:

```bash
python -m pytest api
cd ssb-listing-studio
npm run lint
npm run build
cd ..
docker compose config
```

Results:

- `python -m pytest api`: 11 passed.
- `npm run lint`: TypeScript check passed.
- `npm run build`: Vite production build passed.
- `docker compose config`: project compose parsed successfully.

Note: Docker emitted a local permission warning for `C:\Users\MR\.docker\config.json`. The compose file itself parsed correctly; the warning is a workstation Docker config permission issue.

The service starts without live keys. Missing live providers are reported in Settings and API responses.

## 16. Limitations and Future Work

- Live DeepSeek/Agnes/Tavily provider calls are implemented through adapters, but deterministic demo providers are used when keys are missing.
- Physical image consistency is validated through deterministic metadata and image checks in demo mode; live mode should use a multimodal critic.
- Pricing suggestions are conservative and should be enriched with marketplace pricing data before business use.
- Real Amazon publishing is out of scope; the system produces reviewable A+ content objects and assets.
