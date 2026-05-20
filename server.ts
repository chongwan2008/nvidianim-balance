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
    adminPassword: "admin" // Default password
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

app.post("/api/fetch-models", async (req, res) => {
  const { key, endpoint } = req.body;
  if (!key) return res.status(400).json({ error: "Key not provided" });
  const targetEndpoint = (endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
  try {
    const response = await fetch(`${targetEndpoint}/models`, {
      headers: { "Authorization": `Bearer ${key}` },
    });
    if (!response.ok) throw new Error("API responded with error");
    const data = await response.json();
    
    // Enrich with context length
    if (data.data) {
      data.data = data.data.map((m: any) => ({
        ...m,
        contextLength: detectContextLength(m.id)
      }));
    }
    
    // Add recommended limits based on endpoint
    const recommendations = detectLimits(targetEndpoint);
    
    res.json({
      ...data,
      recommendations
    });
  } catch (error) {
    console.error("Fetch models error:", error);
    res.status(500).json({ error: "无法从该 NIM 端点获取模型列表" });
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

  const endpoint = (key.endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
  try {
    const response = await fetch(`${endpoint}/models`, {
      headers: { "Authorization": `Bearer ${key.key}` },
    });
    if (!response.ok) throw new Error("API responded with error");
    const data = await response.json();
    
    // Enrich with context length
    if (data.data) {
      if (!key.modelDetails) key.modelDetails = {};
      data.data.forEach((m: any) => {
        key.modelDetails![m.id] = {
          id: m.id,
          contextLength: detectContextLength(m.id),
          ownedBy: m.owned_by
        };
      });
      key.confirmedModels = data.data.map((m: any) => m.id);
      saveConfig();
    }
    
    res.json(data);
  } catch (error) {
    console.error("Fetch models error:", error);
    res.status(500).json({ error: "无法从该 NIM 端点获取模型列表" });
  }
});

app.post("/api/keys", (req, res) => {
  const { name, key, endpoint } = req.body;
  const newKey: NimKey = {
    id: Math.random().toString(36).substring(7),
    name: name || "NIM Key",
    key,
    endpoint: endpoint || "",
    enabled: true,
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
    const endpoint = (key.endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
    try {
      const response = await fetch(`${endpoint}/models`, {
        headers: { "Authorization": `Bearer ${key.key}` },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      key.lastHealthCheck = new Date().toISOString();

      if (response.ok) {
        const body = await response.json();
        if (body.data) {
          key.confirmedModels = body.data.map((m: any) => m.id);
          if (!key.modelDetails) key.modelDetails = {};
          body.data.forEach((m: any) => {
            key.modelDetails![m.id] = {
              id: m.id,
              contextLength: detectContextLength(m.id),
              ownedBy: m.owned_by
            };
          });
        }
        
        if (key.status !== "active") {
          console.log(`Key ${key.id} (${key.name}) is now ACTIVE.`);
        }
        key.status = "active";
        key.consecutiveFailures = 0;
      } else {
        key.consecutiveFailures = (key.consecutiveFailures || 0) + 1;
        if (key.consecutiveFailures >= config.settings.circuitBreakerThreshold) {
          if (key.status !== "error") console.log(`Key ${key.id} marked as ERROR due to health check failure.`);
          key.status = "error";
        }
      }
    } catch (error) {
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
  res.json({ success: true, keys: config.keys.map(k => ({ id: k.id, status: k.status })) });
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

// Selection Logic
const selectKey = (model?: string): NimKey | null => {
  let candidates = config.keys.filter(k => k.enabled && k.status !== "circuit-broken");

  // Filter out those that hit quota
  candidates = candidates.filter(k => {
    if (k.quotaLimit && k.quotaLimit > 0) {
      return (k.quotaUsed || 0) < k.quotaLimit;
    }
    return true;
  });

  // Smart Routing: Filter by model if key has filters
  if (model) {
    const modelSpecific = candidates.filter(k => k.modelFilters && k.modelFilters.includes(model));
    if (modelSpecific.length > 0) candidates = modelSpecific;
    else {
      // If no specific keys for this model, use keys without any filters
      candidates = candidates.filter(k => !k.modelFilters || k.modelFilters.length === 0);
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
    id.includes("imagen")
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

const handlePublicModelsQuery = (req: express.Request, res: express.Response) => {
  if (config.settings.masterKey) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${config.settings.masterKey}`) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing Balancer Master Key." });
    }
  }

  const activeKeys = config.keys.filter(k => k.enabled && k.status !== "circuit-broken" && k.status !== "error");
  const uniqueModels = new Map<string, { id: string; owned_by: string; context_length?: number; model_type?: string }>();

  for (const key of activeKeys) {
    const models = key.confirmedModels || [];
    for (const modelId of models) {
      if (!uniqueModels.has(modelId)) {
        const details = key.modelDetails?.[modelId];
        uniqueModels.set(modelId, {
          id: modelId,
          owned_by: details?.ownedBy || "system",
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
    context_length: m.context_length,
    model_type: m.model_type
  }));

  res.json({
    object: "list",
    data: dataList
  });
};

app.get("/v1/models", handlePublicModelsQuery);
app.get("/nim-proxy/v1/models", handlePublicModelsQuery);
app.get("/nim-proxy/models", handlePublicModelsQuery);

// The Proxy Endpoint
app.all("/nim-proxy/*", async (req, res) => {
  // Auth check for the balancer itself
  if (config.settings.masterKey) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${config.settings.masterKey}`) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing Balancer Master Key." });
    }
  }

  const model = req.body?.model;
  
  if (!checkRateLimit()) {
    return res.status(429).json({ error: "Global rate limit exceeded." });
  }

  const selectedKey = selectKey(model);
  
  if (!selectedKey) {
    return res.status(503).json({ error: "No available NVIDIA NIM keys." });
  }

  if (!checkRateLimit(selectedKey.id)) {
    const key = config.keys.find(k => k.id === selectedKey.id);
    if (key && key.quotaLimit && (key.quotaUsed || 0) >= key.quotaLimit) {
        selectedKey.status = "circuit-broken"; // Or something else to indicate quota hit
        saveConfig();
        return res.status(403).json({ error: `Quota exceeded for key: ${selectedKey.name}` });
    }
    selectedKey.status = "rate-limited";
    saveConfig();
    return res.status(429).json({ error: `Rate limit (QPS/RPM) exceeded for key: ${selectedKey.name}` });
  }

  // Log request
  globalRequests.push(Date.now());
  if (!keyRequests[selectedKey.id]) keyRequests[selectedKey.id] = [];
  keyRequests[selectedKey.id].push(Date.now());

  selectedKey.useCount++;
  // Increment quota used (default to 1 per request if not tracking tokens precisely yet)
  selectedKey.quotaUsed = (selectedKey.quotaUsed || 0) + 1;
  selectedKey.lastUsed = new Date().toISOString();

  const subPath = req.params[0];
  const endpoint = (selectedKey.endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
  const targetUrl = `${endpoint}/${subPath}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${selectedKey.key}`,
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
    });

    const addLog = (status: number) => {
      if (!selectedKey.lastLogs) selectedKey.lastLogs = [];
      selectedKey.lastLogs.unshift({
        timestamp: new Date().toISOString(),
        model: model || "unknown",
        status: status,
        path: subPath
      });
      if (selectedKey.lastLogs.length > 3) selectedKey.lastLogs.pop();
    };

    if (!response.ok) {
       addLog(response.status);
       selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;
       selectedKey.consecutiveFailures = (selectedKey.consecutiveFailures || 0) + 1;
       
       if (selectedKey.consecutiveFailures >= config.settings.circuitBreakerThreshold) {
         selectedKey.status = "circuit-broken";
       } else {
         selectedKey.status = "error";
       }
       saveConfig();

       const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
       return res.status(response.status).json(errorData);
    }

    addLog(response.status);
    selectedKey.status = "active";
    selectedKey.consecutiveFailures = 0;
    
    // Copy headers from target, filtering out those that might conflict with our response handling
    const headersToSkip = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive', 'access-control-allow-origin'];
    response.headers.forEach((value, key) => {
      if (!headersToSkip.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Handle streaming and tokens (if available in JSON)
    if (response.body) {
      const reader = response.body.getReader();
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Push raw chunk to client
        res.write(value);

        // Simple token estimation/parsing if it's not too expensive
        // Note: Real token counting usually happens after full stream
        // For now, we'll wait for the end or parse chunks if it's JSON
      }
    }
    res.end();
    saveConfig();
  } catch (error) {
    console.error("Proxy error:", error);
    if (!selectedKey.lastLogs) selectedKey.lastLogs = [];
    selectedKey.lastLogs.unshift({
      timestamp: new Date().toISOString(),
      model: model || "unknown",
      status: 500,
      path: subPath
    });
    if (selectedKey.lastLogs.length > 3) selectedKey.lastLogs.pop();

    selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;
    selectedKey.consecutiveFailures = (selectedKey.consecutiveFailures || 0) + 1;
    if (selectedKey.consecutiveFailures >= config.settings.circuitBreakerThreshold) {
       selectedKey.status = "circuit-broken";
    } else {
       selectedKey.status = "error";
    }
    saveConfig();
    res.status(500).json({ error: "Failed to proxy request to NVIDIA NIM." });
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
          const models = body.data.map((m: any) => m.id);
          const modelsWithDetails = body.data.map((m: any) => ({
            id: m.id,
            contextLength: detectContextLength(m.id),
            ownedBy: m.owned_by
          }));
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
