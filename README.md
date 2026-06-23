# SSB Listing Studio

SSB Listing Studio 是一个可用 Docker 复跑的 Agentic Amazon Listing 系统。它从 SSB SKU 数据源读取商品，做带来源引用的 enrichment，通过多 Agent 工作流生成 Amazon A+ Listing 和图片，支持聊天式 multipack/combo 重组，并提供 trace、review、diff、成本预算和 eval 评分。

## 快速启动

没有数据库、没有 API key 时也能启动。系统会进入 demo provider 模式，使用本地可复跑数据和确定性生成器，方便 reviewer 先完整体验流程。

```bash
docker compose up --build
```

打开：

- 前端：http://localhost:3000
- 后端健康检查：http://localhost:8000/api/health

## 环境变量

复制 `.env.example` 为 `.env`，再填入真实配置。不要提交 `.env`。

```env
DEMO_MODE=true
SSB_DB_HOST=
SSB_DB_PORT=3306
SSB_DB_USER=
SSB_DB_PASSWORD=
SSB_DB_NAME=
LLM_PROVIDER=deepseek
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=
LLM_MODEL=deepseek-v4-flash
IMAGE_PROVIDER=agnes
IMAGE_BASE_URL=https://apihub.agnes-ai.com
IMAGE_API_KEY=
IMAGE_MODEL=agnes-image-2.1-flash
SEARCH_PROVIDER=tavily
SEARCH_BASE_URL=https://api.tavily.com
SEARCH_API_KEY=
BUDGET_TARGET_RMB=1500
IMAGE_GENERATION_USD=0.003
SEARCH_REQUEST_USD=0.005
```

题目 README 提到 PostgreSQL，但提供的数据库凭证文档写的是 MySQL、端口 3306、核心表 `fbm_sku`。本项目按凭证文档实现 MySQL read-only adapter，并在 [REPORT.md](./REPORT.md) 说明这个冲突。

## 系统架构

```text
React / Vite Frontend
  -> FastAPI Backend
      -> Read-only MySQL Product Repository
      -> SQLite App Store
      -> Local artifacts/ and samples/
      -> LangGraph Agent Workflow
      -> LLM / Image / Search Providers
      -> Compliance / Physical Consistency / Eval
```

SSB 数据库只读。所有生成内容、trace、review、cost ledger、eval 结果都写入本地 SQLite、`artifacts/` 和 `samples/`。

## Agent 工作流

Listing workflow 使用显式 LangGraph 节点：

```text
Supervisor Start
-> Product Loader
-> Research
-> Copy
-> Image
-> Critic
-> Compliance
-> Supervisor Finalize
```

Chat recomposition 也使用图编排：

```text
Recomposition Agent
-> Product Resolver
-> Physical Recalculator
-> Copy/Image/Critic/Compliance
-> Finalize
```

每个节点都会记录 trace：输入摘要、tool calls、latency、tokens、estimated cost、warning 和中间产物。`GET /api/listings/{job_id}/events` 返回 `text/event-stream`，可以流式回放 agent step。

## Provider 模式

- Live mode 默认配置为 DeepSeek LLM、Agnes Image 2.1 Flash 图片生成、Tavily Search；这些只是默认值，实际页面显示来自后端 `.env` / Docker environment。比如把 `LLM_PROVIDER=openai`、`LLM_MODEL=gpt-...` 后重启 API，Settings 和 Costs 页会显示新的 provider/model。
- DeepSeek 走 OpenAI-compatible `/chat/completions`：`LLM_BASE_URL=https://api.deepseek.com`，`LLM_MODEL=deepseek-v4-flash`。
- Agnes 走 `https://apihub.agnes-ai.com/v1/images/generations`：`IMAGE_MODEL=agnes-image-2.1-flash`，文生图使用 `return_base64=true`，生成结果保存到本地 artifacts。
- Tavily 走 `/search`：`SEARCH_PROVIDER=tavily`，用于 enrichment 的联网搜索和 source URL citations。
- Demo mode：缺少 key 或 `DEMO_MODE=true` 时，系统使用确定性 demo provider，不崩溃，不伪装成真实联网或真实商业图片生成。
- Provider 自检：`GET /api/providers/status` 和 `POST /api/providers/self-test` 返回 DB/LLM/Image/Search 状态，不暴露 secret。
- Settings 页面只显示 configured/missing/demo/read-only 状态，不显示任何密钥值。

## API 列表

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

## 前端页面

- Dashboard：SKU、jobs、pending review、预算和合规概览。
- Products：真实 SKU 或 demo SKU、source 标记、normalized JSON、raw fields、missing fields、variation/pricing suggestion、enrich/generate 操作。
- Listing Studio：生成 listing、图片、A+ modules、backend search terms；Full/Copy-only/Images-only 都调用后端 API。
- Agent Trace：按 jobId 展示真实后端 trace，不用静态 demo trace 冒充。
- Chat Recomposer：支持 `Make this a 3-pack`、中文 `把这个 SKU 做成 3 件装`、`Combine this with SKU STAND-ALUM-09`、中文 combo 指令。
- Review / Diff：人工审核、approve/reject/request revision、合规报告、物理属性 diff、物理一致性报告。
- Costs & Eval：1500 RMB 预算、模拟/估算 cost ledger、cache savings、agent 成本、eval harness。
- Settings：显示 DB/LLM/Image/Search 配置状态，强调前端不暴露 secret。

## Demo 流程

1. `docker compose up --build` 启动。
2. 打开 Settings，确认 DB/LLM/Image/Search 配置状态和 provider self-test。
3. 进入 Products，选择 SKU，查看 source、normalized JSON、raw fields 和 variation 建议。
4. 点击 Enrich，查看带 `sourceUrl` 的增强字段和 cache 命中。
5. 点击 Generate Listing，进入 Listing Studio 查看 title、bullets、A+ modules、images。
6. 打开 Agent Trace，按 jobId 查看每个 agent 的工具调用、tokens、latency、cost。
7. Chat 输入 `把这个 SKU 做成 3 件装`，查看 multipack 的重量、尺寸、文案和图片变化。
8. Chat 输入 `Combine this with SKU STAND-ALUM-09`，查看 combo 结果。
9. Review / Diff 页面审核生成结果。
10. Costs & Eval 页面查看 1500 RMB 预算、cache savings 和 eval 分数。注意这里的 RMB 是按配置单价、token、图片和搜索次数计算的估算值，不代表本次浏览器运行真实扣费。

## 样例产出

`samples/` 中包含：

- 至少 3 个普通 SKU listing 样例。
- 1 个 multipack 样例。
- 1 个 combo 样例。
- 每个样例包含 JSON、trace、compliance report、physical consistency report、cost summary、diff 和图片。
- `samples/eval_report.json` 与 `samples/eval_report.md`。

## 安全规则

- 不提交 `.env`、`.env.*`、数据库密码、API key。
- `SSB系统SKU数据库访问.md` 不应进入 GitHub。
- 前端不保存、不显示、不调用任何 secret。
- SSB 数据库只读，应用没有写回 SSB 的代码路径。
- 缺 key 时返回清晰配置提示，并使用 demo provider 保持演示可用。

## 验证

已执行：

```bash
python -m pytest api
cd ssb-listing-studio
npm run lint
npm run build
cd ..
docker compose config
```

说明：当前本机 Docker 读取 `C:\Users\MR\.docker\config.json` 时有权限警告，但 `docker compose config` 能解析项目配置。这是本机 Docker 配置权限问题，不是项目 compose 文件语法问题。
