import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

// Read the JWT the `orchestrate env activate` CLI cached locally.
function readOrchestrateToken(preferredEnv) {
  try {
    const credFile = path.join(
      os.homedir(),
      ".cache",
      "orchestrate",
      "credentials.yaml"
    );
    const raw = fs.readFileSync(credFile, "utf8");
    // Parse the env name that should be active, then look for its token.
    // YAML is minimal so a simple regex is fine here.
    const envName = preferredEnv || (() => {
      const m = raw.match(/active_env:\s*(\S+)/);
      return m ? m[1] : null;
    })();
    if (!envName) return null;
    // Find the token for the chosen env.
    const section = raw.split(/\n(?=\S)/g).find((s) => s.startsWith(envName + ":"));
    if (!section) return null;
    const m = section.match(/wxo_mcsp_token:\s*(\S+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Exchange a raw WO API key for a short-lived JWT via MCSP (AWS/SaaS).
async function exchangeMCSP(apiKey, authUrl) {
  const url =
    authUrl ||
    "https://iam.platform.saas.ibm.com/siusermgr/api/1.0/apikeys/token";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey }),
  });
  if (!res.ok) {
    throw new Error(`MCSP token exchange failed: HTTP ${res.status}`);
  }
  const json = await res.json();
  // Response: { token, expiration (unix ms) }
  return {
    token: json.token,
    exp: json.expiration ? Number(json.expiration) : Date.now() + 7_000_000,
  };
}

// Exchange a raw IBM Cloud API key for a short-lived IAM token.
async function exchangeIBMCloud(apiKey, authUrl) {
  const url = authUrl || "https://iam.cloud.ibm.com/identity/token";
  const body = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: apiKey,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`IBM Cloud IAM token exchange failed: HTTP ${res.status}`);
  }
  const json = await res.json();
  // Response: { access_token, expires_in }
  return {
    token: json.access_token,
    exp: Date.now() + (json.expires_in ? json.expires_in * 1000 : 3_600_000),
  };
}

// In-memory token cache (per dev-server process).
const tokenState = { value: null, exp: 0, busy: false };

async function getToken(opts) {
  // Return cached token if it won't expire in the next 60 s.
  if (tokenState.value && tokenState.exp > Date.now() + 60_000) {
    return tokenState.value;
  }
  // Avoid simultaneous refresh races.
  if (tokenState.busy) {
    await new Promise((r) => setTimeout(r, 500));
    return tokenState.value;
  }
  tokenState.busy = true;
  try {
    if (opts.apiKey) {
      const result =
        opts.authType === "ibm_iam"
          ? await exchangeIBMCloud(opts.apiKey, opts.authUrl)
          : await exchangeMCSP(opts.apiKey, opts.authUrl);
      tokenState.value = result.token;
      tokenState.exp = result.exp;
      console.log(`[proxy] minted fresh ${opts.authType || "mcsp"} token`);
    } else {
      // Fall back to the CLI-cached token.
      const cached = readOrchestrateToken(opts.envName);
      if (cached) {
        tokenState.value = cached;
        tokenState.exp = Date.now() + 3_600_000;
        console.log("[proxy] using cached orchestrate CLI token");
      } else {
        console.warn(
          "[proxy] No token available. Run: orchestrate env activate <env> --api-key <key>"
        );
      }
    }
  } catch (err) {
    console.error("[proxy] Token refresh error:", err.message);
    // Fall back to CLI token on exchange failure.
    const cached = readOrchestrateToken(opts.envName);
    if (cached) {
      tokenState.value = cached;
      tokenState.exp = Date.now() + 3_600_000;
      console.log("[proxy] falling back to CLI-cached token after error");
    }
  } finally {
    tokenState.busy = false;
  }
  return tokenState.value;
}

// ---------------------------------------------------------------------------
// Vite config
// ---------------------------------------------------------------------------

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const woInstance = env.WO_INSTANCE; // e.g. https://api.us-south.watson-orchestrate.ibm.com/instances/<id>
  const woApiKey = env.WO_API_KEY;
  const woAuthType = env.WO_AUTH_TYPE || "mcsp"; // "mcsp" | "ibm_iam"
  const woAuthUrl = env.WO_AUTH_URL || null;
  const woEnvName = env.WO_ENV_NAME || "saas";

  const tokenOpts = {
    apiKey: woApiKey,
    authType: woAuthType,
    authUrl: woAuthUrl,
    envName: woEnvName,
  };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: woInstance
        ? {
            // All /api/* calls are forwarded to the WO instance.
            // The proxy injects the Authorization header server-side so the
            // JWT never reaches the browser and CORS is avoided entirely.
            "/api": {
              target: woInstance,
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/api/, ""),
              configure: (proxy) => {
                proxy.on("proxyReq", async (proxyReq) => {
                  const token = await getToken(tokenOpts);
                  if (token) {
                    proxyReq.setHeader("Authorization", `Bearer ${token}`);
                  }
                });
                proxy.on("error", (err) => {
                  console.error("[proxy] error:", err.message);
                });
              },
            },
          }
        : undefined,
    },
  };
});
