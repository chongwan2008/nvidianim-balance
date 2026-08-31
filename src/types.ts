export interface NimKey {
  id: string;
  name: string;
  key: string;
  endpoint: string;
  enabled: boolean;
  status: "active" | "error" | "rate-limited" | "circuit-broken";
  
  // Usage Stats
  useCount: number;
  errorCount: number;
  consecutiveFailures: number;
  tokensConsumed: number;
  lastUsed?: string;
  lastHealthCheck?: string;
  confirmedModels?: string[];
  modelDetails?: Record<string, { id: string; contextLength?: number; ownedBy?: string }>;
  lastLogs?: {
    timestamp: string;
    model: string;
    status: number;
    path: string;
  }[];
  
  // Per-key Config
  qpsLimit?: number; // 0 or undefined means unlimited
  rpmLimit?: number; // Requests Per Minute
  quotaLimit?: number; // Total quota (e.g. tokens or requests, default to 0 for unlimited)
  quotaUsed?: number;  // Current usage
  modelFilters?: string[]; // Only handle specific models
  provider?: "openai" | "gemini" | "claude" | "antigravity";
}

export type LBStrategy = "round-robin" | "random" | "least-used" | "weighted";

export interface NimConfig {
  keys: NimKey[];
  settings: {
    strategy: LBStrategy;
    globalQpsLimit: number;
    circuitBreakerThreshold: number; // consecutive failures before breaking
    defaultEndpoint: string;
    healthCheckInterval: number; // in minutes, 0 means disabled
    masterKey?: string;
    adminPassword?: string;
  };
}
