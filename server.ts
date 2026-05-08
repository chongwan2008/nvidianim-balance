import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(process.cwd(), "nim-config.json");

// Initial structure for config
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
  lastLogs?: {
    timestamp: string;
    model: string;
    status: number;
    path: string;
  }[];
  qpsLimit?: number;
  modelFilters?: string[];
}

type LBStrategy = "round-robin" | "random" | "least-used";

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
  if (req.path === '/login' || req.path === '/api/login' || req.path.startsWith('/nim-proxy/')) {
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
    res.json(data);
  } catch (error) {
    console.error("Fetch models error:", error);
    res.status(500).json({ error: "无法从该 NIM 端点获取模型列表" });
  }
});

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
  console.log("Running health check for all enabled keys...");
  const checks = config.keys.filter(k => k.enabled).map(async (key) => {
    const endpoint = (key.endpoint || config.settings.defaultEndpoint).replace(/\/$/, "");
    try {
      const response = await fetch(`${endpoint}/models`, {
        headers: { "Authorization": `Bearer ${key.key}` },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        key.status = "active";
        key.consecutiveFailures = 0;
      } else {
        // If it was already working, don't necessarily break it on one health check skip,
        // but if it was broken, keep it broken. 
        // Actually, if it fails health check, we should probably mark it as error
        key.status = "error";
      }
    } catch (error) {
      key.status = "error";
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

  // Global Check
  if (config.settings.globalQpsLimit > 0) {
    while (globalRequests.length > 0 && globalRequests[0] < oneSecondAgo) globalRequests.shift();
    if (globalRequests.length >= config.settings.globalQpsLimit) return false;
  }

  // Key Check
  if (keyId) {
    const key = config.keys.find(k => k.id === keyId);
    if (key?.qpsLimit && key.qpsLimit > 0) {
      if (!keyRequests[keyId]) keyRequests[keyId] = [];
      while (keyRequests[keyId].length > 0 && keyRequests[keyId][0] < oneSecondAgo) keyRequests[keyId].shift();
      if (keyRequests[keyId].length >= key.qpsLimit) return false;
    }
  }

  return true;
};

// Selection Logic
const selectKey = (model?: string): NimKey | null => {
  let candidates = config.keys.filter(k => k.enabled && k.status !== "circuit-broken");

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
    case "round-robin":
    default:
      const key = candidates[currentKeyIndex % candidates.length];
      currentKeyIndex++;
      return key;
  }
};

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
    selectedKey.status = "rate-limited";
    saveConfig();
    return res.status(429).json({ error: `Rate limit exceeded for key: ${selectedKey.name}` });
  }

  // Log request
  globalRequests.push(Date.now());
  if (!keyRequests[selectedKey.id]) keyRequests[selectedKey.id] = [];
  keyRequests[selectedKey.id].push(Date.now());

  selectedKey.useCount++;
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
    
    // Copy headers from target
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
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
