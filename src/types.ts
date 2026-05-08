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
  lastLogs?: {
    timestamp: string;
    model: string;
    status: number;
    path: string;
  }[];
  
  // Per-key Config
  qpsLimit?: number; // 0 or undefined means unlimited
  modelFilters?: string[]; // Only handle specific models
}

export type LBStrategy = "round-robin" | "random" | "least-used";

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
