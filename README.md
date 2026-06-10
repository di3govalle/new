# watsonx Orchestrate React Starter Project

A React dashboard that talks to **watsonx Orchestrate** agents through the
`/runs` API. It covers three areas — **Weather**, **Stocks**, and
**Knowledge** — and runs in **mock mode** out of the box, so it's demoable the
moment you clone it, before any agent exists.

```
React UI  ──►  Vite dev proxy (adds JWT)  ──►  watsonx Orchestrate /runs API  ──►  Agent  ──►  response
```

---

## Purpose

Build familiarity with the [watsonx Orchestrate](https://www.ibm.com/products/watsonx-orchestrate)
platform while practicing **React** in a realistic scenario. The frontend is
intentionally simple (plain React + plain CSS, no Redux/TypeScript) so it's easy
to read and extend.

---

## Project structure

```
.
├── index.html
├── package.json
├── vite.config.js              # dev server + authenticated proxy to Orchestrate
├── .env.example                # placeholders only — copy to .env locally
├── .gitignore                  # ignores .env and node_modules
├── src/
│   ├── main.jsx
│   ├── App.jsx                 # dashboard: Weather / Stock / Knowledge cards
│   ├── App.css                 # IBM/watsonx-inspired dark dashboard styling
│   ├── api/
│   │   └── orchestrate.js      # /runs API helper + mock mode
│   └── components/
│       ├── AgentCard.jsx
│       ├── ResponseBox.jsx
│       └── StatusBadge.jsx
└── adk-project/
    ├── agents/                 # agent YAML specs
    │   ├── hello-world-agent.yaml
    │   ├── weather-agent.yaml
    │   ├── stock-agent.yaml
    │   └── knowledge-agent.yaml
    ├── tools/                  # tool specs (e.g. weather-openapi.yaml)
    ├── knowledge/
    └── flows/
```

---

## Quick start (mock mode)

No watsonx Orchestrate server required.

```bash
npm install
npm run dev
```

Open **http://localhost:5173/**. With `VITE_USE_MOCKS=true` (the default), each
card returns a sample response and the badge reads **Mock Mode**.

---

## Credentials & API keys — what to get, where, and which file

Everything secret lives in **one file: `.env`** (created from `.env.example`,
and gitignored). Nothing else needs editing for keys. Here's every credential
this project can use:

| # | Credential | Where to get it | File | Variable(s) |
| --- | --- | --- | --- | --- |
| 1 | **WO service instance URL** | watsonx Orchestrate web console → your instance details (or the browser URL). Looks like `https://api.<region>.watson-orchestrate.ibm.com/instances/<id>` | `.env` | `WO_INSTANCE` |
| 2 | **WO API key** | WO web console → **Settings / API details → Generate API key** | `.env` | `WO_API_KEY` |
| 3 | **Agent IDs** (Weather/Stock/Knowledge) | WO console → **Agent Builder** → open each agent → copy its UUID (in details or the URL `.../agent/edit/<UUID>`) | `.env` | `VITE_WEATHER_AGENT_ID`, `VITE_STOCK_AGENT_ID`, `VITE_KNOWLEDGE_AGENT_ID` |
| 4 | **Weather API key** | **None needed** — the weather tool uses the free, key-less [`wttr.in`](https://wttr.in) service | — | — |
| 5 | **Stock API key** | Sign up free at [finnhub.io](https://finnhub.io) → Dashboard → copy your API key (or [marketstack.com](https://marketstack.com/)) | `.env` *(local dev)* or a WO **connection** *(recommended)* | `FINNHUB_API_KEY` |
| 6 | **Knowledge base** | **No key** — create a knowledge base in the WO console and upload documents | — | — |
| 7 | **LLM** | **No key in this app** — the model is provided by your WO instance; you pick it in Agent Builder | — | — |

### Step-by-step

**1–2 · watsonx Orchestrate URL + API key**
1. Log in to the WO web console (e.g. `https://dl.watson-orchestrate.ibm.com`).
2. Find your **instance URL** (instance details or the browser address bar).
3. Open **Settings → API details** (wording varies) and **generate an API key**.
4. Put both in `.env`:
   ```bash
   WO_INSTANCE=https://api.<region>.watson-orchestrate.ibm.com/instances/<id>
   WO_API_KEY=<your-api-key>
   ```

**3 · Agent IDs**
After you create each agent in **Agent Builder**, open it and copy its UUID into `.env`:
```bash
VITE_WEATHER_AGENT_ID=<weather-agent-uuid>
VITE_STOCK_AGENT_ID=<stock-agent-uuid>
VITE_KNOWLEDGE_AGENT_ID=<knowledge-agent-uuid>
```

**5 · Stock API key (Finnhub)**
1. Create a free account at <https://finnhub.io>, open the **Dashboard**, copy the **API key**.
2. **Recommended (secret stays on the server):** register it as a WO connection so the tool reads it at runtime:
   ```bash
   orchestrate connections add -a finnhub
   orchestrate connections configure -a finnhub --env draft --kind key_value
   orchestrate connections set-credentials -a finnhub --env draft -e "api_key=<your-finnhub-key>"
   ```
   Then read it inside the tool via the connection (see `adk-project/tools/stock_tool.py`).
3. **Quick local-dev alternative:** add it to `.env` and have the tool read `os.environ["FINNHUB_API_KEY"]`:
   ```bash
   FINNHUB_API_KEY=<your-finnhub-key>
   ```

> 🔐 **Golden rules**
> - All secrets go in **`.env`** only — never in `.env.example`, source files, commits, or screenshots.
> - Only `VITE_`-prefixed vars reach the browser. `WO_*` and `FINNHUB_API_KEY` stay server-side (the proxy / the tool).
> - `.env` is gitignored. Verify with `git check-ignore .env` (should print `.env`).
> - If a key leaks, **regenerate it** at the source immediately.

---

## Connected mode (talk to a real agent)

### 1. Install the ADK and authenticate

```bash
pip install --upgrade ibm-watsonx-orchestrate

# Add your environment (AWS/SaaS shown; use --type ibm_iam for IBM Cloud)
orchestrate env add -n saas -u https://api.<region>.watson-orchestrate.ibm.com/instances/<instance-id>
orchestrate env activate saas --api-key <your-api-key>
```

> ⏱️ Remote (SaaS) tokens expire every ~2 hours. The proxy can self-refresh
> from your API key (see below); otherwise just re-run `orchestrate env activate`.

> ⚠️ `orchestrate agents list` may return `500 — "A database error occurred"` if
> your instance has built-in tools with non-UUID IDs. It's a known server-side
> bug — get agent IDs from the **web console** instead.

### 2. Create an agent and copy its ID

In the web console: **Agent Builder → Create agent**. Give it instructions, pick
any available LLM, save, then copy its **Agent ID** (a UUID, visible in the
agent's details or the browser URL).

### 3. Configure `.env`

```bash
cp .env.example .env
```

Then edit it:

```bash
VITE_USE_MOCKS=false
VITE_ORCHESTRATE_BASE_URL=/api          # routed through the Vite proxy
VITE_WEATHER_AGENT_ID=<your-weather-agent-uuid>
VITE_STOCK_AGENT_ID=<your-stock-agent-uuid>
VITE_KNOWLEDGE_AGENT_ID=<your-knowledge-agent-uuid>

# Server-side only (never shipped to the browser)
WO_ENV_NAME=saas
WO_AUTH_TYPE=mcsp                        # "mcsp" for AWS/SaaS, "ibm_iam" for IBM Cloud
WO_INSTANCE=https://api.<region>.watson-orchestrate.ibm.com/instances/<instance-id>
WO_API_KEY=<your-api-key>
```

### 4. Run

```bash
npm run dev
```

The badge switches to **Connected Mode**. Type a city in the Weather card and
click **Ask Weather Agent** to hit your real agent.

---

## How authentication & CORS are handled

The browser can't call the SaaS `/runs` endpoint directly (CORS) and every call
needs a JWT. The **Vite dev proxy** in `vite.config.js` solves both:

- Forwards same-origin `/api/*` requests to your `WO_INSTANCE`.
- Injects an `Authorization: Bearer <JWT>` header server-side, so **the API key
  never reaches the browser**.
- Gets the JWT by either (a) exchanging your `WO_API_KEY` for a fresh token
  (MCSP for AWS/SaaS, IBM Cloud IAM for `ibm_iam`), or (b) falling back to the
  token `orchestrate env activate` already cached in
  `~/.cache/orchestrate/credentials.yaml`.

> **Production note:** the Vite proxy is dev-only. For a deployed app, run a
> small backend (Node/Express, serverless, etc.) that holds the API key, mints
> the JWT, and proxies `/runs`. Never put the API key in the frontend bundle.

---

## How the `/runs` integration works

`src/api/orchestrate.js` implements the two-step flow:

1. **POST** `/v1/orchestrate/runs` with the message and `agent_id` → returns a `run_id`.
2. **GET** `/v1/orchestrate/runs/{run_id}`, polled every ~1.5s (up to 15 tries)
   until `status: "completed"`, then extracts the answer from
   `result.data.message.content[].text`.

It fails gracefully when: the server is unreachable, the base URL or an agent ID
is missing, the POST/GET fails, polling times out, or the response shape is
unexpected (it shows the raw JSON so it stays debuggable). Empty inputs are
validated in the UI before any request is sent.

---

## Building the tools

### Weather (OpenAPI tool — key-less `wttr.in`)

```bash
orchestrate tools import -k openapi -f adk-project/tools/weather-openapi.yaml
```

Then attach the `getWeather` tool to your Weather agent in the console. No
connection/credentials needed (`wttr.in` is public). Note: it only covers today
+ the next 2 days.

### Stocks (try a different tool type — e.g. Python)

Create a Python tool that calls a stock API such as
[Finnhub](https://finnhub.io/docs/api/introduction) or
[Marketstack](https://marketstack.com/), import it
(`orchestrate tools import -k python -f ...`), and attach it to a Stock agent.

### Knowledge (RAG with citations)

Create a knowledge base in the console, upload documents, and attach it to a new
or existing agent. Responses include citations, which the Knowledge card renders
in its citation area.

---

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_USE_MOCKS` | browser | `true` = mock responses, `false` = real `/runs` API. |
| `VITE_ORCHESTRATE_BASE_URL` | browser | Use `/api` so calls go through the proxy. |
| `VITE_WEATHER_AGENT_ID` | browser | Weather agent UUID. |
| `VITE_STOCK_AGENT_ID` | browser | Stock agent UUID. |
| `VITE_KNOWLEDGE_AGENT_ID` | browser | Knowledge agent UUID. |
| `WO_ENV_NAME` | server | ADK env name (e.g. `saas`) for the cached-token fallback. |
| `WO_AUTH_TYPE` | server | `mcsp` (AWS/SaaS) or `ibm_iam` (IBM Cloud). |
| `WO_AUTH_URL` | server | Optional token-endpoint override. |
| `WO_INSTANCE` | server | Service instance URL (never commit). |
| `WO_API_KEY` | server | API key (never commit). |

> 🔐 Only `VITE_`-prefixed vars are exposed to the browser. `WO_*` vars stay in
> Node (the proxy). `.env` is gitignored — never commit real values.

---

## Requirements checklist

### Weather
- [x] Create a tool that can get weather information (OpenAPI / `wttr.in`)
- [x] Create an agent in Orchestrate that uses the weather tool
- [x] Create a React application
- [x] Use the `/runs` API to interact with the agent via the React app

### Stocks
- [ ] Create a stock-price tool (different tool type — Python/OpenAPI/MCP)
- [ ] Create an agent that uses the stock tool
- [x] Integrate the stock agent into the React app

### Knowledge
- [ ] Create or enhance an agent that uses a knowledge base, with citations in the app

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Badge stuck on **Mock Mode** | Set `VITE_USE_MOCKS=false`, restart `npm run dev`. |
| `[proxy] No token available` | Run `orchestrate env activate saas --api-key <key>`. |
| **401 / 403** from `/runs` | Token expired; re-activate, or let the proxy self-mint via `WO_API_KEY`. |
| `header not found in MCSP token` | The `/runs` API needs a JWT, not the raw key. The proxy handles this — make sure `WO_API_KEY` is set in `.env`. |
| Raw JSON instead of text | The `extractAnswer` in `orchestrate.js` covers the SaaS shape `result.data.message.content[].text`. If you see raw JSON, the shape is new — add a case to `extractAnswer`. |
| `agents list` → 500 | Known SaaS bug (rate limit). Use the web console for agent IDs. Test agents with `orchestrate chat ask --agent-name "Weather_Agent" "What is the weather in Austin?"` |
| CORS error in console | Use `VITE_ORCHESTRATE_BASE_URL=/api` so requests go through the proxy. |
| Agent says "I don't have weather data" | Attach the weather tool to the agent. |
| 404 on `/runs` | Check endpoint order: must be `/instances/{id}/v1/orchestrate/runs`, not `/v1/orchestrate/instances/...`. |

---

## Useful links

- watsonx Orchestrate: <https://www.ibm.com/products/watsonx-orchestrate>
- ADK docs: <https://developer.watson-orchestrate.ibm.com>
- ADK tutorials: <https://developer.watson-orchestrate.ibm.com/tutorials/tutorial_1_hello_world>
- `/runs` API docs: <https://developer.ibm.com/apis/catalog/watsonorchestrate--custom-assistants/Introduction>
- Knowledge bases: <https://developer.watson-orchestrate.ibm.com/knowledge_base/overview>
- Open-Meteo / wttr.in (weather): <https://open-meteo.com/> · <https://wttr.in>
- Finnhub / Marketstack (stocks): <https://finnhub.io/docs/api/introduction> · <https://marketstack.com/>
- React docs: <https://react.dev/learn>
