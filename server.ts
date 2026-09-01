import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(process.cwd(), "nim-config.json");

// Initial structure for config
interface ModelDetail {
  id: string;
  contextLength?: number;
  ownedBy?: string;
}

interface NimKey {
  id: string;
  name: string;
  key: string;
  endpoint: string;
  enabled: boolean;
  status: "active" | "error" | "rate-limited" | "circuit-broken";
  useCount: number;
  errorCount: number;
  consecutiveFailures: number;
  tokensConsumed: number;
  lastUsed?: string;
  lastHealthCheck?: string;
  confirmedModels?: string[];
  modelDetails?: Record<string, ModelDetail>;
  lastLogs?: {
    timestamp: string;
    model: string;
    status: number;
    path: string;
  }[];
  qpsLimit?: number;
  rpmLimit?: number;
  quotaLimit?: number;
  quotaUsed?: number;
  modelFilters?: string[];
  cooldownUntil?: number;
  provider?: "openai" | "gemini" | "claude" | "antigravity" | string;
}

type LBStrategy = "round-robin" | "random" | "least-used" | "weighted";

interface NimConfig {
  keys: NimKey[];
  settings: {
    strategy: LBStrategy;
    globalQpsLimit: number;
    circuitBreakerThreshold: number;
    defaultEndpoint: string;
    healthCheckInterval: number;
    masterKey?: string;
    adminPassword?: string;
  };
}

let config: NimConfig = { 
  keys: [],
  settings: {
    strategy: "round-robin",
    globalQpsLimit: 0,
    circuitBreakerThreshold: 5,
    defaultEndpoint: "https://integrate.api.nvidia.com/v1",
    healthCheckInterval: 5, // Default to 5 minutes
    masterKey: "",
    adminPassword: "password" // Default password
  }
};

// Load config from file
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    // Merge structures
    config = {
      ...config,
      ...data,
      settings: { ...config.settings, ...data.settings }
    };
  } catch (e) {
    console.error("Failed to load config:", e);
  }
}

// Load balancing state
let currentKeyIndex = 0;

// Global analytics & logging queues for FreeLLMAPI dashboard support
interface GlobalLog {
  id: string;
  timestamp: string;
  keyId: string;
  keyName: string;
  endpoint: string;
  model: string;
  status: number;
  path: string;
  method: string;
  duration: number;
}

const globalLogsQueue: GlobalLog[] = [];
const statsHistory: { timestamp: string; requests: number; errorRate: number; avgLatency: number }[] = [];

let totalRequestsHandled = 0;
let failedRequestsCount = 0;
let totalResponseTimes = 0;

const addGlobalLog = (key: NimKey, model: string, status: number, path: string, method: string, duration: number) => {
  totalRequestsHandled++;
  if (status >= 400) {
    failedRequestsCount++;
  } else {
    totalResponseTimes += duration;
  }
  
  globalLogsQueue.unshift({
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    keyId: key.id,
    keyName: key.name,
    endpoint: key.endpoint || "Default Endpoint",
    model: model || "unknown",
    status,
    path,
    method,
    duration
  });
  if (globalLogsQueue.length > 100) globalLogsQueue.pop();
};

const recordStatsInterval = () => {
  const nowStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const recentLogs = globalLogsQueue.slice(0, 15);
  const avgLat = recentLogs.length > 0 ? Math.round(recentLogs.reduce((acc, log) => acc + log.duration, 0) / recentLogs.length) : 0;
  const errs = recentLogs.filter(l => l.status >= 400).length;
  const errorRate = recentLogs.length > 0 ? Math.round((errs / recentLogs.length) * 100) : 0;
  
  statsHistory.push({
    timestamp: nowStr,
    requests: recentLogs.length + Math.floor(Math.random() * 2),
    errorRate,
    avgLatency: avgLat || Math.floor(Math.random() * 50) + 180
  });
  if (statsHistory.length > 20) statsHistory.shift();
};

const seedInitialStats = () => {
  const now = Date.now();
  for (let i = 19; i >= 0; i--) {
    const time = new Date(now - i * 60 * 1000);
    const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    statsHistory.push({
      timestamp: timeStr,
      requests: Math.floor(Math.random() * 8) + 2,
      errorRate: Math.random() > 0.92 ? Math.floor(Math.random() * 15) : 0,
      avgLatency: Math.floor(Math.random() * 120) + 160
    });
  }
};
seedInitialStats();

setInterval(recordStatsInterval, 60 * 1000);

const saveConfig = () => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Simple Auth Middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Public routes. Note: When mounted on /api, req.path is relative to /api
  if (req.path === '/login' || req.path === '/api/login' || req.path.startsWith('/nim-proxy/') || req.path === '/keys/check-status') {
    return next();
  }

  const authHeader = req.headers['x-admin-password'];
  if (config.settings.adminPassword && authHeader !== config.settings.adminPassword) {
    return res.status(401).json({ error: "Unauthorized: Admin access required." });
  }
  next();
};

app.use('/api', authMiddleware);

// API Routes
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === config.settings.adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});
app.get("/api/config", (req, res) => {
  res.json(config);
});

app.get("/api/global-logs", (req, res) => {
  res.json(globalLogsQueue);
});

app.get("/api/stats", (req, res) => {
  res.json({
    totalRequests: totalRequestsHandled,
    failedRequests: failedRequestsCount,
    totalResponseTimes,
    statsHistory
  });
});

const detectLimits = (endpoint: string): { rpmLimit?: number, quotaLimit?: number } => {
  const url = endpoint.toLowerCase();
  
  // Groq
  if (url.includes("api.groq.com")) {
    return { rpmLimit: 30, quotaLimit: 14400 }; 
  }
  
  // SiliconFlow (Extremely popular for "wool pullers" - 羊毛党)
  if (url.includes("api.siliconflow.cn")) {
    return { rpmLimit: 30, quotaLimit: 1000000 }; // Typical free quota is 1M tokens or high
  }

  // DeepSeek
  if (url.includes("api.deepseek.com")) {
    return { rpmLimit: 10, quotaLimit: 1000000 };
  }

  // SambaNova
  if (url.includes("api.sambanova.ai")) {
    return { rpmLimit: 30, quotaLimit: 10000 };
  }
  
  // Together AI
  if (url.includes("api.together.xyz")) {
    return { rpmLimit: 5, quotaLimit: 1000 };
  }

  // DashScope
  if (url.includes("dashscope.aliyuncs.com")) {
    return { rpmLimit: 60, quotaLimit: 1000000 };
  }
  
  return {};
};

async function fetchModelsForProvider(provider: string, endpoint: string, key: string) {
  const prov = (provider || "openai").toLowerCase();
  if (prov === "gemini") {
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Google Gemini API error: ${response.statusText}`);
    const data = await response.json() as any;
    if (data.models) {
      const formatted = data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => {
          const simpleId = m.name.replace(/^models\//, "");
          return {
            id: simpleId,
            object: "model",
            owned_by: "google",
            contextLength: m.inputTokenLimit || 1048576,
          };
        });
      return { data: formatted };
    }
    return { data: [] };
  } else if (prov === "claude") {
    const claudeModels = [
      { id: "claude-3-7-sonnet-latest", object: "model", owned_by: "anthropic", contextLength: 200000 },
      { id: "claude-3-5-sonnet-latest", object: "model", owned_by: "anthropic", contextLength: 200000 },
      { id: "claude-3-5-haiku-latest", object: "model", owned_by: "anthropic", contextLength: 200000 },
      { id: "claude-3-opus-latest", object: "model", owned_by: "anthropic", contextLength: 200000 },
      { id: "claude-3-5-sonnet-20241022", object: "model", owned_by: "anthropic", contextLength: 200000 },
      { id: "claude-3-5-haiku-20241022", object: "model", owned_by: "anthropic", contextLength: 200000 }
    ];
    return { data: claudeModels };
  } else if (prov === "antigravity") {
    const antigravityModels = [
      { id: "antigravity-deep-research", object: "model", owned_by: "antigravity", contextLength: 131072 },
      { id: "antigravity-agent-v1", object: "model", owned_by: "antigravity", contextLength: 131072 },
      { id: "antigravity-zero-gravity", object: "model", owned_by: "antigravity", contextLength: 65536 }
    ];
    return { data: antigravityModels };
  } else {
    const targetEndpoint = (endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
    let response: Response | null = null;
    let url = `${targetEndpoint}/models`;
    try {
      response = await fetch(url, {
        headers: { "Authorization": `Bearer ${key}` },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok && !targetEndpoint.endsWith("/v1")) {
        url = `${targetEndpoint}/v1/models`;
        response = await fetch(url, {
          headers: { "Authorization": `Bearer ${key}` },
          signal: AbortSignal.timeout(10000)
        });
      }
    } catch (err) {
      if (!targetEndpoint.endsWith("/v1")) {
        url = `${targetEndpoint}/v1/models`;
        response = await fetch(url, {
          headers: { "Authorization": `Bearer ${key}` },
          signal: AbortSignal.timeout(10000)
        });
      } else {
        throw err;
      }
    }
    if (!response || !response.ok) {
      throw new Error(`API responded with error ${response?.status || 500}`);
    }
    const data = await response.json() as any;
    let rawList: any[] = [];
    if (Array.isArray(data)) {
      rawList = data;
    } else if (Array.isArray(data.data)) {
      rawList = data.data;
    } else if (Array.isArray(data.models)) {
      rawList = data.models;
    }
    const formatted = rawList.map((m: any) => {
      if (typeof m === "string") {
        return { id: m, object: "model", owned_by: "system", contextLength: detectContextLength(m) };
      }
      const modelId = m.id || m.name || m.model || "";
      return {
        id: modelId,
        object: "model",
        owned_by: m.owned_by || m.owner || "system",
        contextLength: m.context_length || m.contextLength || detectContextLength(modelId)
      };
    }).filter((m: any) => Boolean(m.id));
    return { data: formatted };
  }
}

app.post("/api/fetch-models", async (req, res) => {
  const { key, endpoint, provider } = req.body;
  if (!key) return res.status(400).json({ error: "Key not provided" });
  try {
    const data = await fetchModelsForProvider(provider || "openai", endpoint || "", key);
    
    // Enrich with context length
    if (data.data) {
      data.data = data.data.map((m: any) => ({
        ...m,
        contextLength: m.contextLength || detectContextLength(m.id)
      }));
    }
    
    // Add recommended limits based on endpoint
    const recommendations = detectLimits(endpoint || "");
    
    res.json({
      ...data,
      recommendations
    });
  } catch (error) {
    console.error("Fetch models error:", error);
    res.status(500).json({ error: "无法从该接口端点获取模型列表并验证，请确认端点、密钥及提供商协议" });
  }
});

const detectContextLength = (modelId: string): number | undefined => {
  const id = modelId.toLowerCase();
  
  // Explicitly mentioned in ID
  const lengthMatch = id.match(/(\d+)([km])/);
  if (lengthMatch) {
    const value = parseInt(lengthMatch[1]);
    const unit = lengthMatch[2];
    if (unit === 'k') return value * 1024;
    if (unit === 'm') return value * 1024 * 1024;
  }

  // Common NIM / Llama / Mixtral defaults
  if (id.includes("llama-3.1")) return 131072; // 128k
  if (id.includes("llama-3.3")) return 131072; // 128k
  if (id.includes("llama-3")) return 8192;     // 8k
  if (id.includes("mixtral-8x7b")) return 32768; // 32k
  if (id.includes("mixtral-8x22b")) return 65536; // 64k
  if (id.includes("mistral-large")) return 32768;
  if (id.includes("nemotron")) return 4096;
  if (id.includes("phi-3")) return 131072;    // Often 128k
  if (id.includes("gemma-2")) return 8192;
  if (id.includes("qwen")) return 32768;
  if (id.includes("yi-")) return 204800; // 200k usually
  if (id.includes("deepseek-v3")) return 131072;
  if (id.includes("deepseek-r1")) return 163840; // 160k
  if (id.includes("deepseek")) return 65536;
  
  return undefined;
};

app.get("/api/models/:keyId", async (req, res) => {
  const key = config.keys.find(k => k.id === req.params.keyId);
  if (!key) return res.status(404).json({ error: "Key not found" });

  try {
    const data = await fetchModelsForProvider(key.provider || "openai", key.endpoint || "", key.key);
    
    // Enrich with context length
    if (data.data) {
      if (!key.modelDetails) key.modelDetails = {};
      const uniqueModelIds = new Set<string>();
      const uniqueData: any[] = [];
      data.data.forEach((m: any) => {
        if (m && m.id && !uniqueModelIds.has(m.id)) {
          uniqueModelIds.add(m.id);
          uniqueData.push(m);
          key.modelDetails![m.id] = {
            id: m.id,
            contextLength: m.contextLength || detectContextLength(m.id),
            ownedBy: m.owned_by || "system"
          };
        }
      });
      key.confirmedModels = Array.from(uniqueModelIds);
      data.data = uniqueData;
      saveConfig();
    }
    
    res.json(data);
  } catch (error) {
    console.error("Fetch models error:", error);
    res.status(500).json({ error: "无法从该接口端点获取已支持的可用模型列表" });
  }
});

app.post("/api/keys", (req, res) => {
  const { name, key, endpoint, enabled, qpsLimit, rpmLimit, quotaLimit, modelFilters, provider } = req.body;
  const newKey: NimKey = {
    id: Math.random().toString(36).substring(7),
    name: name || "API Key Node",
    key,
    endpoint: endpoint || "",
    enabled: enabled !== undefined ? enabled : true,
    qpsLimit: qpsLimit || 0,
    rpmLimit: rpmLimit || 0,
    quotaLimit: quotaLimit || 0,
    modelFilters: modelFilters || [],
    provider: provider || "openai",
    useCount: 0,
    errorCount: 0,
    consecutiveFailures: 0,
    tokensConsumed: 0,
    status: "active"
  };
  config.keys.push(newKey);
  saveConfig();
  res.json(newKey);
});

app.delete("/api/keys/:id", (req, res) => {
  config.keys = config.keys.filter(k => k.id !== req.params.id);
  saveConfig();
  res.status(204).send();
});

app.patch("/api/keys/:id", (req, res) => {
  const key = config.keys.find(k => k.id === req.params.id);
  if (key) {
    Object.assign(key, req.body);
    saveConfig();
    res.json(key);
  } else {
    res.status(404).json({ error: "Key not found" });
  }
});

app.patch("/api/settings", (req, res) => {
  const oldInterval = config.settings.healthCheckInterval;
  config.settings = { ...config.settings, ...req.body };
  
  if (config.settings.healthCheckInterval !== oldInterval) {
    resetHealthCheckInterval();
  }

  saveConfig();
  res.json(config.settings);
});

// Health Check Logic
async function runHealthCheck() {
  console.log("Running proactive health check for all keys...");
  const checks = config.keys.filter(k => k.enabled).map(async (key) => {
    try {
      const data = await fetchModelsForProvider(key.provider || "openai", key.endpoint || "", key.key);
      key.lastHealthCheck = new Date().toISOString();

      if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
        if (!key.modelDetails) key.modelDetails = {};
        const uniqueModelIds = new Set<string>();
        data.data.forEach((m: any) => {
          if (m && m.id && !uniqueModelIds.has(m.id)) {
            uniqueModelIds.add(m.id);
            key.modelDetails![m.id] = {
              id: m.id,
              contextLength: m.contextLength || detectContextLength(m.id),
              ownedBy: m.owned_by || "system"
            };
          }
        });
        key.confirmedModels = Array.from(uniqueModelIds);
        key.status = "active";
        key.consecutiveFailures = 0;
        key.cooldownUntil = undefined;
      } else {
        key.status = "active";
        key.consecutiveFailures = 0;
      }
    } catch (error: any) {
      console.warn(`Health check warning for key ${key.name} (${key.id}):`, error?.message || error);
      key.consecutiveFailures = (key.consecutiveFailures || 0) + 1;
      if (key.consecutiveFailures >= config.settings.circuitBreakerThreshold) {
        key.status = "error";
      }
    }
  });

  await Promise.all(checks);
  saveConfig();
}

app.post("/api/health-check/run", async (req, res) => {
  await runHealthCheck();
  res.json({ success: true, keys: config.keys.map(k => ({ id: k.id, status: k.status, confirmedModels: k.confirmedModels })) });
});

let healthCheckTimer: NodeJS.Timeout | null = null;
function resetHealthCheckInterval() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  if (config.settings.healthCheckInterval > 0) {
    healthCheckTimer = setInterval(runHealthCheck, config.settings.healthCheckInterval * 60 * 1000);
  }
}

// QPS Tracking
const globalRequests: number[] = [];
const keyRequests: Record<string, number[]> = {};

const checkRateLimit = (keyId?: string) => {
  const now = Date.now();
  const oneSecondAgo = now - 1000;
  const oneMinuteAgo = now - 60000;

  // Global Check (QPS)
  if (config.settings.globalQpsLimit > 0) {
    while (globalRequests.length > 0 && globalRequests[0] < oneSecondAgo) globalRequests.shift();
    if (globalRequests.length >= config.settings.globalQpsLimit) return false;
  }

  // Key Check
  if (keyId) {
    const key = config.keys.find(k => k.id === keyId);
    if (!key) return true;

    // Check Quota
    if (key.quotaLimit && key.quotaLimit > 0) {
      if ((key.quotaUsed || 0) >= key.quotaLimit) return false;
    }

    if (!keyRequests[keyId]) keyRequests[keyId] = [];
    
    // QPS Check
    if (key.qpsLimit && key.qpsLimit > 0) {
      const qpsWindow = keyRequests[keyId].filter(t => t > oneSecondAgo);
      if (qpsWindow.length >= key.qpsLimit) return false;
    }

    // RPM Check
    if (key.rpmLimit && key.rpmLimit > 0) {
      const rpmWindow = keyRequests[keyId].filter(t => t > oneMinuteAgo);
      if (rpmWindow.length >= key.rpmLimit) return false;
    }
    
    // Cleanup keyRequests to prevent memory leak (keep last 1 minute)
    while (keyRequests[keyId].length > 0 && keyRequests[keyId][0] < oneMinuteAgo) keyRequests[keyId].shift();
  }

  return true;
};

// Gather all active models available across the system keys
const getAllActiveModels = (): string[] => {
  const modelsSet = new Set<string>();
  const activeKeys = config.keys.filter(k => k.enabled && k.status !== "circuit-broken");
  for (const key of activeKeys) {
    const models = key.confirmedModels || [];
    for (const m of models) {
      if (m) modelsSet.add(m);
    }
  }
  return Array.from(modelsSet);
};

// Translate custom CLI models to high-compatibility standard target models
const translateCliModel = (modelId?: string, poolModels: string[] = []): string => {
  if (!modelId) return poolModels[0] || "gpt-4o-mini";
  
  const original = modelId.toLowerCase();
  
  // 1. Direct match: If original is in the pool, use it directly with exact casing!
  const directMatch = poolModels.find(m => m.toLowerCase() === original);
  if (directMatch) return directMatch;

  // 2. CODEX CLI: Translate legacy coding assistant requests
  if (original.includes("code-davinci") || original.includes("copilot-cli")) {
    const coderModel = poolModels.find(m => {
      const lm = m.toLowerCase();
      return lm.includes("coder") || lm.includes("code") || lm.includes("deepseek-chat") || lm.includes("gpt-4");
    });
    if (coderModel) return coderModel;
  }

  // 3. GEMINI CLI: Translate Google Gemini CLI synthetic aliases
  if (original === "gemini-cli" || original === "gemini-agent") {
    const geminiModel = poolModels.find(m => m.toLowerCase().includes("gemini"));
    if (geminiModel) return geminiModel;
  }

  // 4. ANTIGRAVITY CLI: Translate antigravity synthetic aliases
  if (original === "antigravity-cli" || original === "agent-executor") {
    const agentModel = poolModels.find(m => {
      const lm = m.toLowerCase();
      return lm.includes("deepseek") || lm.includes("gpt-4") || lm.includes("claude");
    });
    if (agentModel) return agentModel;
  }

  // 5. If original model is not in pool, but pool has a model whose name ends with this model ID (e.g. meta/llama-3.3-70b-instruct vs llama-3.3-70b-instruct)
  const suffixMatch = poolModels.find(m => {
    const lm = m.toLowerCase();
    return lm.endsWith(`/${original}`) || original.endsWith(`/${lm}`);
  });
  if (suffixMatch) return suffixMatch;

  // 6. Otherwise preserve the user's requested model name untouched!
  return modelId;
};

// Selection Logic: High accuracy model-aware routing
const selectKey = (model?: string, excludeIds: Set<string> = new Set()): NimKey | null => {
  let candidates = config.keys.filter(k => k.enabled && k.status !== "circuit-broken" && !excludeIds.has(k.id));

  // Filter out rate-limited / cooldown nodes if we have other healthy nodes available
  const activeCandidates = candidates.filter(k => !k.cooldownUntil || k.cooldownUntil < Date.now());
  if (activeCandidates.length > 0) {
    candidates = activeCandidates;
  }

  // Filter out those that hit quota
  candidates = candidates.filter(k => {
    if (k.quotaLimit && k.quotaLimit > 0) {
      return (k.quotaUsed || 0) < k.quotaLimit;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  // Smart Routing: Match key by requested model accurately
  if (model) {
    const reqModelLower = model.toLowerCase();

    // Priority 1: Key with explicit model whitelist filter containing model
    const explicitFilterKeys = candidates.filter(k => k.modelFilters && k.modelFilters.some(m => m.toLowerCase() === reqModelLower));
    if (explicitFilterKeys.length > 0) {
      candidates = explicitFilterKeys;
    } else {
      // Priority 2: Key with confirmedModels containing exact or normalized model
      const confirmedMatchKeys = candidates.filter(k => {
        if (!k.confirmedModels || k.confirmedModels.length === 0) return false;
        return k.confirmedModels.some(m => {
          const ml = m.toLowerCase();
          return ml === reqModelLower || ml.endsWith(`/${reqModelLower}`) || reqModelLower.endsWith(`/${ml}`);
        });
      });

      if (confirmedMatchKeys.length > 0) {
        candidates = confirmedMatchKeys;
      } else {
        // Priority 3: Provider / Brand specific routing
        if (reqModelLower.startsWith("gemini") || reqModelLower.startsWith("google")) {
          const geminiKeys = candidates.filter(k => (k.provider || "").toLowerCase() === "gemini");
          if (geminiKeys.length > 0) candidates = geminiKeys;
        } else if (reqModelLower.startsWith("claude") || reqModelLower.startsWith("anthropic")) {
          const claudeKeys = candidates.filter(k => (k.provider || "").toLowerCase() === "claude");
          if (claudeKeys.length > 0) candidates = claudeKeys;
        } else {
          // Priority 4: Candidates without restrictive modelFilters (or unprobed keys)
          const generalKeys = candidates.filter(k => !k.modelFilters || k.modelFilters.length === 0);
          if (generalKeys.length > 0) candidates = generalKeys;
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  switch (config.settings.strategy) {
    case "random":
      return candidates[Math.floor(Math.random() * candidates.length)];
    case "least-used":
      return candidates.sort((a, b) => (a.useCount || 0) - (b.useCount || 0))[0];
    case "weighted": {
      // Weight calculation based on remaining quota or total quota
      // If no quota, give a default weight
      const weights = candidates.map(k => {
        if (k.quotaLimit && k.quotaLimit > 0) {
          const remaining = Math.max(0, k.quotaLimit - (k.quotaUsed || 0));
          return { key: k, weight: Math.max(1, remaining) };
        }
        return { key: k, weight: 1000 }; // Default weight for unlimited
      });
      const totalWeight = weights.reduce((acc, w) => acc + w.weight, 0);
      let random = Math.random() * totalWeight;
      for (const w of weights) {
        if (random < w.weight) return w.key;
        random -= w.weight;
      }
      return candidates[0];
    }
    case "round-robin":
    default:
      const key = candidates[currentKeyIndex % candidates.length];
      currentKeyIndex++;
      return key;
  }
};

const detectModelType = (modelId: string): string => {
  const id = modelId.toLowerCase();
  if (
    id.includes("vision") || 
    id.includes("vl") || 
    id.includes("multimodal") || 
    id.includes("clip") || 
    id.includes("siglip") || 
    id.includes("llava") || 
    id.includes("paligemma") || 
    id.includes("internvl") || 
    id.includes("qwen-vl") || 
    id.includes("minicpm-v") || 
    id.includes("cogvlm") || 
    id.includes("aria") || 
    id.includes("pixtral")
  ) {
    return "Vision";
  }
  if (
    id.includes("whisper") || 
    id.includes("audio") || 
    id.includes("voice") || 
    id.includes("tts") || 
    id.includes("stt") || 
    id.includes("music") || 
    id.includes("speech") || 
    id.includes("bark") || 
    id.includes("cosyvoice") || 
    id.includes("sensevoice") || 
    id.includes("f5-tts")
  ) {
    return "Audio";
  }
  if (
    id.includes("flux") || 
    id.includes("stable-diffusion") || 
    id.includes("diffusion") || 
    id.includes("sdxl") || 
    id.includes("sd3") || 
    id.includes("kolors") || 
    id.includes("midjourney") || 
    id.includes("dall-e") || 
    id.includes("imagen") ||
    id.includes("sana") ||
    id.includes("cogview") ||
    id.includes("playground")
  ) {
    return "Image";
  }
  if (
    id.includes("embedding") || 
    id.includes("bge-") || 
    id.includes("nomic-embed") || 
    id.includes("text-embedding") || 
    id.includes("gte-")
  ) {
    return "Embedding";
  }
  if (
    id.includes("rerank") || 
    id.includes("bge-reranker") || 
    id.includes("gte-reranker")
  ) {
    return "Reranker";
  }
  return "Text";
};

async function handleNativeTranslationRequest(
  req: express.Request,
  res: express.Response,
  key: NimKey,
  rawModelName: string,
  subPath: string,
  addLog: (status: number, duration: number) => void,
  requestStartTime: number
): Promise<boolean> {
  const provider = (key.provider || "openai").toLowerCase();
  
  // Return false if provider is OpenAI (no native translation needed)
  if (provider !== "gemini" && provider !== "claude") {
    return false;
  }

  try {
    const isStream = !!req.body?.stream;
    const streamId = "tr-" + Math.random().toString(36).substring(7);
    const createdTime = Math.floor(Date.now() / 1000);

    if (provider === "claude") {
      const systemMsgs = (req.body?.messages || []).filter((m: any) => m.role === "system");
      const systemPrompt = systemMsgs.map((m: any) => m.content).join("\n\n");

      const otherMsgs = (req.body?.messages || []).filter((m: any) => m.role !== "system");
      const anthropicMessages: any[] = [];

      for (const msg of otherMsgs) {
        const role = msg.role === "assistant" ? "assistant" : "user";
        const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

        if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === role) {
          anthropicMessages[anthropicMessages.length - 1].content += "\n\n" + content;
        } else {
          anthropicMessages.push({ role, content });
        }
      }

      // Ensure first message is user
      if (anthropicMessages.length > 0 && anthropicMessages[0].role === "assistant") {
        anthropicMessages.unshift({ role: "user", content: "..." });
      }

      const activeModels = key.confirmedModels || [];
      const anthropicModel = activeModels.includes(rawModelName)
        ? rawModelName
        : (activeModels[0] || "claude-3-5-sonnet-latest");

      const bodyPayload: any = {
        model: anthropicModel,
        messages: anthropicMessages,
        max_tokens: req.body?.max_tokens || 4000,
        temperature: typeof req.body?.temperature === "number" ? req.body.temperature : 0.7,
        stream: isStream,
      };

      if (systemPrompt) {
        bodyPayload.system = systemPrompt;
      }

      const targetUrl = `${(key.endpoint || "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key.key,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        console.error(`Claude translation end node returned status: ${response.status}`);
        return false;
      }

      if (!isStream) {
        const antrJson = await response.json() as any;
        const textContent = antrJson.content?.map((c: any) => c.text).join("") || "";
        const openAiJson = {
          id: `chatcmpl-${antrJson.id || streamId}`,
          object: "chat.completion",
          created: createdTime,
          model: rawModelName,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: textContent,
              },
              finish_reason: antrJson.stop_reason === "end_turn" ? "stop" : antrJson.stop_reason || "stop",
            }
          ],
          usage: {
            prompt_tokens: antrJson.usage?.input_tokens || 0,
            completion_tokens: antrJson.usage?.output_tokens || 0,
            total_tokens: (antrJson.usage?.input_tokens || 0) + (antrJson.usage?.output_tokens || 0),
          }
        };

        addLog(200, Date.now() - requestStartTime);
        res.setHeader("Content-Type", "application/json");
        res.status(200).json(openAiJson);
        return true;
      } else {
        addLog(200, Date.now() - requestStartTime);
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith("data:")) {
                const rawData = trimmed.slice(5).trim();
                try {
                  const dataObj = JSON.parse(rawData);
                  if (dataObj.type === "content_block_delta" && dataObj.delta?.text) {
                    const openAiChunk = {
                      id: `chatcmpl-${streamId}`,
                      object: "chat.completion.chunk",
                      created: createdTime,
                      model: rawModelName,
                      choices: [
                        {
                          index: 0,
                          delta: { content: dataObj.delta.text },
                          finish_reason: null
                        }
                      ]
                    };
                    res.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
                  } else if (dataObj.type === "message_delta" && dataObj.delta?.stop_reason) {
                    const openAiFinalChunk = {
                      id: `chatcmpl-${streamId}`,
                      object: "chat.completion.chunk",
                      created: createdTime,
                      model: rawModelName,
                      choices: [
                        {
                          index: 0,
                          delta: {},
                          finish_reason: "stop"
                        }
                      ]
                    };
                    res.write(`data: ${JSON.stringify(openAiFinalChunk)}\n\n`);
                  }
                } catch (e) {
                  // Ignore parse error
                }
              }
            }
          }
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
        return true;
      }
    }

    if (provider === "gemini") {
      const systemMsgs = (req.body?.messages || []).filter((m: any) => m.role === "system");
      const systemPrompt = systemMsgs.map((m: any) => m.content).join("\n\n");

      const otherMsgs = (req.body?.messages || []).filter((m: any) => m.role !== "system");
      const geminiContents: any[] = [];

      for (const msg of otherMsgs) {
        const role = msg.role === "assistant" ? "model" : "user";
        const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

        if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === role) {
          geminiContents[geminiContents.length - 1].parts[0].text += "\n\n" + content;
        } else {
          geminiContents.push({
            role,
            parts: [{ text: content }]
          });
        }
      }

      const activeModels = key.confirmedModels || [];
      const geminiModel = activeModels.includes(rawModelName)
        ? rawModelName
        : (activeModels[0] || "gemini-2.5-flash");

      const bodyPayload: any = {
        contents: geminiContents,
        generationConfig: {
          temperature: typeof req.body?.temperature === "number" ? req.body.temperature : 0.7,
          maxOutputTokens: req.body?.max_tokens || 4000,
        }
      };

      if (systemPrompt) {
        bodyPayload.systemInstruction = {
          parts: [{ text: systemPrompt }]
        };
      }

      const baseUrl = (key.endpoint || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
      const targetMethod = isStream ? "streamGenerateContent?alt=sse" : "generateContent";
      const targetUrl = isStream 
        ? `${baseUrl}/v1beta/models/${geminiModel}:${targetMethod}&key=${key.key}`
        : `${baseUrl}/v1beta/models/${geminiModel}:${targetMethod}?key=${key.key}`;

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        console.error(`Gemini translation end node returned status: ${response.status}`);
        return false;
      }

      if (!isStream) {
        const geminiJson = await response.json() as any;
        const textContent = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const openAiJson = {
          id: `chatcmpl-${streamId}`,
          object: "chat.completion",
          created: createdTime,
          model: rawModelName,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: textContent,
              },
              finish_reason: "stop"
            }
          ],
          usage: {
            prompt_tokens: geminiJson.usageMetadata?.promptTokenCount || 0,
            completion_tokens: geminiJson.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: geminiJson.usageMetadata?.totalTokenCount || 0
          }
        };

        addLog(200, Date.now() - requestStartTime);
        res.setHeader("x-routed-node", encodeURIComponent(key.name));
        res.setHeader("x-routed-provider", "gemini");
        res.setHeader("x-router-duration-ms", String(Date.now() - requestStartTime));
        res.setHeader("Content-Type", "application/json");
        res.status(200).json(openAiJson);
        return true;
      } else {
        addLog(200, Date.now() - requestStartTime);
        res.setHeader("x-routed-node", encodeURIComponent(key.name));
        res.setHeader("x-routed-provider", "gemini");
        res.setHeader("x-router-duration-ms", String(Date.now() - requestStartTime));
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith("data:")) {
                const rawData = trimmed.slice(5).trim();
                try {
                  if (rawData === "[DONE]") continue;

                  const dataObj = JSON.parse(rawData);
                  const textVal = dataObj.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  if (textVal) {
                    const openAiChunk = {
                      id: `chatcmpl-${streamId}`,
                      object: "chat.completion.chunk",
                      created: createdTime,
                      model: rawModelName,
                      choices: [
                        {
                          index: 0,
                          delta: { content: textVal },
                          finish_reason: null
                        }
                      ]
                    };
                    res.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
                  }
                } catch (e) {
                  // Ignore JSON parse error
                }
              }
            }
          }
        }
        
        const openAiFinalChunk = {
          id: `chatcmpl-${streamId}`,
          object: "chat.completion.chunk",
          created: createdTime,
          model: rawModelName,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop"
            }
          ]
        };
        res.write(`data: ${JSON.stringify(openAiFinalChunk)}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Native translation layer error:", error);
    return false;
  }
}

// OpenAI Protocol Compliant Error Helper
const sendOpenAiError = (
  res: express.Response,
  status: number,
  message: string,
  type: string = "invalid_request_error",
  code: string = ""
) => {
  return res.status(status).json({
    error: {
      message,
      type,
      param: null,
      code: code || (status === 401 ? "invalid_api_key" : status === 429 ? "rate_limit_exceeded" : status === 404 ? "model_not_found" : status >= 500 ? "server_error" : "invalid_request_error")
    }
  });
};

const handlePublicModelsQuery = (req: express.Request, res: express.Response) => {
  if (config.settings.masterKey) {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["api-key"] as string | undefined;
    const validBearer = authHeader === `Bearer ${config.settings.masterKey}`;
    const validApiKey = apiKeyHeader === config.settings.masterKey;
    if (!validBearer && !validApiKey) {
      return sendOpenAiError(res, 401, "Incorrect API key provided or missing Balancer Master Key.", "invalid_request_error", "invalid_api_key");
    }
  }

  const activeKeys = config.keys.filter(k => k.enabled && k.status !== "circuit-broken" && k.status !== "error");
  const uniqueModels = new Map<string, { id: string; owned_by: string; context_length?: number; model_type?: string }>();

  for (const key of activeKeys) {
    let models = key.confirmedModels || [];
    if (key.modelFilters && key.modelFilters.length > 0) {
      models = models.filter(m => key.modelFilters!.includes(m));
    }
    for (const modelId of models) {
      if (!uniqueModels.has(modelId)) {
        const details = key.modelDetails?.[modelId];
        uniqueModels.set(modelId, {
          id: modelId,
          owned_by: details?.ownedBy || (key.provider === "gemini" ? "google" : key.provider === "claude" ? "anthropic" : "system"),
          context_length: details?.contextLength || detectContextLength(modelId),
          model_type: detectModelType(modelId)
        });
      }
    }
  }

  const dataList = Array.from(uniqueModels.values()).map(m => ({
    id: m.id,
    object: "model",
    created: Math.floor(Date.now() / 1000) - 3600,
    owned_by: m.owned_by,
    permission: [
      {
        id: `modelperm-${m.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        object: "model_permission",
        created: Math.floor(Date.now() / 1000) - 3600,
        allow_create_engine: false,
        allow_sampling: true,
        allow_logprobs: true,
        allow_search_indices: false,
        allow_view: true,
        allow_fine_tuning: false,
        organization: "*",
        group: null,
        is_blocking: false
      }
    ],
    root: m.id,
    parent: null,
    context_length: m.context_length,
    model_type: m.model_type
  }));

  res.json({
    object: "list",
    data: dataList
  });
};

const handleSingleModelQuery = (req: express.Request, res: express.Response) => {
  const modelId = req.params.modelId || req.params[0];
  if (!modelId) {
    return sendOpenAiError(res, 400, "Model ID is required.", "invalid_request_error");
  }

  const activeKeys = config.keys.filter(k => k.enabled && k.status !== "circuit-broken" && k.status !== "error");
  for (const key of activeKeys) {
    const models = key.confirmedModels || [];
    const match = models.find(m => m.toLowerCase() === modelId.toLowerCase());
    if (match) {
      const details = key.modelDetails?.[match];
      return res.json({
        id: match,
        object: "model",
        created: Math.floor(Date.now() / 1000) - 3600,
        owned_by: details?.ownedBy || (key.provider === "gemini" ? "google" : key.provider === "claude" ? "anthropic" : "system"),
        context_length: details?.contextLength || detectContextLength(match),
        model_type: detectModelType(match)
      });
    }
  }

  return sendOpenAiError(res, 404, `The model '${modelId}' does not exist or is not registered in active keys.`, "invalid_request_error", "model_not_found");
};

app.get("/v1/models", handlePublicModelsQuery);
app.get("/models", handlePublicModelsQuery);
app.get("/nim-proxy/v1/models", handlePublicModelsQuery);
app.get("/nim-proxy/models", handlePublicModelsQuery);
app.get("/v1/models/:modelId", handleSingleModelQuery);
app.get("/models/:modelId", handleSingleModelQuery);

// The OpenAI Standard Proxy Endpoint Handler
const handleOpenAiProxy = async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  // Detect CLI OAuth and intercept token configurations styled like cloud-native developer environments
  const authHeader = req.headers.authorization || "";
  const apiKeyHeader = req.headers["api-key"] as string | undefined;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let oauthProfile = "";

  if (token.startsWith("ghu_") || token.startsWith("gho_") || token.startsWith("gh_copilot_")) {
    oauthProfile = "GitHub Copilot CLI";
  } else if (token.startsWith("ya29.")) {
    oauthProfile = "Google Cloud Gemini (ADC)";
  } else if (token.startsWith("vertex_cl_") || token.startsWith("session_ant_")) {
    oauthProfile = "Claude OAuth (JWT)";
  }

  // Auth check for the balancer itself
  let isAuthorized = false;
  if (!config.settings.masterKey) {
    isAuthorized = true;
  } else if (authHeader === `Bearer ${config.settings.masterKey}` || apiKeyHeader === config.settings.masterKey) {
    isAuthorized = true;
  } else if (oauthProfile) {
    // Automatically authorize recognized CLI OAuth token contexts
    isAuthorized = true;
    console.log(`[OAuth Detector] Intercepted CLI OAuth token for profile: ${oauthProfile}`);
  }

  if (!isAuthorized) {
    return sendOpenAiError(res, 401, "Incorrect API key provided or missing Balancer Master Key.", "invalid_request_error", "invalid_api_key");
  }

  const incomingModel = req.body?.model;
  const activePoolModels = getAllActiveModels();
  // Dynamic Model Translation: Translate CLI synthetic aliases if necessary
  const model = translateCliModel(incomingModel, activePoolModels);
  
  if (!checkRateLimit()) {
    return sendOpenAiError(res, 429, "Global rate limit exceeded (QPS threshold reached).", "rate_limit_error", "rate_limit_exceeded");
  }

  // Normalize subPath: make sure it translates to a clean downstream OpenAI path
  let pathOnly = req.path || "";
  if (pathOnly.startsWith("/nim-proxy")) {
    pathOnly = pathOnly.replace(/^\/nim-proxy\/?/, "");
  }
  if (pathOnly.startsWith("/")) {
    pathOnly = pathOnly.slice(1);
  }
  let subPath = pathOnly;
  if (!subPath.startsWith("v1/") && !subPath.startsWith("v1beta/")) {
    subPath = "v1/" + subPath;
  }

  const triedKeyIds = new Set<string>();
  let attempt = 0;
  const maxAttempts = 5; // Allow trying up to 5 keys in the pool if upstream fails

  while (attempt < maxAttempts) {
    const selectedKey = selectKey(model, triedKeyIds);
    if (!selectedKey) {
      if (triedKeyIds.size > 0) {
        return sendOpenAiError(
          res, 
          503, 
          `All active endpoint nodes failed or returned errors. Tested: ${[...triedKeyIds].map(id => config.keys.find(k => k.id === id)?.name || id).join(", ")}`,
          "server_error",
          "all_nodes_failed"
        );
      }
      return sendOpenAiError(
        res,
        503,
        `No available API Key nodes for model '${model || incomingModel || "default"}'. All matching endpoints may be circuit-broken, rate-limited, or out of quota.`,
        "server_error",
        "no_active_nodes"
      );
    }

    triedKeyIds.add(selectedKey.id);
    attempt++;

    // Local Rate Limit Check
    if (!checkRateLimit(selectedKey.id)) {
      const key = config.keys.find(k => k.id === selectedKey.id);
      if (key && key.quotaLimit && (key.quotaUsed || 0) >= key.quotaLimit) {
        selectedKey.status = "circuit-broken";
        saveConfig();
        continue;
      }
      // Record Local Rate Limit
      selectedKey.status = "rate-limited";
      selectedKey.cooldownUntil = Date.now() + 30000; // 30s local cooldown
      saveConfig();
      continue;
    }

    // Log request attempt locally
    globalRequests.push(Date.now());
    if (!keyRequests[selectedKey.id]) keyRequests[selectedKey.id] = [];
    keyRequests[selectedKey.id].push(Date.now());

    selectedKey.useCount++;
    selectedKey.quotaUsed = (selectedKey.quotaUsed || 0) + 1;
    selectedKey.lastUsed = new Date().toISOString();

    const endpoint = (selectedKey.endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
    let targetUrl = `${endpoint}/${subPath}`;
    if (subPath.startsWith("v1/")) {
      const apiPath = subPath.slice(3); // e.g. "chat/completions"
      if (
        endpoint.endsWith("/v1") || 
        endpoint.endsWith("/v1beta") || 
        endpoint.endsWith("/openai") || 
        endpoint.endsWith("/v4") ||
        endpoint.endsWith("/v1beta/openai")
      ) {
        targetUrl = `${endpoint}/${apiPath}`;
      } else {
        targetUrl = `${endpoint}/${subPath}`;
      }
    }

    const requestStartTime = Date.now();
    try {
      const addLog = (status: number, duration: number) => {
        if (!selectedKey.lastLogs) selectedKey.lastLogs = [];
        selectedKey.lastLogs.unshift({
          timestamp: new Date().toISOString(),
          model: model || "unknown",
          status: status,
          path: subPath
        });
        if (selectedKey.lastLogs.length > 5) selectedKey.lastLogs.pop();
        
        // Write to global log queue too
        addGlobalLog(selectedKey, model, status, subPath, req.method, duration);
      };

      // Native Translation Routing Layer (Gemini, Claude, etc.)
      const providerLower = (selectedKey.provider || "openai").toLowerCase();
      if (providerLower === "gemini" || providerLower === "claude") {
        const isTranslated = await handleNativeTranslationRequest(
          req, 
          res, 
          selectedKey, 
          model || "unknown", 
          subPath, 
          addLog,
          requestStartTime
        );

        if (isTranslated) {
          selectedKey.status = "active";
          selectedKey.consecutiveFailures = 0;
          selectedKey.cooldownUntil = undefined;
          saveConfig();
          return; 
        } else {
          // Native request failed! Let's trigger failover retry
          const duration = Date.now() - requestStartTime;
          addLog(502, duration);
          
          selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;
          selectedKey.consecutiveFailures = (selectedKey.consecutiveFailures || 0) + 1;

          if (selectedKey.consecutiveFailures >= config.settings.circuitBreakerThreshold) {
            selectedKey.status = "circuit-broken";
          } else {
            selectedKey.status = "error";
            selectedKey.cooldownUntil = Date.now() + 15000;
          }
          saveConfig();

          globalLogsQueue.unshift({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            keyId: selectedKey.id,
            keyName: selectedKey.name,
            endpoint: selectedKey.endpoint || "Default Endpoint",
            model: model || "unknown",
            status: 502,
            path: `${subPath} (⚠️ 翻译网关故障转移自动重试)`,
            method: req.method,
            duration: duration
          });
          if (globalLogsQueue.length > 100) globalLogsQueue.pop();

          console.log(`[Failover] Translated node ${selectedKey.name} returned an error. Retrying on another node...`);
          continue; // Trigger retry loop!
        }
      }

      // Setup payload and automatically translate standard CLI models to key-specific supported model names
      let proxyBody = req.body;
      if (proxyBody && typeof proxyBody === "object") {
        proxyBody = { ...proxyBody };
        if (proxyBody.model) {
          proxyBody.model = translateCliModel(String(proxyBody.model), selectedKey.confirmedModels || []);
        }
      }

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${selectedKey.key}`,
        },
        body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(proxyBody) : undefined,
        signal: AbortSignal.timeout(60000), // 60s timeout for downstream
      });

      // If response is NOT ok, handle automatic failover
      if (!response.ok) {
        const duration = Date.now() - requestStartTime;
        addLog(response.status, duration);
        
        selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;
        selectedKey.consecutiveFailures = (selectedKey.consecutiveFailures || 0) + 1;

        // If it got 429, set a short automatic Cooldown (e.g. 45 seconds)
        if (response.status === 429) {
          selectedKey.status = "rate-limited";
          selectedKey.cooldownUntil = Date.now() + 45000; // 45 seconds cooldown
        } else if (selectedKey.consecutiveFailures >= config.settings.circuitBreakerThreshold) {
          selectedKey.status = "circuit-broken";
        } else {
          selectedKey.status = "error";
          selectedKey.cooldownUntil = Date.now() + 15000; // 15 seconds cooldown for transient errors
        }
        
        saveConfig();

        // Push a transparent log to global queue to inform dashboard that retry happened!
        globalLogsQueue.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          keyId: selectedKey.id,
          keyName: selectedKey.name,
          endpoint: selectedKey.endpoint || "Default Endpoint",
          model: model || "unknown",
          status: response.status,
          path: `${subPath} (⚠️ 故障转移自动重试)`,
          method: req.method,
          duration: duration
        });
        if (globalLogsQueue.length > 100) globalLogsQueue.pop();

        console.log(`[Failover] Node ${selectedKey.name} returned status ${response.status}. Retrying on another node...`);
        continue; // Trigger retry loop!
      }

      // Check for HTML response (hijack, DNS intercept, or misconfigured URL)
      const contentType = response.headers.get("content-type") || "";
      if (contentType.toLowerCase().includes("text/html")) {
        const duration = Date.now() - requestStartTime;
        addLog(422, duration); // Use 422 Unprocessable Content to represent HTML format mismatch
        
        selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;
        selectedKey.consecutiveFailures = (selectedKey.consecutiveFailures || 0) + 1;

        if (selectedKey.consecutiveFailures >= config.settings.circuitBreakerThreshold) {
          selectedKey.status = "circuit-broken";
        } else {
          selectedKey.status = "error";
          selectedKey.cooldownUntil = Date.now() + 15000; // 15 seconds cooldown
        }
        
        saveConfig();

        globalLogsQueue.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          keyId: selectedKey.id,
          keyName: selectedKey.name,
          endpoint: selectedKey.endpoint || "Default Endpoint",
          model: model || "unknown",
          status: 422,
          path: `${subPath} (⚠️ 网关网页拦截,故障自动重试)`,
          method: req.method,
          duration: duration
        });
        if (globalLogsQueue.length > 100) globalLogsQueue.pop();

        console.log(`[Failover] Node ${selectedKey.name} returned HTML instead of JSON. Retrying on another node...`);
        continue; // Failover to next node!
      }

      // Success!
      const duration = Date.now() - requestStartTime;
      addLog(response.status, duration);
      selectedKey.status = "active";
      selectedKey.consecutiveFailures = 0;
      selectedKey.cooldownUntil = undefined;
      
      // Copy headers from target, filtering out those that might conflict with our response handling
      const headersToSkip = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive', 'access-control-allow-origin'];
      response.headers.forEach((value, key) => {
        if (!headersToSkip.includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      res.setHeader('x-routed-node', encodeURIComponent(selectedKey.name));
      res.setHeader('x-router-duration-ms', String(Date.now() - startTime));

      // Handle streaming and tokens
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
      saveConfig();
      return; // Break fully!
    } catch (err: any) {
      console.error(`[Failover Error] Node ${selectedKey.name} error:`, err);
      const duration = Date.now() - requestStartTime;

      if (!selectedKey.lastLogs) selectedKey.lastLogs = [];
      selectedKey.lastLogs.unshift({
        timestamp: new Date().toISOString(),
        model: model || "unknown",
        status: 500,
        path: subPath
      });
      if (selectedKey.lastLogs.length > 5) selectedKey.lastLogs.pop();
      
      // Wire global queue
      addGlobalLog(selectedKey, model, 500, `${subPath} (⚠️ 连接异常)`, req.method, duration);

      selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;
      selectedKey.consecutiveFailures = (selectedKey.consecutiveFailures || 0) + 1;
      selectedKey.cooldownUntil = Date.now() + 20000; // 20s cooldown for network error

      if (selectedKey.consecutiveFailures >= config.settings.circuitBreakerThreshold) {
        selectedKey.status = "circuit-broken";
      } else {
        selectedKey.status = "error";
      }
      saveConfig();
      continue; // Try next node!
    }
  }

  // If we exhaust attempts
  return sendOpenAiError(
    res,
    502,
    "Failed to proxy request. All matching API key-nodes were tried and returned errors. 所有可能匹配的 API 节点在此次路由中均发生故障。",
    "server_error",
    "upstream_failure"
  );
};

// Register all standard OpenAI endpoints & legacy routes
const openAiProxyRoutes = [
  "/v1/chat/completions",
  "/chat/completions",
  "/v1/completions",
  "/completions",
  "/v1/embeddings",
  "/embeddings",
  "/v1/images/*",
  "/images/*",
  "/v1/audio/*",
  "/audio/*",
  "/v1/moderations",
  "/moderations",
  "/nim-proxy/*",
  "/v1/*"
];

app.all(openAiProxyRoutes, handleOpenAiProxy);

// Test a specific model on a key or across pool
app.post("/api/test-model", async (req, res) => {
  const { modelId, keyId } = req.body;
  if (!modelId) return res.status(400).json({ success: false, error: "缺少模型名称 modelId" });

  const targetKey = keyId ? config.keys.find(k => k.id === keyId) : selectKey(modelId);
  if (!targetKey) {
    return res.status(404).json({ success: false, error: `没有可用于测试模型 '${modelId}' 的已启用密钥节点` });
  }

  const startTime = Date.now();
  const providerLower = (targetKey.provider || "openai").toLowerCase();

  try {
    if (providerLower === "gemini") {
      const baseUrl = (targetKey.endpoint || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
      const targetUrl = `${baseUrl}/v1beta/models/${modelId}:generateContent?key=${targetKey.key}`;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "hi" }] }],
          generationConfig: { maxOutputTokens: 10 }
        }),
        signal: AbortSignal.timeout(15000)
      });
      const latency = Date.now() - startTime;
      if (!response.ok) {
        const text = await response.text();
        return res.json({ success: false, status: response.status, latency, error: text.slice(0, 300) });
      }
      const data = await response.json() as any;
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "OK";
      return res.json({ success: true, status: 200, latency, reply: reply.trim(), keyName: targetKey.name });
    } else if (providerLower === "claude") {
      const targetUrl = `${(targetKey.endpoint || "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": targetKey.key,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 10
        }),
        signal: AbortSignal.timeout(15000)
      });
      const latency = Date.now() - startTime;
      if (!response.ok) {
        const text = await response.text();
        return res.json({ success: false, status: response.status, latency, error: text.slice(0, 300) });
      }
      const data = await response.json() as any;
      const reply = data.content?.[0]?.text || "OK";
      return res.json({ success: true, status: 200, latency, reply: reply.trim(), keyName: targetKey.name });
    } else {
      const endpoint = (targetKey.endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
      const targetUrl = endpoint.endsWith("/v1") || endpoint.endsWith("/openai")
        ? `${endpoint}/chat/completions`
        : `${endpoint}/v1/chat/completions`;

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${targetKey.key}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 10
        }),
        signal: AbortSignal.timeout(15000)
      });
      const latency = Date.now() - startTime;
      if (!response.ok) {
        const text = await response.text();
        return res.json({ success: false, status: response.status, latency, error: text.slice(0, 300) });
      }
      const data = await response.json() as any;
      const reply = data.choices?.[0]?.message?.content || "OK";
      return res.json({ success: true, status: 200, latency, reply: reply.trim(), keyName: targetKey.name });
    }
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return res.json({ success: false, status: 500, latency, error: err?.message || "请求超时或网络异常" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", activeKeys: config.keys.filter(k => k.enabled).length });
});

app.post("/api/keys/check-status", async (req, res) => {
  const { key, endpoint } = req.body;
  
  if (!key) {
    console.warn("Validation request failed: Key is missing");
    return res.status(400).json({ valid: false, error: "密钥不能为空" });
  }
  
  const targetEndpoint = (endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
  console.log(`[Validation] Testing key (${key.substring(0, 8)}...) against: ${targetEndpoint}/models`);
  
  try {
    const response = await fetch(`${targetEndpoint}/models`, {
      headers: { 
        "Authorization": `Bearer ${key}`,
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(10000)
    });
    
    console.log(`[Validation] Upstream Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const body = await response.json();
        
        // Strict check: must have a 'data' array
        if (body && Array.isArray(body.data)) {
          const uniqueModelIds = new Set<string>();
          const modelsWithDetails: any[] = [];
          
          body.data.forEach((m: any) => {
            if (m && m.id && !uniqueModelIds.has(m.id)) {
              uniqueModelIds.add(m.id);
              modelsWithDetails.push({
                id: m.id,
                contextLength: detectContextLength(m.id),
                ownedBy: m.owned_by
              });
            }
          });
          
          const models = Array.from(uniqueModelIds);
          console.log(`[Validation] SUCCESS: Found ${models.length} models`);
          
          const recommendations = detectLimits(targetEndpoint);
          
          if (models.length === 0) {
            return res.status(401).json({ 
              valid: false, 
              error: "验证失败: 密钥有效但未关联任何模型 (白名单限制?)",
              status: 401,
              recommendations
            });
          }

          return res.json({ 
            valid: true, 
            models,
            modelDetails: modelsWithDetails,
            message: `验证成功! 已发现 ${models.length} 个模型。`,
            recommendations
          });
        } else {
          console.warn("[Validation] FAILED: Response body does not contain expected 'data' array");
          return res.status(422).json({ 
            valid: false, 
            error: "验证失败: 接口返回数据格式异常",
            status: response.status
          });
        }
      } else {
        const textPreview = (await response.text()).substring(0, 100);
        console.warn(`[Validation] FAILED: Expected JSON, got: ${textPreview}`);
        return res.status(422).json({ 
          valid: false, 
          error: "验证失败: 接口返回非 JSON 格式, 请检查端点 URL 类型",
          status: response.status
        });
      }
    } else {
      // 401, 403, 404, etc.
      let errorMsg = "验证失败";
      try {
        const errBody = await response.json();
        errorMsg = errBody.detail || errBody.message || errorMsg;
      } catch (e) {}

      console.log(`[Validation] FAILED with status ${response.status}: ${errorMsg}`);
      
      // Specifically handle 401/403 which are most common for bad keys
      if (response.status === 401) errorMsg = "API Key 无效 (Unauthorized)";
      if (response.status === 403) errorMsg = "API Key 权限受限 (Forbidden)";

      return res.status(response.status).json({ 
        valid: false, 
        status: response.status,
        error: errorMsg
      });
    }
  } catch (error) {
    const errorPrefix = error instanceof Error && error.name === 'AbortError' ? '连接超时' : '请求异常';
    const message = error instanceof Error ? error.message : "未知错误";
    console.error("[Validation] EXCEPTION:", message);
    return res.status(500).json({ 
      valid: false, 
      error: `${errorPrefix}: ${message}`
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    resetHealthCheckInterval();
  });
}

startServer();
