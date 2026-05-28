# watsonx Orchestrate React Starter Project

## Purpose

The primary objective of this project is to help build familiarity with the [**watsonx Orchestrate**](https://www.ibm.com/products/watsonx-orchestrate) platform and to demonstrate/practice **React** skills working in a realistic scenario.

The app is a React dashboard that talks to watsonx Orchestrate agents through the `/runs` API. It covers three areas — **Weather**, **Stocks**, and **Knowledge** — and runs in **mock mode** out of the box so it is demoable immediately, before any real agent is deployed.

Creativity and novel interpretation is welcome, though the core deliverables should still be met.

## Project structure

```
.
├── index.html
├── package.json
├── vite.config.js
├── .env.example            # placeholders only — copy to .env locally
├── .gitignore              # ignores .env and node_modules
├── src/
│   ├── main.jsx
│   ├── App.jsx             # dashboard with Weather / Stock / Knowledge cards
│   ├── App.css             # IBM/watsonx-inspired dark dashboard styling
│   ├── api/
│   │   └── orchestrate.js  # /runs API helper + mock mode
│   └── components/
│       ├── AgentCard.jsx
│       ├── ResponseBox.jsx
│       └── StatusBadge.jsx
└── adk-project/
    ├── agents/             # placeholder agent YAML specs
    │   ├── hello-world-agent.yaml
    │   ├── weather-agent.yaml
    │   ├── stock-agent.yaml
    │   └── knowledge-agent.yaml
    ├── tools/
    ├── knowledge/
    └── flows/
```

## Quick start (mock mode)

The frontend works without any watsonx Orchestrate server running.

```bash
# 1. Install frontend dependencies
npm install

# 2. Start the frontend
npm run dev
```

Then open http://localhost:5173/. Because `VITE_USE_MOCKS=true` by default, each
agent card returns a sample response and the status badge reads **Mock Mode**.

## Local Development Workflow

When you are ready to connect to real agents running on the local watsonx
Orchestrate Developer Edition, follow this workflow. **Use placeholders only —
do not commit a real `.env`.**

```bash
# 1. Install frontend dependencies
npm install

# 2. Create a local environment file from the template
cp .env.example .env

# 3. Fill in .env locally
# Do not commit .env

# 4. Start local watsonx Orchestrate Developer Edition
orchestrate server start -e .env

# 5. Activate the local ADK environment
orchestrate env activate local

# 6. Import test agent
cd adk-project/agents
orchestrate agents import -f hello-world-agent.yaml

# 7. Import project agents
orchestrate agents import -f weather-agent.yaml
orchestrate agents import -f stock-agent.yaml
orchestrate agents import -f knowledge-agent.yaml

# 8. Start the frontend
cd ../..
npm run dev
```

After importing the agents, copy each agent's id into your `.env`
(`VITE_WEATHER_AGENT_ID`, `VITE_STOCK_AGENT_ID`, `VITE_KNOWLEDGE_AGENT_ID`),
set `VITE_USE_MOCKS=false`, point `VITE_ORCHESTRATE_BASE_URL` at your local
server, and restart `npm run dev`. The status badge will switch to
**Connected Mode**.

> **Note:** The local Developer Edition server and agents may need to be
> started/imported again depending on local environment state. This project
> intentionally does not hardcode active agent IDs or private environment URLs.

## Environment variables

All configuration lives in `.env` (created from `.env.example`). Only
placeholders are committed.

| Variable | Purpose |
| --- | --- |
| `VITE_USE_MOCKS` | `true` to use mock responses, `false` to call the real `/runs` API. |
| `VITE_ORCHESTRATE_BASE_URL` | Base URL of the Orchestrate server (e.g. local Developer Edition). |
| `VITE_WEATHER_AGENT_ID` | Imported Weather agent id. |
| `VITE_STOCK_AGENT_ID` | Imported Stock agent id. |
| `VITE_KNOWLEDGE_AGENT_ID` | Imported Knowledge agent id. |
| `WO_DEVELOPER_EDITION_SOURCE` | Used when starting Developer Edition. |
| `WO_INSTANCE` | Service instance URL (local use only — never commit). |
| `WO_API_KEY` | API key (local use only — never commit). |

## How the `/runs` integration works

`src/api/orchestrate.js` implements the two-step `/runs` flow:

1. **POST** `/v1/orchestrate/runs` with the message and `agent_id`, which
   returns a `run_id`.
2. **GET** `/v1/orchestrate/runs/{run_id}`, polled every ~1.5s for up to 15
   attempts, until a final answer is available.

The helper is written defensively and surfaces friendly errors when:

- the local Orchestrate server is not running,
- `VITE_ORCHESTRATE_BASE_URL` is missing,
- a weather/stock/knowledge agent id is missing or still a placeholder,
- the POST or GET request fails,
- polling times out, or
- the response shape is unexpected (the raw JSON is shown so it stays
  debuggable).

Empty inputs are validated in the UI before any request is sent.

## Requirements (from the starter brief)

### Weather
- [ ] Create a tool that can get weather information
- [ ] Create an Agent in Orchestrate that uses your weather tool
- [x] Create a React Application
- [x] Use the `/runs` API to interact with your Agent via your React App

### Stocks
- [ ] Create a tool that can get stock prices (try a different tool type than the weather tool: Python, OpenAPI, MCP)
- [ ] Create an agent that uses your stock price tool
- [x] Integrate this agent into the existing React App

### Knowledge
- [ ] Create a new agent that uses knowledge bases and include it in your React App, **or** enhance the Stock/Weather agent with knowledge-base functionality

> The React frontend, mock mode, `/runs` helper, ADK folder structure, and
> placeholder agent specs are provided here. The remaining tool/agent
> creation steps are completed inside watsonx Orchestrate and wired up via the
> `.env` values above.

## Useful links

- Orchestrate Main Page: <https://www.ibm.com/products/watsonx-orchestrate>
- Agent Developer Kit (ADK): <https://developer.watson-orchestrate.ibm.com>
- ADK Tutorials: <https://developer.watson-orchestrate.ibm.com/tutorials/tutorial_1_hello_world>
- wxO API Docs: <https://developer.ibm.com/apis/catalog/watsonorchestrate--custom-assistants/Introduction>
- Knowledge Bases Docs: <https://developer.watson-orchestrate.ibm.com/knowledge_base/overview>
- React Docs: <https://react.dev/learn>

#### 3rd Party APIs (for building the tools)

- open-meteo weather api: <https://open-meteo.com/>
- weather api: <https://www.weatherapi.com/>
- finnhub stock api: <https://finnhub.io/docs/api/introduction>
- market stack stock api: <https://marketstack.com/>
