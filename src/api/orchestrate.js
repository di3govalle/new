// orchestrate.js
//
// Small helper for talking to watsonx Orchestrate agents through the /runs API.
//
// The flow is:
//   1. POST /v1/orchestrate/runs        -> returns a run_id
//   2. GET  /v1/orchestrate/runs/{id}   -> poll until a final answer is ready
//
// Everything here is written defensively so the UI can fail gracefully when
// the local Developer Edition server is off, an agent id is missing, or the
// response shape is not what we expect.

// ---- Environment configuration -------------------------------------------

const BASE_URL = import.meta.env.VITE_ORCHESTRATE_BASE_URL;
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export const WEATHER_AGENT_ID = import.meta.env.VITE_WEATHER_AGENT_ID;
export const STOCK_AGENT_ID = import.meta.env.VITE_STOCK_AGENT_ID;
export const KNOWLEDGE_AGENT_ID = import.meta.env.VITE_KNOWLEDGE_AGENT_ID;

// Whether the app is running in mock mode. Exported so the UI can show a badge.
export const isMockMode = USE_MOCKS;

// Polling settings for the GET endpoint.
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 15;

// ---- Mock responses --------------------------------------------------------
// These let the whole app be demoed before any real agent is deployed.

const MOCK_RESPONSES = {
  weather:
    "Mock weather response: The weather in Austin on the selected date looks " +
    "warm and clear. Replace this with the real Weather Agent response after " +
    "the agent is deployed.",
  stock:
    "Mock stock response: IBM is showing a sample stock result. Replace this " +
    "with the real Stock Agent response after the stock tool is connected.",
  knowledge:
    "Mock knowledge response: This is a sample knowledge-base answer. " +
    "Citations will appear here once a watsonx Orchestrate knowledge base is " +
    "connected.",
};

function buildMockResult(mockKey) {
  // Simulate a tiny bit of network latency so loading states are visible.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        text: MOCK_RESPONSES[mockKey] || "Mock response.",
        citations: [],
        raw: null,
        mock: true,
      });
    }, 600);
  });
}

// ---- Helpers ---------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Try hard to pull a human-readable answer out of whatever the API returns.
// The /runs response shape can vary, so we check the common locations and
// fall back to the raw JSON if nothing obvious is found.
function extractAnswer(data) {
  if (!data || typeof data !== "object") {
    return { text: "", citations: [], found: false };
  }

  let text = "";

  // Common shapes seen from the /runs GET response.
  if (typeof data.result?.message?.content === "string") {
    text = data.result.message.content;
  } else if (typeof data.message?.content === "string") {
    text = data.message.content;
  } else if (typeof data.output?.content === "string") {
    text = data.output.content;
  } else if (Array.isArray(data.messages) && data.messages.length > 0) {
    const last = data.messages[data.messages.length - 1];
    if (typeof last?.content === "string") {
      text = last.content;
    }
  } else if (typeof data.content === "string") {
    text = data.content;
  }

  // Citations from a knowledge base, if present.
  const citations =
    data.result?.citations ||
    data.citations ||
    data.message?.citations ||
    [];

  return {
    text: text.trim(),
    citations: Array.isArray(citations) ? citations : [],
    found: text.trim().length > 0,
  };
}

// Decide whether a run is still in progress based on a status field.
function isRunComplete(data) {
  const status = (data?.status || data?.result?.status || "").toLowerCase();
  if (!status) {
    // No status field: rely on whether we found an answer instead.
    return extractAnswer(data).found;
  }
  return ["completed", "complete", "succeeded", "success", "done"].includes(
    status
  );
}

// ---- Public API ------------------------------------------------------------

/**
 * Send a message to an Orchestrate agent and wait for the final response.
 *
 * @param {Object}  params
 * @param {string}  params.agentId   The agent id to target.
 * @param {string}  params.message   The user's message.
 * @param {string}  [params.baseUrl] Override base url (defaults to env value).
 * @param {string}  [params.mockKey] Which mock response to use in mock mode.
 * @returns {Promise<{text: string, citations: Array, raw: any, mock: boolean}>}
 */
export async function sendMessageToAgent({
  agentId,
  message,
  baseUrl = BASE_URL,
  mockKey,
}) {
  // ---- Mock mode: short-circuit before touching the network. ----
  if (USE_MOCKS) {
    return buildMockResult(mockKey);
  }

  // ---- Validate configuration before making any request. ----
  if (!baseUrl) {
    throw new Error(
      "Orchestrate base URL is not configured. Set VITE_ORCHESTRATE_BASE_URL " +
        "in your .env file (copy it from .env.example)."
    );
  }
  if (!agentId || agentId.startsWith("replace-with")) {
    throw new Error(
      "This agent's id is not configured yet. Set the matching " +
        "VITE_*_AGENT_ID value in your .env file once the agent is imported."
    );
  }
  if (!message || !message.trim()) {
    throw new Error("Please enter a message before sending.");
  }

  const root = baseUrl.replace(/\/$/, "");

  // ---- Step 1: POST to start a run. ----
  let postData;
  try {
    const postRes = await fetch(`${root}/v1/orchestrate/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { role: "user", content: message },
        additional_properties: {},
        context: {},
        agent_id: agentId,
      }),
    });

    if (!postRes.ok) {
      throw new Error(
        `Failed to start run (HTTP ${postRes.status}). Is the Orchestrate ` +
          `server running and the agent imported?`
      );
    }
    postData = await postRes.json();
  } catch (err) {
    // Network-level failure (server off, CORS, DNS, etc).
    if (err instanceof TypeError) {
      throw new Error(
        "Could not reach the Orchestrate server. Make sure the local " +
          "Developer Edition is running and VITE_ORCHESTRATE_BASE_URL is correct."
      );
    }
    throw err;
  }

  const runId = postData?.run_id;
  if (!runId) {
    throw new Error(
      "The server did not return a run_id. Raw response:\n" +
        JSON.stringify(postData, null, 2)
    );
  }

  // ---- Step 2: Poll the GET endpoint for the final answer. ----
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    let getData;
    try {
      const getRes = await fetch(`${root}/v1/orchestrate/runs/${runId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!getRes.ok) {
        throw new Error(
          `Failed to read run result (HTTP ${getRes.status}).`
        );
      }
      getData = await getRes.json();
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(
          "Lost connection to the Orchestrate server while waiting for a " +
            "response."
        );
      }
      throw err;
    }

    if (isRunComplete(getData)) {
      const answer = extractAnswer(getData);
      if (answer.found) {
        return {
          text: answer.text,
          citations: answer.citations,
          raw: getData,
          mock: false,
        };
      }
      // Completed but we could not parse it: show the raw JSON instead.
      return {
        text:
          "The run completed but the response shape was unexpected. Raw " +
          "response:\n" +
          JSON.stringify(getData, null, 2),
        citations: answer.citations,
        raw: getData,
        mock: false,
      };
    }
  }

  // ---- Timed out: no final answer within the polling window. ----
  throw new Error(
    "Run started, but no final response was returned yet. Check the " +
      "Orchestrate server or Agent Builder."
  );
}
