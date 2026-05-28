// App.jsx
// watsonx Orchestrate dashboard with three agent cards: Weather, Stock, and
// Knowledge. Each card collects input, calls the /runs API helper, and shows
// the result. The app works in mock mode before any real agent is deployed.

import { useState } from "react";
import AgentCard from "./components/AgentCard.jsx";
import StatusBadge from "./components/StatusBadge.jsx";
import {
  sendMessageToAgent,
  isMockMode,
  WEATHER_AGENT_ID,
  STOCK_AGENT_ID,
  KNOWLEDGE_AGENT_ID,
} from "./api/orchestrate.js";

// Small hook-like helper to track the request state for one agent.
function useAgentState() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  return { loading, setLoading, error, setError, response, setResponse };
}

export default function App() {
  // ---- Weather agent state ----
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const weather = useAgentState();

  // ---- Stock agent state ----
  const [ticker, setTicker] = useState("");
  const stock = useAgentState();

  // ---- Knowledge agent state ----
  const [question, setQuestion] = useState("");
  const knowledge = useAgentState();

  // Generic submit handler shared by all three cards.
  async function runAgent({ state, agentId, message, mockKey, validate }) {
    const validationError = validate();
    if (validationError) {
      state.setError(validationError);
      state.setResponse(null);
      return;
    }

    state.setLoading(true);
    state.setError(null);
    state.setResponse(null);

    try {
      const result = await sendMessageToAgent({ agentId, message, mockKey });
      state.setResponse(result);
    } catch (err) {
      state.setError(err.message || String(err));
    } finally {
      state.setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>watsonx Orchestrate</h1>
          <span className="app-subtitle">Agent Dashboard</span>
        </div>
        <StatusBadge mock={isMockMode} />
      </header>

      <main className="cards">
        {/* ---- Weather ---- */}
        <AgentCard
          title="Weather Agent"
          subtitle="Get the weather for a city and date."
          buttonLabel="Ask Weather Agent"
          loading={weather.loading}
          error={weather.error}
          response={weather.response}
          onSubmit={() =>
            runAgent({
              state: weather,
              agentId: WEATHER_AGENT_ID,
              mockKey: "weather",
              message: `What is the weather in ${city}${
                date ? ` on ${date}` : ""
              }?`,
              validate: () =>
                !city.trim() ? "Please enter a city." : null,
            })
          }
        >
          <label>
            City
            <input
              type="text"
              value={city}
              placeholder="e.g. Austin"
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </AgentCard>

        {/* ---- Stock ---- */}
        <AgentCard
          title="Stock Agent"
          subtitle="Get stock price info for a company or ticker."
          buttonLabel="Ask Stock Agent"
          loading={stock.loading}
          error={stock.error}
          response={stock.response}
          onSubmit={() =>
            runAgent({
              state: stock,
              agentId: STOCK_AGENT_ID,
              mockKey: "stock",
              message: `What is the stock price for ${ticker}?`,
              validate: () =>
                !ticker.trim()
                  ? "Please enter a company name or ticker."
                  : null,
            })
          }
        >
          <label>
            Company name or ticker
            <input
              type="text"
              value={ticker}
              placeholder="e.g. IBM"
              onChange={(e) => setTicker(e.target.value)}
            />
          </label>
        </AgentCard>

        {/* ---- Knowledge ---- */}
        <AgentCard
          title="Knowledge Agent"
          subtitle="Ask a question answered from a knowledge base."
          buttonLabel="Ask Knowledge Agent"
          loading={knowledge.loading}
          error={knowledge.error}
          response={knowledge.response}
          onSubmit={() =>
            runAgent({
              state: knowledge,
              agentId: KNOWLEDGE_AGENT_ID,
              mockKey: "knowledge",
              message: question,
              validate: () =>
                !question.trim() ? "Please enter a question." : null,
            })
          }
        >
          <label>
            Your question
            <textarea
              rows={3}
              value={question}
              placeholder="e.g. What is covered by the travel policy?"
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
        </AgentCard>
      </main>

      <footer className="app-footer">
        <p>
          {isMockMode
            ? "Running in mock mode. Set VITE_USE_MOCKS=false in .env to call real agents."
            : "Connected mode. Requests go to the configured Orchestrate server."}
        </p>
      </footer>
    </div>
  );
}
