# SSB Listing Studio

SSB Listing Studio is a Docker-runnable agentic Amazon listing generation prototype. It reads SKU data from the SSB catalog, enriches product facts with citations, runs a multi-agent workflow, generates Amazon A+ style listings and images, supports conversational multipack/combo recomposition, and exposes trace, review, cost, and evaluation surfaces.

## Quick Start

The app starts without secrets by using deterministic demo providers:

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- API health: http://localhost:8000/api/health

## Configuration

Copy `.env.example` to `.env` and fill live credentials when available. Never commit `.env`.

Important variables:

```env
DEMO_MODE=true
SSB_DB_HOST=
SSB_DB_PORT=3306
SSB_DB_USER=
SSB_DB_PASSWORD=
SSB_DB_NAME=
LLM_API_KEY=
LLM_PROVIDER=deepseek
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
IMAGE_API_KEY=
IMAGE_PROVIDER=agnes
IMAGE_BASE_URL=https://apihub.agnes-ai.com
IMAGE_MODEL=agnes-image-2.1-flash
SEARCH_API_KEY=
SEARCH_PROVIDER=tavily
SEARCH_BASE_URL=https://api.tavily.com
BUDGET_TARGET_RMB=1500
IMAGE_GENERATION_USD=0.003
SEARCH_REQUEST_USD=0.005
```

The original challenge README mentions PostgreSQL, while the provided credential document specifies MySQL on port 3306 with table `fbm_sku`. This implementation follows the provided MySQL source and documents the mismatch in `REPORT.md`.

## Architecture

```text
React/Vite Frontend
  -> FastAPI Backend
      -> read-only MySQL product repository
      -> SQLite app store
      -> local artifacts and samples
      -> LangGraph multi-agent workflow
      -> DeepSeek LLM provider
      -> Agnes Image 2.1 Flash provider
      -> Tavily search provider
      -> compliance / physical consistency / evaluation
```

The listing workflow is implemented as explicit LangGraph nodes:

```text
Supervisor Start -> Product Loader -> Research -> Copy -> Image -> Critic -> Compliance -> Supervisor Finalize
```

The chat workflow is also graph-based:

```text
Recomposition Agent -> Product Resolver -> Physical Recalculator -> Copy/Image/Critic/Compliance -> Finalize
```

## API Overview

```http
GET  /api/health
GET  /api/settings/status
GET  /api/providers/status
POST /api/providers/self-test
GET  /api/schema
GET  /api/jobs
GET  /api/products
GET  /api/products/{sku}
POST /api/enrich/{sku}
POST /api/listings/{sku}
GET  /api/listings/{job_id}
GET  /api/listings/{job_id}/events
GET  /api/traces/{job_id}
GET  /api/artifacts/{job_id}
POST /api/chat
GET  /api/chat/{session_id}
GET  /api/reviews
POST /api/reviews/{review_id}/approve
POST /api/reviews/{review_id}/reject
POST /api/reviews/{review_id}/request-revision
GET  /api/costs/summary
GET  /api/costs/jobs/{job_id}
POST /api/evals/run
GET  /api/evals/{eval_id}
GET  /api/variations
GET  /api/variations/{sku}
```

## Frontend Pages

- Dashboard: jobs, budget, compliance overview
- Products: SKU table, normalized JSON, raw fields, enrich/generate actions
- Listing Studio: multi-agent generation, copy, images, A+ modules
- Agent Trace: tool calls, tokens, latency, cost per agent
- Agent Trace: job-based trace inspection plus SSE replay endpoint
- Chat Recomposer: English and Chinese multipack/combo generation
- Review / Diff: human review, compliance report, physical consistency report
- Costs & Eval: 1500 RMB budget, simulated/estimated agent costs, evaluation harness
- Settings: provider status without exposing secrets

## Security

- The SSB database is read-only.
- No API keys, database passwords, or `.env` files are committed.
- Generated outputs are stored locally in SQLite, `artifacts/`, and `samples/`.
- Missing keys do not crash the service; key-dependent workflows use clearly marked demo providers.
- Live mode defaults to DeepSeek for chat completions, Agnes Image 2.1 Flash for image generation, and Tavily for cited web search when credentials are supplied. These are defaults only: Settings and Costs read provider/model values from the backend `.env` / Docker environment, so switching to another configured model such as a GPT model will be reflected after the API service restarts.
- Cost tracking keeps provider prices configurable; the default image unit price is `IMAGE_GENERATION_USD=0.003` for Agnes.

## Verification

```bash
python -m pytest api

cd ssb-listing-studio
npm run lint
npm run build
cd ..
docker compose config
```

On this workstation, `docker compose config` parses correctly while Docker emits a local permission warning for `C:\Users\MR\.docker\config.json`. That warning is outside the project compose file.

## Demo Walkthrough

1. Start with Docker.
2. Check Settings for DB/LLM/Image/Search status.
3. Open Products and inspect normalized JSON/raw fields.
4. Run Enrich and inspect cited fields.
5. Generate a Listing.
6. Open Agent Trace.
7. Use Chat: `Make this a 3-pack` or `把这个 SKU 做成 3 件装`.
8. Use Chat: `Combine this with SKU STAND-ALUM-09`.
9. Review the generated diff.
10. Open Costs & Eval for budget and scoring.
