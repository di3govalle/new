# watsonx Orchestrate React Starter — Day-One Onboarding (Mac, Apple Silicon)

Welcome! 👋 This guide takes you from a **brand-new Mac with nothing installed**
to a working React app talking to a real watsonx Orchestrate agent.

It assumes:
- A **Mac with Apple Silicon** (M-series, e.g. M5 Pro / M5 Max) running a recent macOS.
- You've never installed developer tools before.
- The **AWS / SaaS** path for watsonx Orchestrate (most common). IBM Cloud notes included where they differ.

Work through it top to bottom. Each step has a **verify** command so you know it
worked before moving on. Total time: ~60–90 minutes (mostly downloads).

> 💡 Throughout, `⌘` = the Command key. Open **Terminal** via
> Spotlight (`⌘ + Space`, type "Terminal", Enter). You'll live here a lot.

---

## Part A — Set up your Mac (install the toolchain)

### Step 1 — Xcode Command Line Tools

These provide `git`, compilers, and headers many tools need.

```bash
xcode-select --install
```

A dialog pops up — click **Install** and wait (~5–10 min). Verify:

```bash
git --version
```

You should see something like `git version 2.x`.

---

### Step 2 — Homebrew (the package manager)

Homebrew is how you'll install almost everything else.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Important (Apple Silicon):** on M-series Macs Homebrew installs to
`/opt/homebrew`. At the end it prints two `Next steps` commands to add `brew` to
your `PATH` — run them. They look like this (use **your** username):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Verify:

```bash
brew --version
```

---

### Step 3 — Git identity

```bash
git config --global user.name "Your Name"
git config --global user.email "your-ibm-email@ibm.com"
```

---

### Step 4 — Node.js (via nvm, recommended)

`nvm` lets you switch Node versions easily. Install it, then install Node 20 LTS.

```bash
brew install nvm
mkdir -p ~/.nvm
```

Add nvm to your shell (paste this block as-is):

```bash
cat >> ~/.zshrc << 'EOF'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
EOF
```

Reload your shell and install Node:

```bash
source ~/.zshrc
nvm install 20
nvm use 20
nvm alias default 20
```

Verify (Node 18+ and npm 9+ required):

```bash
node --version   # v20.x
npm --version    # 10.x
```

> Prefer not to use nvm? `brew install node` also works. nvm is just friendlier
> when projects need different versions.

---

### Step 5 — Python 3.11+ (for the ADK)

```bash
brew install python@3.11
```

Verify:

```bash
python3 --version   # 3.11.x or newer
pip3 --version
```

---

### Step 6 — A code editor (VS Code)

```bash
brew install --cask visual-studio-code
```

Then enable the `code` command: open VS Code → press `⌘ + Shift + P` →
type **"Shell Command: Install 'code' command in PATH"** → Enter. Now:

```bash
code .   # opens the current folder in VS Code
```

---

### Step 7 — Docker Desktop (only if you'll run the local Developer Edition)

You do **not** need this if you're using a hosted SaaS instance (the common
path). Install it only if you plan to run watsonx Orchestrate **Developer
Edition** locally.

```bash
brew install --cask docker
```

Then **open Docker Desktop once from Applications** to finish setup (grant
permissions). Verify:

```bash
docker --version
```

> Apple Silicon note: Developer Edition pulls many containers and can hit
> Docker Hub rate limits. Work around it by signing in (`docker login`) or
> setting `OPENSOURCE_REGISTRY_PROXY=us.icr.io/watson-orchestrate-private`.

---

## Part B — Get watsonx Orchestrate access

### Step 8 — Request access (AWS path)

1. Ask your manager for access to a **watsonx Orchestrate** instance — follow
   the **AWS** path (not IBM Cloud).
2. Once granted, log in to the web console (e.g.
   `https://dl.watson-orchestrate.ibm.com` for Dallas; your region may differ).
3. Collect two values:
   - **Service instance URL** —
     `https://api.<region>.watson-orchestrate.ibm.com/instances/<instance-id>`
   - **API key** — generate it in your account settings.

> 🔐 **Never** paste your real API key into chats, screenshots, screen shares,
> commits, or `.env.example`. It belongs only in your local `.env` (gitignored).
> If it ever leaks, regenerate it immediately.

**Which path am I on?** After Step 10 you can run
`cat ~/.config/orchestrate/config.yaml` — `auth_type: mcsp` = AWS/SaaS,
`auth_type: ibm_iam` = IBM Cloud.

---

## Part C — Get the project

### Step 9 — Fork & clone the repo

1. Open the `wo-react-starter-project` repo on GitHub → click **Fork**.
2. Clone your fork (replace `<your-username>`):

```bash
cd ~/Developer 2>/dev/null || mkdir -p ~/Developer && cd ~/Developer
git clone https://github.com/<your-username>/wo-react-starter-project.git
cd wo-react-starter-project
```

> `~/Developer` is a tidy home for code projects, but anywhere works.

---

### Step 10 — Install the ADK and authenticate

The ADK gives you the `orchestrate` CLI.

```bash
pip3 install --upgrade ibm-watsonx-orchestrate
orchestrate --help
```

Connect to your instance:

```bash
# Add the environment (name it anything, e.g. "saas")
orchestrate env add -n saas -u https://api.<region>.watson-orchestrate.ibm.com/instances/<instance-id>

# Authenticate — caches a JWT under ~/.cache/orchestrate/credentials.yaml
orchestrate env activate saas --api-key <your-api-key>
```

> For **IBM Cloud** instead of AWS, add `--type ibm_iam` to the activate command.

> ⏱️ Tokens expire every ~2 hours. Re-run `orchestrate env activate saas` to
> refresh (the app's proxy can also self-refresh — see Step 14).

> ⚠️ `orchestrate agents list` fails with `500 — Internal Server Error` on most
> SaaS instances. This is a known server-side bug (it tries to fetch thousands of
> agents and hits a rate limit). **Do not rely on it.** Use the **web console** to
> copy agent IDs, and use `orchestrate chat ask` (see below) to test agents from
> the terminal.

> **Testing agents from the terminal (no UI needed):**
> ```bash
> orchestrate chat ask --agent-name "Weather_Agent" "What is the weather in Austin?"
> ```
> This talks directly to the agent and verifies it works before you wire up the
> React frontend. Substitute your agent's exact name (as shown in Agent Builder).

---

## Part D — Run the app

### Step 11 — Install dependencies and start in mock mode

```bash
npm install
npm run dev
```

Open **http://localhost:5173/**. You'll see three cards (Weather, Stock,
Knowledge) and a **Mock Mode** badge. Mock mode needs no server — great for
building UI. Stop the server anytime with `Ctrl + C`.

---

### Step 12 — Create an agent in the web console

1. In the console, go to **Agent Builder → Create agent → from scratch**.
2. **Name:** `Weather_Agent`
3. **Instructions:** *"You help users get weather information. Ask for the city
   and date if either is missing. Use the weather tool to retrieve data."*
4. **LLM:** pick any model the dropdown offers (e.g. a watsonx Llama model).
   Don't hand-type tutorial names like `groq/...` — those are local-only.
5. Save/deploy, then copy the **Agent ID** (a UUID, in the agent's details or
   the browser URL: `.../build/agent/edit/<AGENT_ID>`).

---

### Step 13 — Add the Weather tool (OpenAPI, key-less)

This project includes an OpenAPI tool that calls the free, no-key `wttr.in`
service. Save it as `adk-project/tools/weather-openapi.yaml`, then:

```bash
orchestrate env activate saas --api-key <your-api-key>   # ensure token is fresh
orchestrate tools import -k openapi -f adk-project/tools/weather-openapi.yaml
```

In the console, open **Weather_Agent → Tools → Add tool → getWeather**, and
save. Now the agent can return real forecasts (today + next 2 days; `wttr.in`
doesn't do past or far-future dates).

---

### Step 14 — Connect the frontend (Connected Mode)

Create your local env file and fill it in:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
VITE_USE_MOCKS=false
VITE_ORCHESTRATE_BASE_URL=/api          # routed through the Vite proxy
VITE_WEATHER_AGENT_ID=<your-weather-agent-uuid>
VITE_STOCK_AGENT_ID=<your-weather-agent-uuid>     # reuse for now; split later
VITE_KNOWLEDGE_AGENT_ID=<your-weather-agent-uuid> # reuse for now; split later

# Server-side only — never shipped to the browser
WO_ENV_NAME=saas
WO_AUTH_TYPE=mcsp                        # "ibm_iam" if you're on IBM Cloud
WO_INSTANCE=https://api.<region>.watson-orchestrate.ibm.com/instances/<instance-id>
WO_API_KEY=<your-api-key>
```

Confirm `.env` is ignored by git (should print `.env`):

```bash
git check-ignore .env
```

Restart the app:

```bash
npm run dev
```

The badge should now read **Connected Mode**. Type a city + a date within the
next 3 days in the Weather card and click **Ask Weather Agent** — you'll get a
real forecast. 🎉

**Why a proxy?** The browser can't call the SaaS `/runs` endpoint directly
(CORS) and every call needs a JWT (not your raw API key). The Vite dev proxy
(`vite.config.js`) forwards `/api/*` to your instance and injects the token
**server-side**, so the API key never reaches the browser. Watch the terminal:
- `[proxy] minted fresh mcsp token` → proxy self-auth is working
- `[proxy] No token available` → run `orchestrate env activate saas --api-key <key>`

**How authentication works under the hood:**
The `/runs` API requires `Authorization: Bearer <JWT>` — not the raw API key.
The proxy exchanges your raw `WO_API_KEY` for a JWT by calling:
```
POST https://iam.platform.saas.ibm.com/siusermgr/api/1.0/apikeys/token
{ "apikey": "<your-raw-api-key>" }
```
and uses the returned token. Tokens expire in ~2 hours; the proxy auto-refreshes.
If you ever see `header not found in MCSP token` or `Authorization header does
not contain Bearer token` errors, it means a raw key slipped through — the proxy
handles this correctly as long as `WO_API_KEY` is set in `.env`.

**Correct endpoint pattern** (`vite.config.js` and `orchestrate.js` already use this):
```
POST /instances/{your-instance-id}/v1/orchestrate/runs
GET  /instances/{your-instance-id}/v1/orchestrate/runs/{run_id}
```
The pattern `/v1/orchestrate/instances/...` returns 404 — the instance ID comes
first.

---

## Part E — The remaining deliverables

### Step 15 — Stocks (use a different tool type)

The brief wants a **different tool type** than weather. Since weather is
OpenAPI, do stocks in **Python**.

1. Create a `Stock_Agent` in the console.
2. Write a Python tool that calls a stock API such as
   [Finnhub](https://finnhub.io/docs/api/introduction) or
   [Marketstack](https://marketstack.com/):

   ```python
   # adk-project/tools/stock_tool.py
   import requests
   from ibm_watsonx_orchestrate.agent_builder.tools import tool

   @tool
   def get_stock_price(ticker: str) -> str:
       """Get the latest stock quote for a ticker, e.g. "IBM"."""
       token = "<your-finnhub-key>"  # store via a connection, not hard-coded
       r = requests.get(
           "https://finnhub.io/api/v1/quote",
           params={"symbol": ticker.upper(), "token": token},
           timeout=10,
       ).json()
       if not r.get("c"):
           return f"No quote found for {ticker}."
       return f"{ticker.upper()}: current ${r['c']}, high ${r['h']}, low ${r['l']}."
   ```

3. Import and attach it:

   ```bash
   orchestrate tools import -k python -f adk-project/tools/stock_tool.py
   ```

4. Put the Stock agent's UUID in `VITE_STOCK_AGENT_ID` and test the Stock card.

**Stretch:** return a price series and render a small chart in the Stock card.

### Step 16 — Knowledge base (RAG with citations)

1. In the console, create a **Knowledge base** and upload documents (PDFs, etc.).
2. Create a `Knowledge_Agent` (or enhance an existing one) and attach the
   knowledge base.
3. Set `VITE_KNOWLEDGE_AGENT_ID` and ask a question answerable from your docs.
   The Knowledge card's **citation area** populates from the response.

### Step 17 — Commit your work

```bash
git add -A
git status        # confirm .env is NOT listed
git commit -m "Connect React app to watsonx Orchestrate agents"
git push origin main
```

Glance at `git status` before every push to be sure `.env` never appears.

---

## Troubleshooting cheat sheet

| Symptom | Fix |
| --- | --- |
| `command not found: brew` | Re-run the two `eval`/`echo` lines from Step 2, then `source ~/.zprofile`. |
| `command not found: node` / `nvm` | `source ~/.zshrc` (Step 4), or open a new Terminal tab. |
| `pip3: command not found` | Use `python3 -m pip install --upgrade ibm-watsonx-orchestrate`. |
| Badge stuck on **Mock Mode** | Set `VITE_USE_MOCKS=false`, restart `npm run dev`. |
| `[proxy] No token available` | `orchestrate env activate saas --api-key <key>`. |
| **401 / 403** from the agent | Token expired (2h) — re-activate the env. |
| Raw JSON instead of clean text | Response shape differs — extend `extractAnswer` in `orchestrate.js`. |
| `agents list` → 500 database error | Known instance bug; use the web console for agent IDs. |
| CORS error in browser console | Use `VITE_ORCHESTRATE_BASE_URL=/api` so calls go through the proxy. |
| Agent says "I don't have weather data" | Attach the weather tool to the agent (Step 13). |
| Import fails on the `llm` field | That model isn't on your instance — pick one offered in the console. |

---

## Definition of done

- [ ] Mac toolchain installed (Xcode CLT, Homebrew, Node 20, Python 3.11, VS Code)
- [ ] ADK installed; `orchestrate env activate saas` succeeds
- [ ] App runs in **Mock Mode**
- [ ] Weather agent created with the `wttr.in` tool attached
- [ ] App reaches **Connected Mode**; Weather card returns a real forecast
- [ ] Stock agent + Python tool integrated
- [ ] Knowledge base agent integrated with citations
- [ ] Work committed and pushed (no `.env` leaked)

---

## Reference links

- watsonx Orchestrate: <https://www.ibm.com/products/watsonx-orchestrate>
- ADK docs: <https://developer.watson-orchestrate.ibm.com>
- ADK tutorials: <https://developer.watson-orchestrate.ibm.com/tutorials/tutorial_1_hello_world>
- `/runs` API docs: <https://developer.ibm.com/apis/catalog/watsonorchestrate--custom-assistants/Introduction>
- Knowledge bases: <https://developer.watson-orchestrate.ibm.com/knowledge_base/overview>
- Homebrew: <https://brew.sh> · nvm: <https://github.com/nvm-sh/nvm>
- wttr.in / Open-Meteo (weather): <https://wttr.in> · <https://open-meteo.com/>
- Finnhub / Marketstack (stocks): <https://finnhub.io/docs/api/introduction> · <https://marketstack.com/>
- React docs: <https://react.dev/learn>
