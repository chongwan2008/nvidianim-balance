/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Plus, 
  Trash2, 
  Settings, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Key, 
  History, 
  Sparkles, 
  MessageSquare, 
  Image as ImageIcon, 
  Download, 
  Send, 
  Play, 
  Upload, 
  X, 
  BarChart2, 
  ListOrdered, 
  Server, 
  Shuffle, 
  Terminal, 
  FileText, 
  Copy, 
  Check, 
  ChevronRight, 
  Laptop, 
  Scissors, 
  Sun, 
  Moon, 
  Zap, 
  TrendingUp, 
  Layers, 
  Cpu, 
  FileCode 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { NimKey, NimConfig, PlaygroundStep, PlaygroundTrace } from './types';

const detectModelType = (modelId: string): { label: string; bgClass: string; textClass: string } => {
  if (!modelId || typeof modelId !== 'string') {
    return { label: "文本 | Text", bgClass: "bg-emerald-100 text-emerald-800 border-emerald-200", textClass: "text-emerald-600" };
  }
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
    return { label: "视觉 | Vision", bgClass: "bg-purple-100 text-purple-800 border-purple-200", textClass: "text-purple-600" };
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
    return { label: "音频 | Audio", bgClass: "bg-amber-100 text-amber-800 border-amber-200", textClass: "text-amber-600" };
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
    return { label: "生图 | Image", bgClass: "bg-pink-100 text-pink-800 border-pink-200", textClass: "text-pink-600" };
  }
  
  if (
    id.includes("embedding") || 
    id.includes("bge-") || 
    id.includes("nomic-embed") || 
    id.includes("text-embedding") || 
    id.includes("gte-")
  ) {
    return { label: "向量 | Embedding", bgClass: "bg-cyan-100 text-cyan-800 border-cyan-200", textClass: "text-cyan-600" };
  }
  
  if (
    id.includes("rerank") || 
    id.includes("bge-reranker") || 
    id.includes("gte-reranker")
  ) {
    return { label: "重排 | Reranker", bgClass: "bg-teal-100 text-teal-800 border-teal-200", textClass: "text-teal-600" };
  }
  
  return { label: "文本 | Text", bgClass: "bg-emerald-100 text-emerald-800 border-emerald-200", textClass: "text-emerald-600" };
};

export const formatDateTime = (isoString?: string) => {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
  } catch {
    return isoString;
  }
};

export const getLatencyForProviderModel = (key: NimKey, modelId: string, logs: any[]) => {
  // 1. Check if there are real logs for this model and this keyId
  const modelLogs = (logs || []).filter(l => l.model === modelId && l.keyId === key.id && l.status === 200 && typeof l.duration === 'number');
  if (modelLogs.length > 0) {
    const sum = modelLogs.reduce((acc, curr) => acc + curr.duration, 0);
    return {
      latency: Math.round(sum / modelLogs.length),
      type: 'real' as const
    };
  }

  // 2. Check if there are generalized logs for this keyId (any model) for some baseline scaling
  const keyLogs = (logs || []).filter(l => l.keyId === key.id && l.status === 200 && typeof l.duration === 'number');
  if (keyLogs.length > 0) {
    const sum = keyLogs.reduce((acc, curr) => acc + curr.duration, 0);
    return {
      latency: Math.round(sum / keyLogs.length),
      type: 'real_key' as const
    };
  }

  // 3. Fallback to pre-defined typical latency profile based on provider and endpoint URL
  const provider = (key.provider || '').toLowerCase();
  const url = (key.endpoint || '').toLowerCase();
  
  if (provider === 'gemini') {
    return { latency: 450, type: 'benchmark' as const };
  } else if (provider === 'claude') {
    return { latency: 550, type: 'benchmark' as const };
  } else if (provider === 'antigravity') {
    return { latency: 320, type: 'benchmark' as const };
  }
  
  if (url.includes("api.groq.com")) {
    return { latency: 140, type: 'benchmark' as const };
  } else if (url.includes("api.sambanova.ai")) {
    return { latency: 160, type: 'benchmark' as const };
  } else if (url.includes("integrate.api.nvidia.com") || url === "" || url === "https://integrate.api.nvidia.com/v1") {
    return { latency: 220, type: 'benchmark' as const };
  } else if (url.includes("api.siliconflow.cn")) {
    return { latency: 310, type: 'benchmark' as const };
  } else if (url.includes("api.deepseek.com")) {
    return { latency: 290, type: 'benchmark' as const };
  } else if (url.includes("dashscope.aliyuncs.com")) {
    return { latency: 350, type: 'benchmark' as const };
  } else if (url.includes("api.openai.com")) {
    return { latency: 410, type: 'benchmark' as const };
  } else if (url.includes("openrouter.ai")) {
    return { latency: 480, type: 'benchmark' as const };
  }
  
  return { latency: 350, type: 'benchmark' as const };
};

export const PROVIDER_PRESETS = [
  { id: 'nvidia', name: 'NVIDIA NIM (官方端点)', endpoint: 'https://integrate.api.nvidia.com/v1', placeholder: 'nvapi-...', desc: 'NVIDIA 官方 NIM 微服务聚合端点', provider: 'openai' },
  { id: 'siliconflow', name: 'SiliconFlow (硅基流动)', endpoint: 'https://api.siliconflow.cn/v1', placeholder: 'sk-...', desc: '国内极速、高性价比大模型托管平台', provider: 'openai' },
  { id: 'groq', name: 'Groq Cloud', endpoint: 'https://api.groq.com/openai/v1', placeholder: 'gsk_...', desc: '极速 LPU 推理终端，支持高吞吐大模型', provider: 'openai' },
  { id: 'sambanova', name: 'SambaNova Systems', endpoint: 'https://api.sambanova.ai/v1', placeholder: 'sambanova-...', desc: '高QPS、大文本极速推理接口', provider: 'openai' },
  { id: 'deepseek', name: 'DeepSeek (开放云服务)', endpoint: 'https://api.deepseek.com/v1', placeholder: 'sk_...', desc: '高性价比国产自研模型提供商', provider: 'openai' },
  { id: 'gemini', name: 'Google Gemini (原生 API 智能解密翻译)', endpoint: 'https://generativelanguage.googleapis.com', placeholder: 'AIzaSy...', desc: '谷歌官方原生 API（网关将完美把 OpenAI 格式转为原生 Gemini 格式并流式转发）', provider: 'gemini' },
  { id: 'anthropic', name: 'Anthropic Claude (原生 API 智能解密翻译)', endpoint: 'https://api.anthropic.com', placeholder: 'sk-ant-api03-...', desc: 'Claude 官方原生 API（网关将自动中转并将标准 OpenAI 转换为 Claude 格式并流式还原）', provider: 'claude' },
  { id: 'antigravity', name: 'Antigravity AI (工作区 API 智能兼容翻译)', endpoint: 'https://api.antigravity.ai', placeholder: 'ag-...', desc: 'Antigravity Workspace Native AGENT 专用翻译转发适配层', provider: 'antigravity' },
  { id: 'openrouter', name: 'OpenRouter (大模型聚合)', endpoint: 'https://openrouter.ai/api/v1', placeholder: 'sk-or-...', desc: '聚合了上百种开源和闭源大模型的代理网关', provider: 'openai' },
  { id: 'openai', name: 'OpenAI (官方原生 API)', endpoint: 'https://api.openai.com/v1', placeholder: 'sk-proj-...', desc: 'OpenAI 官方原装接口标准规范', provider: 'openai' },
  { id: 'ali-dashscope', name: 'Alibaba DashScope (通义千问)', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', placeholder: 'sk-...', desc: '阿里百炼大模型开放平台，兼容 OpenAI 客户端接入', provider: 'openai' },
  { id: 'custom', name: '自定义端点 (Custom Endpoint)', endpoint: '', placeholder: 'https://...', desc: '任何兼容 OpenAI 协议规范的私有部署或三方网关', provider: 'openai' }
];

export const getProviderBadge = (endpoint: string, provider?: string) => {
  const prov = (provider || "").toLowerCase();
  
  if (prov === "gemini") {
    return { name: "Gemini 🇨🇳 原生中置解密翻译", bg: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]" };
  } else if (prov === "claude") {
    return { name: "Claude 🇺🇸 原生中置流式翻译", bg: "bg-[#FFFbeb] text-[#B45309] border-[#fde68a]" };
  } else if (prov === "antigravity") {
    return { name: "Antigravity AI Native 🇨🇳", bg: "bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]" };
  }

  const url = (endpoint || "").toLowerCase();
  if (url.includes("api.siliconflow.cn")) {
    return { name: "SiliconFlow", bg: "bg-[#EBF5EE] text-[#0A3D23] border-[#BCE5CC]" };
  } else if (url.includes("api.groq.com")) {
    return { name: "Groq LPU", bg: "bg-gray-100 text-[#222] border-gray-300" };
  } else if (url.includes("api.sambanova.ai")) {
    return { name: "SambaNova", bg: "bg-red-50 text-red-700 border-red-200" };
  } else if (url.includes("api.deepseek.com")) {
    return { name: "DeepSeek", bg: "bg-sky-50 text-sky-800 border-sky-200" };
  } else if (url.includes("open.bigmodel.cn")) {
    return { name: "智谱 GLM", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" };
  } else if (url.includes("generativelanguage.googleapis.com")) {
    return { name: "Google Gemini", bg: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]" };
  } else if (url.includes("openrouter.ai")) {
    return { name: "OpenRouter", bg: "bg-amber-50 text-amber-800 border-amber-200" };
  } else if (url.includes("api.openai.com")) {
    return { name: "OpenAI 官方", bg: "bg-[#EBF5EE] text-[#0A3D23] border-[#BCECC0]" };
  } else if (url.includes("api.anthropic.com")) {
    return { name: "Anthropic Claude", bg: "bg-[#FFFbeb] text-[#B45309] border-[#fde68a]" };
  } else if (url.includes("api.moonshot.cn")) {
    return { name: "月之暗面 Kimi", bg: "bg-[#F0f6ff] text-[#1d4ed8] border-[#bfdbfe]" };
  } else if (url.includes("api.together.xyz")) {
    return { name: "Together.AI", bg: "bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]" };
  } else if (url.includes("dashscope.aliyuncs.com")) {
    return { name: "阿里通义", bg: "bg-orange-50 text-orange-800 border-orange-200" };
  } else if (url.includes("volces.com") || url.includes("volcengine")) {
    return { name: "火山豆包", bg: "bg-blue-50 text-blue-800 border-blue-200" };
  } else if (url.includes("integrate.api.nvidia.com") || url === "" || url === "https://integrate.api.nvidia.com/v1") {
    return { name: "NVIDIA NIM", bg: "bg-[#E6F4EA] text-[#0F3A20] border-[#A8E6CF]" };
  } else {
    return { name: "通用兼容端点", bg: "bg-slate-100 text-slate-800 border-slate-200" };
  }
};

export interface ErrorResolutionAdvice {
  code: number;
  tag: string;
  category: 'client' | 'auth' | 'rate_limit' | 'not_found' | 'server' | 'network';
  title: string;
  suggestion: string;
  recommendedAction: 'retry_later' | 'remove_model' | 'check_key' | 'check_network' | 'adjust_params';
  actionLabel: string;
}

export const getErrorResolutionAdvice = (statusCode: number, rawError?: string): ErrorResolutionAdvice => {
  const errStr = (rawError || "").toLowerCase();
  
  if (statusCode === 400 || errStr.includes("bad request") || errStr.includes("invalid_request_error")) {
    return {
      code: 400,
      tag: "400 请求异常 / 稍后再试",
      category: "client",
      title: "400 参数格式异常或服务繁忙",
      suggestion: "上游服务报告请求格式不合法或当前请求上下文冲突，建议稍后再试 (Retry Later) 或核对参数；若反复失败可考虑移除。",
      recommendedAction: "retry_later",
      actionLabel: "稍后再试"
    };
  }
  
  if (statusCode === 401 || errStr.includes("unauthorized") || errStr.includes("invalid_api_key") || errStr.includes("invalid api key") || errStr.includes("authentication")) {
    return {
      code: 401,
      tag: "401 密钥鉴权失败",
      category: "auth",
      title: "401 密钥认证未通过",
      suggestion: "该端点的 API Key 无效、已失效或配置错误。请前往「端点管理」更新 Key，或从端点中移除该模型。",
      recommendedAction: "check_key",
      actionLabel: "检查并更新 Key"
    };
  }

  if (statusCode === 403 || errStr.includes("forbidden") || errStr.includes("permission_denied") || errStr.includes("country") || errStr.includes("not allowed")) {
    return {
      code: 403,
      tag: "403 权限受限 / 区域禁止",
      category: "auth",
      title: "403 权限不足或地区受限",
      suggestion: "该 API Key 无权访问此模型，或该端点受到服务商地域限制。建议从可路由端点中移除该模型以避免分流报错。",
      recommendedAction: "remove_model",
      actionLabel: "建议从端点移除"
    };
  }

  if (statusCode === 404 || errStr.includes("not found") || errStr.includes("model_not_found") || errStr.includes("does not exist") || errStr.includes("not_found")) {
    return {
      code: 404,
      tag: "404 模型未部署/已下架",
      category: "not_found",
      title: "404 模型不存在或已被下架",
      suggestion: "目标端点未部署或已下架此模型（或模型名存在细微差异）。强烈建议从端点中移除该模型，防止路由请求持续报错。",
      recommendedAction: "remove_model",
      actionLabel: "建议立即移除"
    };
  }

  if (statusCode === 408 || errStr.includes("timeout") || errStr.includes("timed out") || errStr.includes("deadline exceeded")) {
    return {
      code: 408,
      tag: "408 上游响应超时",
      category: "network",
      title: "408 响应超时 / 队列阻塞",
      suggestion: "上游网关连接超时或模型推理排队耗时过长，属于网络波动或暂时拥堵，建议稍后再试或切换其它低延迟节点。",
      recommendedAction: "retry_later",
      actionLabel: "稍后再试"
    };
  }

  if (statusCode === 413 || errStr.includes("too large") || errStr.includes("context_length_exceeded") || errStr.includes("maximum context length")) {
    return {
      code: 413,
      tag: "413 上下文超限",
      category: "client",
      title: "413 Prompt 长度超出模型上下文",
      suggestion: "发送内容超过了该模型允许的最大 Token 上限，请减小 Prompt 长度后稍后再试。",
      recommendedAction: "adjust_params",
      actionLabel: "精简后重试"
    };
  }

  if (statusCode === 429 || errStr.includes("rate limit") || errStr.includes("quota") || errStr.includes("too many requests") || errStr.includes("insufficient_quota")) {
    return {
      code: 429,
      tag: "429 触发限流 / 配额不足",
      category: "rate_limit",
      title: "429 触发速率限制或额度耗尽",
      suggestion: "触发上游 RPM/TPM 频率限制或账号配额已耗尽。建议稍后再试，或增配备用 Key 分担并发流量。",
      recommendedAction: "retry_later",
      actionLabel: "稍后再试"
    };
  }

  if (statusCode === 500 || errStr.includes("internal server error")) {
    return {
      code: 500,
      tag: "500 服务端内部故障",
      category: "server",
      title: "500 上游内部错误",
      suggestion: "上游模型推理集群发生内部瞬态故障，属于服务端暂时性异常，建议稍后再试 (Retry Later)。",
      recommendedAction: "retry_later",
      actionLabel: "稍后再试"
    };
  }

  if (statusCode === 502 || statusCode === 503 || statusCode === 504 || errStr.includes("bad gateway") || errStr.includes("service unavailable") || errStr.includes("gateway timeout") || errStr.includes("overloaded")) {
    return {
      code: statusCode || 503,
      tag: `${statusCode || 503} 服务过载 / 网关超时`,
      category: "server",
      title: `${statusCode || 503} 服务暂时不可用`,
      suggestion: "上游模型服务当前负载过高、正在维护或网关连接断开，属于暂时性拥塞，建议稍后再试。",
      recommendedAction: "retry_later",
      actionLabel: "稍后再试"
    };
  }

  return {
    code: statusCode || 500,
    tag: `${statusCode ? `HTTP ${statusCode}` : '网络连接异常'}`,
    category: "network",
    title: `${statusCode ? `HTTP ${statusCode}` : '网络连接异常'}`,
    suggestion: "无法与上游模型端点建立正常通信，请检查该节点的 Endpoint 地址连通性，或稍后再试。",
    recommendedAction: "retry_later",
    actionLabel: "稍后再试"
  };
};

export default function App() {
  const [config, setConfig] = useState<NimConfig>({ 
    keys: [], 
    settings: { strategy: 'round-robin', globalQpsLimit: 0, circuitBreakerThreshold: 5, defaultEndpoint: 'https://integrate.api.nvidia.com/v1', adminPassword: 'password' } 
  });
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState('custom');
  const [showSettings, setShowSettings] = useState(false);
  const [fetchingModels, setFetchingModels] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [showLogs, setShowLogs] = useState<Record<string, boolean>>({});
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  
  const [formAvailableModels, setFormAvailableModels] = useState<string[]>([]);
  const [formModelDetails, setFormModelDetails] = useState<Record<string, { contextLength?: number }>>({});
  const [formFetchingModels, setFormFetchingModels] = useState(false);
  const [formModelSearch, setFormModelSearch] = useState('');
  const [modelsSearch, setModelsSearch] = useState('');

  const [newKey, setNewKey] = useState({ 
    name: '', 
    key: '', 
    endpoint: '',
    qpsLimit: 0,
    rpmLimit: 0,
    quotaLimit: 0,
    modelFilters: [] as string[],
    enabled: true
  });
  const [proxyUrl, setProxyUrl] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [viewMode, setViewMode] = useState<'dashboard' | 'endpoints' | 'models' | 'playground' | 'logs'>('dashboard');

  // Stats and global logs tracking state
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    totalRequests: number;
    failedRequests: number;
    totalResponseTimes: number;
    statsHistory: { timestamp: string; requests: number; errorRate: number; avgLatency: number }[];
  }>({
    totalRequests: 0,
    failedRequests: 0,
    totalResponseTimes: 0,
    statsHistory: []
  });

  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const triggerCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Playground States
  const [playgroundModel, setPlaygroundModel] = useState<string>('');
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>('');
  const [playgroundResponse, setPlaygroundResponse] = useState<string>('');
  const [playgroundImageUrl, setPlaygroundImageUrl] = useState<string>('');
  const [playgroundImageBase64, setPlaygroundImageBase64] = useState<string>('');
  const [playgroundVisionImage, setPlaygroundVisionImage] = useState<string | null>(null);
  const [playgroundVisionFilename, setPlaygroundVisionFilename] = useState<string | null>(null);
  const [playgroundLoading, setPlaygroundLoading] = useState<boolean>(false);
  const [playgroundSystemPrompt, setPlaygroundSystemPrompt] = useState<string>('你是一个人工智能助手。');
  const [playgroundTemperature, setPlaygroundTemperature] = useState<number>(0.7);
  const [playgroundImageSize, setPlaygroundImageSize] = useState<string>('1024x1024');
  const [playgroundStream, setPlaygroundStream] = useState<boolean>(true);
  const [playgroundLogs, setPlaygroundLogs] = useState<{ router?: string; duration?: number; tokens?: number } | null>(null);
  
  // Detailed step timings state for sandbox
  const [playgroundTrace, setPlaygroundTrace] = useState<{
    router: string;
    model: string;
    totalDuration: number;
    prepDuration: number;
    routeDuration: number;
    ttfb: number;
    transferDuration: number;
    cleanupDuration: number;
    tokens?: number;
    tokensPerSec?: number;
    status: number;
    steps: {
      id: string;
      name: string;
      desc: string;
      durationMs: number;
      status: 'pending' | 'running' | 'completed' | 'error';
      details?: string;
      timestamp?: string;
    }[];
    requestPayload?: any;
    responseHeaders?: Record<string, string>;
  } | null>(null);
  const [playgroundCurrentSteps, setPlaygroundCurrentSteps] = useState<{
    id: string;
    name: string;
    desc: string;
    durationMs: number;
    status: 'pending' | 'running' | 'completed' | 'error';
    details?: string;
    timestamp?: string;
  }[]>([]);
  const [playgroundActiveTab, setPlaygroundActiveTab] = useState<'response' | 'timings' | 'payload'>('response');
  const [playgroundShowStepPreview, setPlaygroundShowStepPreview] = useState<boolean>(true);

  const allModels = React.useMemo(() => {
    return Array.from(new Set(config.keys.flatMap(key => {
      const confirmed = key.confirmedModels || [];
      if (key.modelFilters && key.modelFilters.length > 0) {
        return confirmed.filter(m => key.modelFilters.includes(m));
      }
      return confirmed;
    }) as string[])).sort();
  }, [config.keys]);

  // Memoize grouped models map for high performance rendering without recalculating on every keystroke
  const groupedModels = React.useMemo(() => {
    const map = new Map<string, {
      modelId: string;
      keys: NimKey[];
      ctx?: string;
      modelType: { label: string; bgClass: string };
    }>();

    config.keys.forEach(key => {
      const confirmed = key.confirmedModels || [];
      const supported = (key.modelFilters && key.modelFilters.length > 0)
        ? confirmed.filter(m => key.modelFilters.includes(m))
        : confirmed;

      supported.forEach(modelId => {
        if (!map.has(modelId)) {
          const sampleKey = config.keys.find(k => k.modelDetails?.[modelId]?.contextLength);
          const ctxLen = sampleKey?.modelDetails?.[modelId]?.contextLength;
          const ctx = ctxLen ? (ctxLen >= 1024 * 1024 ? `${(ctxLen / (1024 * 1024)).toFixed(0)}M` : ctxLen >= 1024 ? `${(ctxLen / 1024).toFixed(0)}K` : ctxLen.toString()) : undefined;
          map.set(modelId, {
            modelId,
            keys: [],
            ctx,
            modelType: detectModelType(modelId)
          });
        }
        map.get(modelId)!.keys.push(key);
      });
    });

    return Array.from(map.values()).sort((a, b) => a.modelId.localeCompare(b.modelId));
  }, [config.keys]);

  // Filtered grouped models for search
  const filteredGroupedModels = React.useMemo(() => {
    if (!modelsSearch.trim()) return groupedModels;
    const q = modelsSearch.toLowerCase().trim();
    return groupedModels.filter(g => g.modelId.toLowerCase().includes(q));
  }, [groupedModels, modelsSearch]);

  // Model availability check state
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testingKeyModel, setTestingKeyModel] = useState<string | null>(null);
  const [modelAvailabilityResults, setModelAvailabilityResults] = useState<Record<string, { 
    success: boolean; 
    latency: number; 
    status: number; 
    reply?: string; 
    error?: string; 
    keyName?: string;
    keyId?: string;
    keyEndpoint?: string;
    testedAt: string;
  }>>({});

  // Count of models currently failing
  const erroredModelsCount = React.useMemo(() => {
    const resList = Object.values(modelAvailabilityResults) as { success: boolean }[];
    return resList.filter(r => r && !r.success).length;
  }, [modelAvailabilityResults]);
  const [keyModelAvailability, setKeyModelAvailability] = useState<Record<string, {
    success: boolean;
    latency: number;
    status: number;
    error?: string;
    testedAt: string;
  }>>({});
  const [batchCheckingModels, setBatchCheckingModels] = useState<boolean>(false);
  const [batchCheckProgress, setBatchCheckProgress] = useState<{ current: number; total: number } | null>(null);

  // Model removal prompt modal/banner state
  const [modelRemovalPrompt, setModelRemovalPrompt] = useState<{
    modelId: string;
    keyId?: string;
    keyName?: string;
    keyEndpoint?: string;
    error: string;
    status: number;
  } | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Run availability check for a specific model (and optionally specific key)
  const checkModelAvailability = async (modelId: string, specificKeyId?: string) => {
    if (specificKeyId) {
      setTestingKeyModel(`${modelId}:${specificKeyId}`);
    } else {
      setTestingModel(modelId);
    }

    try {
      const res = await fetch("/api/test-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, keyId: specificKeyId })
      });
      const result = await res.json();
      const testedAt = new Date().toLocaleTimeString();

      const fullResult = {
        ...result,
        testedAt
      };

      if (specificKeyId) {
        setKeyModelAvailability(prev => ({
          ...prev,
          [`${modelId}:${specificKeyId}`]: {
            success: result.success,
            latency: result.latency || 0,
            status: result.status || (result.success ? 200 : 500),
            error: result.error,
            testedAt
          }
        }));
      }

      setModelAvailabilityResults(prev => ({
        ...prev,
        [modelId]: fullResult
      }));

      if (!result.success) {
        // Automatically prompt user to remove from the failed route endpoint
        setModelRemovalPrompt({
          modelId,
          keyId: result.keyId || specificKeyId,
          keyName: result.keyName || "目标端点",
          keyEndpoint: result.keyEndpoint,
          error: result.error || "模型无法响应 (HTTP 异常)",
          status: result.status || 500
        });
      } else {
        showToast(`模型「${modelId}」可用性检测通过 (200 OK, ${result.latency}ms)`, 'success');
      }
      return fullResult;
    } catch (err: any) {
      const errResult = {
        success: false,
        latency: 0,
        status: 500,
        error: err?.message || "网络请求异常或超时",
        testedAt: new Date().toLocaleTimeString()
      };
      setModelAvailabilityResults(prev => ({ ...prev, [modelId]: errResult }));
      setModelRemovalPrompt({
        modelId,
        keyId: specificKeyId,
        keyName: "当前端点",
        error: errResult.error,
        status: 500
      });
      return errResult;
    } finally {
      if (specificKeyId) {
        setTestingKeyModel(null);
      } else {
        setTestingModel(null);
      }
    }
  };

  // Check ONLY errored or failed models on demand (avoids unnecessary load)
  const handleCheckErroredModelsOnly = async () => {
    if (batchCheckingModels) return;

    // Find models that have failed availability checks or belong to error nodes
    const erroredModels = allModels.filter(m => {
      const res = modelAvailabilityResults[m];
      if (res && !res.success) return true;
      const associatedKeys = config.keys.filter(k => (k.confirmedModels || []).includes(m));
      return associatedKeys.some(k => k.status === 'error' || k.status === 'circuit-broken');
    });

    if (erroredModels.length === 0) {
      showToast('当前未发现异常模型源，所有模型状态正常', 'info');
      return;
    }

    setBatchCheckingModels(true);
    setBatchCheckProgress({ current: 0, total: erroredModels.length });
    let failCount = 0;
    let successCount = 0;

    for (let i = 0; i < erroredModels.length; i++) {
      const m = erroredModels[i];
      setBatchCheckProgress({ current: i + 1, total: erroredModels.length });
      try {
        const res = await fetch("/api/test-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: m })
        });
        const data = await res.json();
        const fullResult = {
          ...data,
          testedAt: new Date().toLocaleTimeString()
        };
        setModelAvailabilityResults(prev => ({ ...prev, [m]: fullResult }));
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err: any) {
        failCount++;
        setModelAvailabilityResults(prev => ({
          ...prev,
          [m]: {
            success: false,
            latency: 0,
            status: 500,
            error: err?.message || "网络故障",
            testedAt: new Date().toLocaleTimeString()
          }
        }));
      }
    }

    setBatchCheckingModels(false);
    setBatchCheckProgress(null);
    showToast(`异常模型复检完成: ${successCount} 个已恢复, ${failCount} 个仍报错`, failCount > 0 ? 'info' : 'success');
  };

  // Batch availability check for all models (explicit user action)
  const handleBatchCheckAllModels = async () => {
    if (batchCheckingModels) return;
    if (allModels.length > 20 && !confirm(`当前共有 ${allModels.length} 个模型，全量逐个检测可能需要耗费数分钟。确定继续全量检测吗？`)) {
      return;
    }

    setBatchCheckingModels(true);
    const modelsToCheck = allModels;
    setBatchCheckProgress({ current: 0, total: modelsToCheck.length });

    let failCount = 0;
    let successCount = 0;

    for (let i = 0; i < modelsToCheck.length; i++) {
      const m = modelsToCheck[i];
      setBatchCheckProgress({ current: i + 1, total: modelsToCheck.length });
      try {
        const res = await fetch("/api/test-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: m })
        });
        const data = await res.json();
        const fullResult = {
          ...data,
          testedAt: new Date().toLocaleTimeString()
        };
        setModelAvailabilityResults(prev => ({ ...prev, [m]: fullResult }));
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err: any) {
        failCount++;
        setModelAvailabilityResults(prev => ({
          ...prev,
          [m]: {
            success: false,
            latency: 0,
            status: 500,
            error: err?.message || "网络故障",
            testedAt: new Date().toLocaleTimeString()
          }
        }));
      }
    }

    setBatchCheckingModels(false);
    setBatchCheckProgress(null);
    showToast(`全量可用性检测完成: ${successCount} 个可用, ${failCount} 个异常`, failCount > 0 ? 'info' : 'success');
  };

  // Remove model from a key or all keys
  const handleRemoveModel = async (modelId: string, keyId?: string) => {
    try {
      if (keyId) {
        const res = await fetch(`/api/keys/${keyId}/remove-model`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-password": localStorage.getItem("nim_admin_password") || ""
          },
          body: JSON.stringify({ modelId })
        });
        const data = await res.json();
        if (data.success) {
          const keyName = config.keys.find(k => k.id === keyId)?.name || "指定端点";
          showToast(`已成功将模型「${modelId}」从端点「${keyName}」中移除`, 'success');
        }
      } else {
        const res = await fetch("/api/remove-model-globally", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-password": localStorage.getItem("nim_admin_password") || ""
          },
          body: JSON.stringify({ modelId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`已成功将模型「${modelId}」从所有关联端点中移除`, 'success');
        }
      }
      
      // Close prompt if open
      if (modelRemovalPrompt?.modelId === modelId) {
        setModelRemovalPrompt(null);
      }
      // Refresh config
      await fetchConfig();
    } catch (err: any) {
      console.error("Remove model error:", err);
      showToast(`移除模型失败: ${err?.message || "未知错误"}`, 'error');
    }
  };

  const handleVisionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert("仅支持上传图片格式文件");
      return;
    }
    
    if (file.size > 4 * 1024 * 1024) {
      alert("上传文件限制在 4MB 以内以确保调用响应速度。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPlaygroundVisionImage(reader.result);
        setPlaygroundVisionFilename(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePlaygroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playgroundModel) {
      alert("请先选择模型");
      return;
    }
    if (!playgroundPrompt.trim()) {
      alert("请输入提示词 / Prompt");
      return;
    }
    
    setPlaygroundLoading(true);
    setPlaygroundResponse('');
    setPlaygroundImageUrl('');
    setPlaygroundImageBase64('');
    setPlaygroundLogs(null);
    setPlaygroundTrace(null);
    
    const initialSteps: PlaygroundStep[] = [
      {
        id: '1',
        name: '客户端协议装配与 Token 估算',
        desc: '校验 Prompt、封包系统提示词、温度配置与多模态图片 Base64',
        durationMs: 0,
        status: 'running',
        details: '正在分析请求体结构与参数合法性...'
      },
      {
        id: '2',
        name: '智能网关寻址与节点健康调度',
        desc: '匹配模型路由池，检测端点 QPS、延迟与熔断器健康状态',
        durationMs: 0,
        status: 'pending',
        details: '等待客户端请求发出...'
      },
      {
        id: '3',
        name: '上游服务握手与首字响应 (TTFB)',
        desc: '与上游大模型推理集群建立连接并接收首个响应数据字节',
        durationMs: 0,
        status: 'pending',
        details: '等待上游首字节到达...'
      },
      {
        id: '4',
        name: '数据流解码传输与内容组装',
        desc: '逐帧解析 SSE 实时数据流或接收完整响应 JSON',
        durationMs: 0,
        status: 'pending',
        details: '等待流式传输完成...'
      },
      {
        id: '5',
        name: '会话收尾与指标聚合',
        desc: '统计 Tokens 消耗、计算生成吞吐速率并写入审计日志',
        durationMs: 0,
        status: 'pending',
        details: '等待指标汇总...'
      }
    ];

    setPlaygroundCurrentSteps(initialSteps);
    const t0 = performance.now();
    const isImageModel = detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image");

    try {
      if (isImageModel) {
        // Step 1: Payload Assembly
        const requestPayload = {
          model: playgroundModel,
          prompt: playgroundPrompt,
          n: 1,
          size: playgroundImageSize,
          response_format: 'b64_json'
        };
        const t1 = performance.now();
        const prepDuration = Math.max(1, Math.round(t1 - t0));

        initialSteps[0] = {
          ...initialSteps[0],
          status: 'completed',
          durationMs: prepDuration,
          details: `生图提示词封包完成 (${playgroundPrompt.length} 字符, 尺寸: ${playgroundImageSize})`
        };
        initialSteps[1] = {
          ...initialSteps[1],
          status: 'running',
          details: '正在调度生图模型可用端点...'
        };
        setPlaygroundCurrentSteps([...initialSteps]);

        // Step 2 & 3: Upstream Call
        const fetchStartTime = performance.now();
        const response = await fetch('/nim-proxy/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.settings.masterKey ? { 'Authorization': `Bearer ${config.settings.masterKey}` } : {})
          },
          body: JSON.stringify(requestPayload)
        });
        
        const tHeaders = performance.now();
        const routeDuration = Math.max(2, Math.round(tHeaders - fetchStartTime));
        const ttfb = routeDuration;
        const routedNodeName = decodeURIComponent(response.headers.get('x-routed-node') || '') || '智能生图集群';

        initialSteps[1] = {
          ...initialSteps[1],
          status: 'completed',
          durationMs: Math.max(1, Math.round(routeDuration * 0.2)),
          details: `命中生图节点: [${routedNodeName}], 路由算法: ${config.settings.strategy}`
        };
        initialSteps[2] = {
          ...initialSteps[2],
          status: 'completed',
          durationMs: routeDuration,
          details: `上游生图推理服务器响应 HTTP ${response.status} (首字节到达: ${ttfb}ms)`
        };
        initialSteps[3] = {
          ...initialSteps[3],
          status: 'running',
          details: '正在接收并反序列化图像 Base64 矩阵...'
        };
        setPlaygroundCurrentSteps([...initialSteps]);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          initialSteps[3].status = 'error';
          initialSteps[3].details = `生图失败: ${errData.error?.message || errData.error || response.statusText}`;
          setPlaygroundCurrentSteps([...initialSteps]);
          throw new Error(errData.error?.message || errData.error || `请求失败 [${response.status}]`);
        }
        
        let resJson;
        try {
          resJson = await response.json();
        } catch (jsonErr) {
          throw new Error("接口返回内容不是合法的 JSON 格式模型对象");
        }
        
        const tTransferDone = performance.now();
        const transferDuration = Math.max(1, Math.round(tTransferDone - tHeaders));

        const b64 = resJson.data?.[0]?.b64_json;
        const url = resJson.data?.[0]?.url;
        
        if (b64) {
          setPlaygroundImageBase64(b64);
        } else if (url) {
          setPlaygroundImageUrl(url);
        } else {
          throw new Error("没能从 NIM 端点返回有效的图像数据");
        }
        
        initialSteps[3] = {
          ...initialSteps[3],
          status: 'completed',
          durationMs: transferDuration,
          details: `图像数据流接收完毕 (Base64 大小: ${b64 ? Math.round(b64.length / 1024) + ' KB' : 'URL 直链'})`
        };
        
        const tEnd = performance.now();
        const cleanupDuration = Math.max(1, Math.round(tEnd - tTransferDone));
        const totalDuration = Math.round(tEnd - t0);

        initialSteps[4] = {
          ...initialSteps[4],
          status: 'completed',
          durationMs: cleanupDuration,
          details: `生图会话完成，全链路总耗时: ${totalDuration}ms`
        };
        setPlaygroundCurrentSteps([...initialSteps]);

        const traceObj = {
          router: routedNodeName,
          model: playgroundModel,
          totalDuration,
          prepDuration,
          routeDuration: Math.max(1, Math.round(routeDuration * 0.2)),
          ttfb,
          transferDuration,
          cleanupDuration,
          status: response.status,
          steps: [...initialSteps],
          requestPayload,
          responseHeaders: {
            'x-routed-node': routedNodeName,
            'content-type': response.headers.get('content-type') || 'application/json'
          }
        };

        setPlaygroundTrace(traceObj);
        setPlaygroundLogs({
          router: routedNodeName,
          duration: totalDuration
        });

      } else {
        // Step 1: Payload Assembly for Chat
        const isVision = detectModelType(playgroundModel).label.includes("视觉") || detectModelType(playgroundModel).label.includes("Vision");
        const userContent = (isVision && playgroundVisionImage)
          ? [
              { type: 'text', text: playgroundPrompt },
              { type: 'image_url', image_url: { url: playgroundVisionImage } }
            ]
          : playgroundPrompt;

        const requestBody = {
          model: playgroundModel,
          messages: [
            ...(playgroundSystemPrompt ? [{ role: 'system', content: playgroundSystemPrompt }] : []),
            { role: 'user', content: userContent }
          ],
          temperature: playgroundTemperature,
          stream: playgroundStream
        };

        const t1 = performance.now();
        const prepDuration = Math.max(1, Math.round(t1 - t0));
        const estimatedPromptTokens = Math.ceil((playgroundPrompt.length + (playgroundSystemPrompt || '').length) / 3.2);

        initialSteps[0] = {
          ...initialSteps[0],
          status: 'completed',
          durationMs: prepDuration,
          details: `请求体装配完成 (估算输入: ~${estimatedPromptTokens} tokens, 包含 ${requestBody.messages.length} 条消息)`
        };
        initialSteps[1] = {
          ...initialSteps[1],
          status: 'running',
          details: `正在通过智能路由算法 (${config.settings.strategy}) 探测可用端点...`
        };
        setPlaygroundCurrentSteps([...initialSteps]);

        // Step 2: Fetch Start
        const fetchStartTime = performance.now();
        const response = await fetch('/nim-proxy/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.settings.masterKey ? { 'Authorization': `Bearer ${config.settings.masterKey}` } : {})
          },
          body: JSON.stringify(requestBody)
        });
        
        const tHeaders = performance.now();
        const rawRouteTime = Math.max(2, Math.round(tHeaders - fetchStartTime));
        const routedNodeName = decodeURIComponent(response.headers.get('x-routed-node') || '') || (config.keys.find(k => (k.confirmedModels || []).includes(playgroundModel))?.name || '智能均衡网关');
        const routerHeaderMs = Number(response.headers.get('x-router-duration-ms')) || Math.min(rawRouteTime, 12);

        initialSteps[1] = {
          ...initialSteps[1],
          status: 'completed',
          durationMs: routerHeaderMs,
          details: `命中活跃端点: [${routedNodeName}], 路由算法: ${config.settings.strategy}, 节点状态: 正常`
        };
        initialSteps[2] = {
          ...initialSteps[2],
          status: 'running',
          details: `已连接至 [${routedNodeName}]，正在等待模型输出首个 Token (TTFB)...`
        };
        setPlaygroundCurrentSteps([...initialSteps]);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          initialSteps[2].status = 'error';
          initialSteps[2].details = `上游返回异常 HTTP ${response.status}: ${errData.error?.message || errData.error || response.statusText}`;
          setPlaygroundCurrentSteps([...initialSteps]);
          throw new Error(errData.error?.message || errData.error || `请求失败 [${response.status}]`);
        }
        
        let tFirstByte = 0;
        let chunkCount = 0;
        let fullOutputText = "";
        let reportedTokens = 0;

        if (playgroundStream && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            if (tFirstByte === 0) {
              tFirstByte = performance.now();
              const ttfb = Math.max(1, Math.round(tFirstByte - fetchStartTime));
              initialSteps[2] = {
                ...initialSteps[2],
                status: 'completed',
                durationMs: ttfb,
                details: `接收到首个 SSE 响应帧 (首字延迟 TTFB: ${ttfb}ms)`
              };
              initialSteps[3] = {
                ...initialSteps[3],
                status: 'running',
                details: '流式数据接收中...'
              };
              setPlaygroundCurrentSteps([...initialSteps]);
            }
            
            chunkCount++;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            
            const lines = accumulated.split("\n");
            accumulated = lines.pop() || "";
            
            for (const line of lines) {
              const cleaned = line.trim();
              if (!cleaned) continue;
              if (cleaned === "data: [DONE]") continue;
              if (cleaned.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(cleaned.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    fullOutputText += delta;
                    setPlaygroundResponse(prev => prev + delta);
                  }
                  if (parsed.usage?.total_tokens) {
                    reportedTokens = parsed.usage.total_tokens;
                  }
                } catch (e) {
                  // ignore parse error
                }
              }
            }
          }
        } else {
          // Non-stream response
          let resJson;
          try {
            resJson = await response.json();
          } catch (jsonErr) {
            throw new Error("接口返回内容不是合法的 JSON 对象 (可能发生了重定向或者是网关拦截)");
          }
          tFirstByte = performance.now();
          const ttfb = Math.max(1, Math.round(tFirstByte - fetchStartTime));
          initialSteps[2] = {
            ...initialSteps[2],
            status: 'completed',
            durationMs: ttfb,
            details: `上游完整响应到达 (首包耗时 TTFB: ${ttfb}ms)`
          };
          
          fullOutputText = resJson.choices?.[0]?.message?.content || '';
          setPlaygroundResponse(fullOutputText);
          reportedTokens = resJson.usage?.total_tokens || 0;
        }

        const tStreamEnd = performance.now();
        const ttfb = tFirstByte ? Math.max(1, Math.round(tFirstByte - fetchStartTime)) : rawRouteTime;
        const transferDuration = tFirstByte ? Math.max(1, Math.round(tStreamEnd - tFirstByte)) : 1;
        
        const finalTokens = reportedTokens || Math.ceil(fullOutputText.length / 2.8) + estimatedPromptTokens;
        const outputTokensOnly = Math.max(1, Math.ceil(fullOutputText.length / 2.8));
        const tokensPerSec = transferDuration > 0 ? Number(((outputTokensOnly / transferDuration) * 1000).toFixed(1)) : 0;

        initialSteps[3] = {
          ...initialSteps[3],
          status: 'completed',
          durationMs: transferDuration,
          details: `流式传输完成 (累计接收 ${chunkCount || 1} 帧, 生成 ~${outputTokensOnly} 输出 Tokens, 速率: ${tokensPerSec} t/s)`
        };

        const tFinal = performance.now();
        const cleanupDuration = Math.max(1, Math.round(tFinal - tStreamEnd));
        const totalDuration = Math.round(tFinal - t0);

        initialSteps[4] = {
          ...initialSteps[4],
          status: 'completed',
          durationMs: cleanupDuration,
          details: `会话指标聚合完成，耗时分析与日志归档完成 (全链路耗时: ${totalDuration}ms)`
        };
        setPlaygroundCurrentSteps([...initialSteps]);

        const traceObj = {
          router: routedNodeName,
          model: playgroundModel,
          totalDuration,
          prepDuration,
          routeDuration: routerHeaderMs,
          ttfb,
          transferDuration,
          cleanupDuration,
          tokens: finalTokens,
          tokensPerSec,
          status: response.status,
          steps: [...initialSteps],
          requestPayload: requestBody,
          responseHeaders: {
            'x-routed-node': routedNodeName,
            'x-router-duration-ms': String(routerHeaderMs),
            'content-type': response.headers.get('content-type') || 'application/json'
          }
        };

        setPlaygroundTrace(traceObj);
        setPlaygroundLogs({
          router: routedNodeName,
          duration: totalDuration,
          tokens: finalTokens
        });
      }
    } catch (err: any) {
      console.error(err);
      const rawErrMsg = err?.message || "未知错误";
      // Parse status code from error if present (e.g. "[400]" or "400")
      const statusMatch = rawErrMsg.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
      const detectedStatus = statusMatch ? parseInt(statusMatch[1], 10) : 500;
      const advice = getErrorResolutionAdvice(detectedStatus, rawErrMsg);
      
      setPlaygroundResponse(
        `❌ 请求执行出错: ${rawErrMsg}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 智能诊断与处理建议 (${advice.tag}):\n` +
        `▸ ${advice.suggestion}\n` +
        `▸ 推荐操作: ${advice.actionLabel}`
      );
      // Mark active step as error
      setPlaygroundCurrentSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error', details: `${err.message} (${advice.actionLabel})` } : s));
    } finally {
      setPlaygroundLoading(false);
    }
  };

  const handleLogin = React.useCallback(async (pwd: string) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setLoginError('服务正在启动中，请稍候重试...');
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success) {
        setAuthenticated(true);
        localStorage.setItem('nim_admin_password', pwd);
        setLoginError('');
      } else {
        setLoginError('密码错误');
        localStorage.removeItem('nim_admin_password');
      }
    } catch (e) {
      setLoginError('连接失败');
    }
  }, []);

  const fetchConfig = React.useCallback(async (forceAll = false) => {
    // Avoid background resource consumption if page is hidden in background
    if (typeof document !== 'undefined' && document.hidden && !forceAll) {
      return;
    }

    try {
      const authHeader = localStorage.getItem('nim_admin_password') || '';
      
      const response = await fetch('/api/config', {
        headers: { 'x-admin-password': authHeader }
      });
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('API /api/config 返回非 JSON 格式内容 (可能正在启动)，稍后将自动重试');
        return;
      }
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.warn('Failed to parse config as JSON:', jsonErr);
        setLoading(false);
        return;
      }
      if (data && Array.isArray(data.keys)) {
        setConfig(data);
      }
      setLoading(false);

      // Fetch stats (always needed for lightweight dashboard metrics)
      try {
        const statsRes = await fetch('/api/stats', {
          headers: { 'x-admin-password': authHeader }
        });
        const statsContentType = statsRes.headers.get('content-type') || '';
        if (statsRes.ok && statsContentType.includes('application/json')) {
          const statsVal = await statsRes.json().catch(() => null);
          if (statsVal) {
            setStats(statsVal);
          }
        }
      } catch (e: any) {
        if (e && (e.message === 'Failed to fetch' || e.name === 'TypeError')) {
          console.warn('Error fetching statistics:', e.message);
        } else {
          console.error('Error fetching statistics:', e);
        }
      }

      // Fetch global logs on-demand or when viewing logs/dashboard/models to save network/CPU
      try {
        const logsRes = await fetch('/api/global-logs', {
          headers: { 'x-admin-password': authHeader }
        });
        const logsContentType = logsRes.headers.get('content-type') || '';
        if (logsRes.ok && logsContentType.includes('application/json')) {
          const logsVal = await logsRes.json().catch(() => null);
          if (logsVal) {
            setGlobalLogs(logsVal);
          }
        }
      } catch (e: any) {
        if (e && (e.message === 'Failed to fetch' || e.name === 'TypeError')) {
          console.warn('Error fetching global logs:', e.message);
        } else {
          console.error('Error fetching global logs:', e);
        }
      }
    } catch (error: any) {
      if (error && (error.message === 'Failed to fetch' || error.name === 'TypeError')) {
        console.warn('Error fetching config:', error.message);
      } else {
        console.error('Error fetching config:', error);
      }
    }
  }, []);

  useEffect(() => {
    const savedPassword = localStorage.getItem('nim_admin_password');
    if (savedPassword) {
      handleLogin(savedPassword);
    }
    setProxyUrl(`${window.location.origin}/nim-proxy`);
  }, [handleLogin]);

  useEffect(() => {
    if (authenticated) {
      fetchConfig(true);
      const interval = setInterval(() => fetchConfig(false), 20000); // 20s interval
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchConfig]);

  const fetchModelsForKey = async (id: string) => {
    setFetchingModels(id);
    try {
      const response = await fetch(`/api/models/${id}`, {
        headers: { 'x-admin-password': localStorage.getItem('nim_admin_password') || '' }
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        alert("获取模型列表失败: 上游端点接口返回了非 JSON 内容，请检查网关是否被外部网页拦截、或端点 URL 填写是否有误。");
        return;
      }
      if (data.data) {
        const rawIds = data.data.map((m: any) => m.id);
        const targetKey = config.keys.find(k => k.id === id);
        const filteredIds = (targetKey && targetKey.modelFilters && targetKey.modelFilters.length > 0)
          ? rawIds.filter((m: string) => targetKey.modelFilters.includes(m))
          : rawIds;
        setAvailableModels(prev => ({
          ...prev,
          [id]: filteredIds
        }));
      } else {
        alert(data.error || '获取失败');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setFetchingModels(null);
    }
  };

  const updateSettings = async (settings: Partial<NimConfig['settings']>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('nim_admin_password') || ''
        },
        body: JSON.stringify(settings),
      });
      if (response.ok && settings.adminPassword) {
        localStorage.setItem('nim_admin_password', settings.adminPassword);
      }
      fetchConfig();
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const openAddForm = () => {
    setEditingKeyId(null);
    setNewKey({ name: '', key: '', endpoint: '', qpsLimit: 0, rpmLimit: 0, quotaLimit: 0, modelFilters: [], enabled: true, provider: 'openai' });
    setSelectedPresetId('custom');
    setValidationResult(null);
    setFormAvailableModels([]);
    setShowAddForm(true);
  };

  const openEditForm = (key: NimKey) => {
    setEditingKeyId(key.id);
    setNewKey({
      name: key.name,
      key: key.key,
      endpoint: key.endpoint || '',
      qpsLimit: key.qpsLimit || 0,
      rpmLimit: key.rpmLimit || 0,
      quotaLimit: key.quotaLimit || 0,
      modelFilters: key.modelFilters || [],
      enabled: key.enabled !== false,
      provider: key.provider || 'openai'
    });
    
    const epClean = (key.endpoint || '').trim().replace(/\/$/, "");
    const matchingPreset = PROVIDER_PRESETS.find(p => p.endpoint && epClean.startsWith(p.endpoint.replace(/\/$/, "")));
    setSelectedPresetId(matchingPreset ? matchingPreset.id : 'custom');
    
    setValidationResult(null);
    setFormAvailableModels(key.confirmedModels || []);
    setShowAddForm(true);
  };

  const fetchFormModels = async () => {
    if (!newKey.key) {
      alert("请先输入 API 密钥 (API Key)");
      return;
    }
    setFormFetchingModels(true);
    try {
      const response = await fetch('/api/fetch-models', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('nim_admin_password') || ''
        },
        body: JSON.stringify({ key: newKey.key, endpoint: newKey.endpoint, provider: newKey.provider || 'openai' })
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        alert("获取模型列表失败: 上游接口拉取模型列表失败，返回了非 JSON 格式格式的内容。请核对密钥以及端点 URL 输入是否正确且能正常连接。");
        setFormFetchingModels(false);
        return;
      }
      if (data.data) {
        const models = Array.from(new Set(data.data.map((m: any) => m.id) as string[]));
        const details: Record<string, { contextLength?: number }> = {};
        data.data.forEach((m: any) => {
          details[m.id] = { contextLength: m.contextLength };
        });
        setFormAvailableModels(models);
        setFormModelDetails(details);
      } else {
        alert(data.error || '获取模型失败');
      }
    } catch (error) {
      console.error('Error fetching form models:', error);
      alert('获取模型失败');
    } finally {
      setFormFetchingModels(false);
    }
  };

  const saveKeyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.key) return;
    try {
      if (editingKeyId) {
        await fetch(`/api/keys/${editingKeyId}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-password': localStorage.getItem('nim_admin_password') || ''
          },
          body: JSON.stringify(newKey),
        });
      } else {
        await fetch('/api/keys', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-password': localStorage.getItem('nim_admin_password') || ''
          },
          body: JSON.stringify(newKey),
        });
      }
      setShowAddForm(false);
      fetchConfig();
    } catch (error) {
      console.error('Error saving key:', error);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('您确定要删除此端点吗？')) return;
    try {
      await fetch(`/api/keys/${id}`, { 
        method: 'DELETE',
        headers: { 'x-admin-password': localStorage.getItem('nim_admin_password') || '' }
      });
      fetchConfig();
    } catch (error) {
      console.error('Error deleting key:', error);
    }
  };

  const toggleKey = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/keys/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('nim_admin_password') || ''
        },
        body: JSON.stringify({ enabled }),
      });
      fetchConfig();
    } catch (error) {
      console.error('Error toggling key:', error);
    }
  };

  const resetKeyStatus = async (id: string) => {
     try {
      await fetch(`/api/keys/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('nim_admin_password') || ''
        },
        body: JSON.stringify({ status: 'active', consecutiveFailures: 0 }),
      });
      fetchConfig();
    } catch (error) {
      console.error('Error resetting key:', error);
    }
  };

  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ status: 'idle' | 'success' | 'error', message: string } | null>(null);

  const validateKey = async () => {
    if (!newKey.key) {
      setValidationResult({ status: 'error', message: '请输入 API 密钥' });
      return;
    }
    setIsValidating(true);
    setValidationResult(null);
    try {
      const response = await fetch('/api/keys/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: newKey.key,
          endpoint: newKey.endpoint
        })
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        setValidationResult({ status: 'error', message: '极速检测接口返回格式异常 (未返回预期 JSON 属性，请核对端口)' });
        setIsValidating(false);
        return;
      }
      if (data.valid) {
        setValidationResult({ status: 'success', message: data.message || `验证通过! 发现 ${data.models.length} 个可用模型。` });
        setFormAvailableModels(Array.from(new Set(data.models as string[])));
        
        // Auto-fill recommendations if currently 0
        if (data.recommendations) {
          setNewKey(prev => ({
            ...prev,
            rpmLimit: prev.rpmLimit || data.recommendations.rpmLimit || 0,
            quotaLimit: prev.quotaLimit || data.recommendations.quotaLimit || 0
          }));
        }

        if (data.modelDetails) {
            const details: Record<string, { contextLength?: number }> = {};
            data.modelDetails.forEach((m: any) => {
                details[m.id] = { contextLength: m.contextLength };
            });
            setFormModelDetails(details);
        }
      } else {
        const desc = data.error || (data.status ? getErrorDescription(data.status) : '未知错误');
        setValidationResult({ status: 'error', message: `验证失败: ${desc}` });
      }
    } catch (e) {
      setValidationResult({ status: 'error', message: '网络异常: 无法连接到验证接口' });
    } finally {
      setIsValidating(false);
    }
  };

  const getErrorDescription = (status: number) => {
    switch (status) {
      case 401: return 'API Key 错误或已过期';
      case 403: return '无权访问该模型';
      case 404: return '模型不存在/路径错误';
      case 429: return '触发频率限制';
      case 500: return 'NVIDIA 服务器内部错误';
      case 503: return '服务器目前不可用';
      default: return '未知接口错误';
    }
  };

  const runAllHealthChecks = async () => {
    setIsCheckingHealth(true);
    try {
      await fetch('/api/health-check/run', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('nim_admin_password') || ''
        }
      });
      fetchConfig();
    } catch (error) {
      console.error('Error running health checks:', error);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const copyProxyUrl = () => {
    navigator.clipboard.writeText(proxyUrl);
    alert('代理 URL 已复制到剪贴板！');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1d] text-slate-700 dark:text-slate-200 font-sans selection:bg-emerald-200 selection:text-slate-900 antialiased custom-scrollbar">
      {!authenticated ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100/60 dark:bg-[#080d1a] relative overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-850 w-full max-w-md shadow-lg rounded-2xl overflow-hidden relative z-10"
          >
            <div className="bg-slate-50 dark:bg-[#15223c]/50 border-b border-slate-150 dark:border-slate-800 p-4.5 flex justify-between items-center font-mono text-[10px] tracking-wider text-slate-500 dark:text-slate-450">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> CORE ACCESS BLOCK</span>
              <span className="w-2 h-2 rounded-full bg-emerald-550 animate-pulse"></span>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <div className="inline-flex p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 mb-1">
                  <Scissors size={22} />
                </div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-sans">羊毛薅到底 智能分流网关</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">请填入正确的控制台安全凭证，开启企业级故障隔离与多源大模型调度大厅。</p>
              </div>
              
              <div className="space-y-3.5">
                <div className="relative">
                  <input 
                    type="password"
                    placeholder="请输入控制台口令密码 (默认: password)"
                    className="w-full bg-slate-50 dark:bg-[#15223c]/30 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-600 font-mono text-sm px-4 py-3 text-slate-800 dark:text-slate-150 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin(password)}
                  />
                </div>
                {loginError && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-red-600 text-xs font-mono bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/35 p-2.5 rounded-lg">
                    <AlertCircle size={14} />
                    <span>{loginError}</span>
                  </motion.div>
                )}
              </div>
              
              <button 
                onClick={() => handleLogin(password)}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-slate-950 text-xs font-bold text-white py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] cursor-pointer"
              >
                <span>进入控制中心</span>
                <ChevronRight size={14} className="stroke-[3]" />
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Navigation Header */}
          <header className="border-b border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row justify-between items-center bg-white/90 dark:bg-[#0d1527]/90 backdrop-blur-md sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-3.5 mb-4 md:mb-0">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center text-white">
                <Scissors className="w-5.5 h-5.5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">羊毛薅到底 高可用调度网关</h1>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md font-mono">v2.2.0</span>
                </div>
                <p className="font-sans text-[10px] uppercase tracking-wider mt-1 text-slate-400 dark:text-slate-500 font-medium">Eco-friendly Multi-Endpoint Free Quota Optimizer & Aggregated Dispatcher</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <button 
                id="theme-toggle"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#15223c]/40 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#15223c] transition-all flex items-center justify-center cursor-pointer"
                title={theme === 'dark' ? "切换为浅色主题" : "切换为深色主题"}
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('nim_admin_password');
                  setAuthenticated(false);
                }}
                className="font-mono text-[10.5px] bg-slate-100 dark:bg-[#15223c]/40 hover:bg-slate-200 dark:hover:bg-[#15223c] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-2 rounded-lg transition-all font-bold cursor-pointer"
              >
                退出
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${showSettings ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'bg-slate-100 dark:bg-[#15223c]/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#15223c]'}`}
                title="网关全局配置"
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={openAddForm}
                className="p-2 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-650 dark:hover:bg-emerald-550 text-white dark:text-slate-950 transition-all flex items-center gap-1.5 font-sans font-bold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                <Plus size={15} className="stroke-[3]" />
                <span>添加节点端点</span>
              </button>
            </div>
          </header>

          <main className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Global Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: '在线可用节点', value: `${config.keys.filter(k => k.enabled && k.status === 'active').length} / ${config.keys.length}`, desc: '集群物理探针统计', icon: Database, colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100/80' },
                { label: '总请求计数', value: config.keys.reduce((acc, k) => acc + k.useCount, 0).toLocaleString(), desc: '累计成功中转吞吐', icon: Activity, colorClass: 'text-cyan-600 bg-cyan-50 border-cyan-100/80' },
                { label: '底层调度策略', value: config.settings.strategy.toUpperCase().replace('-', '_'), desc: '算法自调优机制', icon: RefreshCw, colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-100/80' },
                { label: '负载成功率', value: `${((config.keys.reduce((acc, k) => acc + (k.useCount - (k.errorCount || 0)), 0) / (config.keys.reduce((acc, k) => acc + k.useCount, 0) || 1)) * 100).toFixed(1)}%`, desc: '防熔断安全重平衡', icon: CheckCircle2, colorClass: 'text-teal-600 bg-teal-50 border-teal-100/80' },
              ].map((stat, i) => (
                <div key={i} className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
                  <div className="space-y-1">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">{stat.label}</p>
                    <p className="text-2xl font-mono tracking-tight text-slate-800 font-extrabold">{stat.value}</p>
                    <p className="text-[10px] text-slate-500 font-sans">{stat.desc}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${stat.colorClass} transition-opacity`}>
                    <stat.icon size={17} />
                  </div>
                </div>
              ))}
              
              <button 
                onClick={runAllHealthChecks}
                disabled={isCheckingHealth}
                className="bg-white border border-emerald-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm hover:bg-emerald-50/25 hover:border-emerald-300 transition-all disabled:opacity-50 cursor-pointer min-h-[100px]"
              >
                <ShieldCheck size={22} className={isCheckingHealth ? "animate-spin text-emerald-600 mb-1" : "text-emerald-500 mb-1 animate-pulse"} />
                <span className="font-mono text-[10px] tracking-wider uppercase font-extrabold text-emerald-600">{isCheckingHealth ? '轮询诊断中...' : '启动健康检查'}</span>
                <span className="text-[9px] text-slate-500 font-sans mt-0.5">多路端点并发探针</span>
              </button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.section 
                  initial={{ height: 0, opacity: 0, scale: 0.99 }}
                  animate={{ height: 'auto', opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm relative animate-none"
                >
                  <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-slate-400 font-medium uppercase select-none">SYSTEM_GLOBAL_PREFERENCE</div>
                  
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-mono uppercase font-bold text-slate-800">
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <span>全局高可用调度策略与安全熔断器参数配置</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="font-sans text-[11px] uppercase text-slate-500 font-bold">1. 路由负载调度算法 (LB Strategy)</label>
                      <select 
                        value={config.settings.strategy}
                        onChange={(e) => updateSettings({ strategy: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 text-slate-850 focus:outline-none focus:border-emerald-600 rounded-xl cursor-pointer"
                      >
                        <option value="round-robin">轮询优先分配 (Round Robin)</option>
                        <option value="random">随机哈希匹配 (Random)</option>
                        <option value="least-used">最少请求优先 (Least Used)</option>
                        <option value="weighted">比例自动分配 (Weighted - 基于额度)</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="font-sans text-[11px] uppercase text-slate-500 font-bold">2. 全局 QPS 限流保护并防炸源 (0为无限制)</label>
                      <input 
                        type="number"
                        value={config.settings.globalQpsLimit}
                        onChange={(e) => updateSettings({ globalQpsLimit: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-emerald-600 rounded-xl font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="font-sans text-[11px] uppercase text-slate-500 font-bold">3. 节点熔断阈值 (连续失败最大上限)</label>
                      <input 
                        type="number"
                        value={config.settings.circuitBreakerThreshold}
                        onChange={(e) => updateSettings({ circuitBreakerThreshold: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-emerald-600 rounded-xl font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="font-sans text-[11px] uppercase text-slate-500 font-bold">4. 自动守护健康检查间隔 (分钟, 0为关闭)</label>
                      <input 
                        type="number"
                        value={config.settings.healthCheckInterval || 0}
                        onChange={(e) => updateSettings({ healthCheckInterval: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-emerald-600 rounded-xl font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="font-sans text-[11px] uppercase text-slate-500 font-bold">5. 动态默认网关端点代理前缀 (Fallback Gateway URL)</label>
                      <input 
                        type="url"
                        value={config.settings.defaultEndpoint}
                        onChange={(e) => updateSettings({ defaultEndpoint: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-emerald-600 rounded-xl font-mono"
                      />
                    </div>
                    
                    <div className="space-y-4.5 col-span-1 md:col-span-3 border-t border-slate-100 pt-4.5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="font-sans text-[11px] uppercase text-slate-500 font-bold">6. 控制台统一鉴权凭证 (Master Token)</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="设置网关鉴权令牌，留空鉴于免密自由模式"
                              value={config.settings.masterKey || ''}
                              onChange={(e) => updateSettings({ masterKey: e.target.value })}
                              className="flex-1 bg-slate-50 border border-slate-200 text-xs px-3.5 py-2 text-slate-800 focus:outline-none focus:border-emerald-600 rounded-xl font-mono"
                            />
                            <button 
                              onClick={() => updateSettings({ masterKey: 'sk-router-' + Math.random().toString(36).substring(2, 10) })}
                              className="px-3 bg-slate-105 border border-slate-200 hover:border-emerald-500 text-slate-600 hover:text-emerald-600 transition-colors rounded-xl font-mono text-[10px] font-bold cursor-pointer"
                            >
                              安全生成
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal font-sans">留空表示中转通道对外不需要验证 Bearer Token。设定后必须加上 `Authorization Bearer` 报头方可中转。</p>
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="font-sans text-[11px] uppercase text-slate-500 font-bold">7. 控制台管理密码 (Console Password)</label>
                          <input 
                            type="password"
                            placeholder="请重新设置解锁访问密码"
                            value={config.settings.adminPassword || ''}
                            onChange={(e) => updateSettings({ adminPassword: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2 text-slate-800 focus:outline-none focus:border-emerald-600 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Proxy Info Card */}
            <section className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm font-bold tracking-tight text-slate-800 font-sans">安全网络分流中转连接指南</h2>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0 self-start md:self-auto">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider">GATEWAY DISPATCH ACTIVE</span>
                </div>
              </div>
              
              <div className="mt-5 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed max-w-4xl font-sans">
                  本中转网关拥有极出色的多上游向下兼容能力，已将包括 <b>SiliconFlow、Groq、Google Gemini、DeepSeek、Together AI 与火山豆包</b> 等在内的上百种开源/闭源模型进行了 100% 标准 OpenAI SDK 逻辑重包装。您可以直接将您的任意 AI 客户端、双脑编辑应用 (如 Cursor, Claude Code, Cline vscode) 中的 OpenAI 兼容 API 入口指向下方网关，接口将自动为您分流并监控上游活跃性！
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold block">1. 统一接口网关基址 (API Base URL)</span>
                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2.5 pl-3.5 items-center justify-between hover:border-slate-300 transition-all">
                      <code className="font-mono text-xs text-emerald-700 font-bold select-all truncate break-all">{proxyUrl}</code>
                      <button 
                        onClick={copyProxyUrl}
                        title="复制网关基础基址"
                        className="p-2 hover:bg-slate-200 hover:text-emerald-700 text-slate-500 transition-colors shrink-0 rounded-lg cursor-pointer"
                      >
                        {copiedStates['proxyUrl'] ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold block">2. 统一调用认证密钥 (Master Authorization Key)</span>
                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2.5 pl-3.5 items-center justify-between hover:border-slate-300 transition-all">
                      <code className="font-mono text-xs text-indigo-700 font-bold select-all truncate break-all">
                        {config.settings.masterKey ? `Bearer ${config.settings.masterKey}` : "无需凭证 (网关免密可用)"}
                      </code>
                      <button 
                        onClick={() => {
                          const tokenText = config.settings.masterKey ? `Bearer ${config.settings.masterKey}` : "";
                          navigator.clipboard.writeText(tokenText);
                          triggerCopy('masterTokenCopy', tokenText);
                        }}
                        title="复制认证密钥"
                        className="p-2 hover:bg-slate-200 hover:text-indigo-700 text-slate-500 transition-colors shrink-0 rounded-lg cursor-pointer"
                      >
                        {copiedStates['masterTokenCopy'] ? <CheckCircle2 size={15} className="text-indigo-650" /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Endpoints List Tab Navigation */}
            <section className="space-y-4">
              <div className="bg-slate-100 border border-slate-200/85 p-1.5 rounded-2xl">
                <div className="flex items-center gap-1.5 overflow-x-auto scroller-hidden">
                  {[
                    { mode: 'dashboard', label: '核心仪表盘', desc: 'Dashboard', icon: BarChart2 },
                    { mode: 'endpoints', label: '可路由端点', desc: 'Endpoints', icon: Database },
                    { mode: 'models', label: '聚合模型源', desc: 'Models', icon: Activity },
                    { mode: 'playground', label: '网关沙盒测试', desc: 'Playground', icon: Sparkles },
                    { mode: 'logs', label: '中转实时日志', desc: 'Proxy Logs', icon: FileText },
                  ].map((tab) => {
                    const isActive = viewMode === tab.mode;
                    return (
                      <button 
                        key={tab.mode}
                        onClick={() => setViewMode(tab.mode as any)}
                        className={`px-4 py-2.5 rounded-xl font-sans text-xs flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                          isActive 
                            ? 'bg-[#094D2B] text-white font-bold shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 font-medium'
                        }`}
                      >
                        <tab.icon size={14} className={isActive ? 'stroke-[2.5]' : 'opacity-70'} />
                        <span className="font-bold leading-normal">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {viewMode === 'dashboard' ? (
                    <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  {/* Bento Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all group relative overflow-hidden">
                      <div className="flex justify-between items-start text-slate-500">
                        <span className="font-sans text-[11px] uppercase font-bold tracking-wider">路由配置节点 (Total Node Keys)</span>
                        <div className="p-1.5 bg-slate-50 rounded-lg text-emerald-600 border border-slate-100"><Database size={15} /></div>
                      </div>
                      <div className="my-3">
                        <p className="text-3xl font-mono font-extrabold text-slate-800">{config.keys.length}</p>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-150">
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          {config.keys.filter(k => k.enabled && k.status === 'active').length} 活跃
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {config.keys.filter(k => k.enabled && (k.status === 'error' || k.status === 'circuit-broken')).length} 故障
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all group relative overflow-hidden">
                      <div className="flex justify-between items-start text-slate-500">
                        <span className="font-sans text-[11px] uppercase font-bold tracking-wider">已处理总流量 (Proxy Traffic)</span>
                        <div className="p-1.5 bg-slate-50 rounded-lg text-cyan-600 border border-slate-100"><Activity size={15} /></div>
                      </div>
                      <div className="my-3">
                        <p className="text-3xl font-mono font-extrabold text-slate-800">{(stats.totalRequests || 0).toLocaleString()}</p>
                      </div>
                      <span className="font-sans text-[10px] text-slate-400 leading-normal">累计向各路模型容器发起的并发调用数</span>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all group relative overflow-hidden">
                      <div className="flex justify-between items-start text-slate-500">
                        <span className="font-sans text-[11px] uppercase font-bold tracking-wider">网关异常率 (Proxy Failures)</span>
                        <div className="p-1.5 bg-slate-50 rounded-lg text-rose-600 border border-slate-100"><AlertCircle size={15} /></div>
                      </div>
                      <div className="my-3">
                        <p className="text-3xl font-mono font-extrabold text-slate-800">
                          {stats.totalRequests > 0 ? ((stats.failedRequests / stats.totalRequests) * 100).toFixed(1) : "0.0"}%
                        </p>
                      </div>
                      <span className="font-sans text-[10px] text-slate-400 leading-normal">
                        因上游超时或不可抗力熔断的故障占比
                      </span>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all group relative overflow-hidden">
                      <div className="flex justify-between items-start text-slate-500">
                        <span className="font-sans text-[11px] uppercase font-bold tracking-wider">最新平均延时 (Avg Latency)</span>
                        <div className="p-1.5 bg-slate-50 rounded-lg text-indigo-600 border border-slate-100"><Clock size={15} /></div>
                      </div>
                      <div className="my-3">
                        <p className="text-3xl font-mono font-extrabold text-slate-800">
                          {stats.totalRequests - stats.failedRequests > 0 
                            ? Math.round(stats.totalResponseTimes / (stats.totalRequests - stats.failedRequests)) 
                            : 200} ms
                        </p>
                      </div>
                      <span className="font-sans text-[10px] text-slate-400 leading-normal">网关在智能去抖、断线重连下的极速表现</span>
                    </div>
                  </div>

                  {/* Recharts Area Chart for API Traffic metrics */}
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <BarChart2 size={16} className="text-emerald-600" />
                        <h3 className="font-sans text-xs uppercase tracking-wider font-extrabold text-slate-800">并发吞吐与网络延迟折线微拓扑监控</h3>
                      </div>
                      <span className="font-mono text-[9px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold">● LIVE METRIC WATCH</span>
                    </div>
                
                    {stats.statsHistory && stats.statsHistory.length > 0 ? (
                       <div className="h-64 sm:h-72 w-full font-mono text-[10px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.statsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                              </linearGradient>
                              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="timestamp" stroke="#94A3B8" tickLine={false} />
                            <YAxis yAxisId="left" stroke="#10B981" tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" stroke="#6366F1" tickLine={false} />
                            <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                            <Area yAxisId="left" type="monotone" dataKey="requests" name="请求中转发射/分钟" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                            <Area yAxisId="right" type="monotone" dataKey="avgLatency" name="平均代理延迟(ms)" stroke="#6366F1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorLatency)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-400 font-mono">网关流量探针实时加载中...</div>
                    )}
                  </div>

                  {/* Dashboard lower sections: Providers summary & Recent traffic log feed */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Active Provider Nodes list */}
                    <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                      <div className="space-y-4">
                        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                          <span className="font-sans text-xs uppercase tracking-wider font-extrabold text-slate-800">分流负载多渠道可用源 (PROVIDER POOL)</span>
                          <span className="font-mono text-[9px] text-[#10B981] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold">
                            均衡策略: {config.settings.strategy.toUpperCase().replace('-', '_')}
                          </span>
                        </div>
                        
                        {config.keys.length === 0 ? (
                           <div className="p-8 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-200 rounded-xl">
                            网关处于真空状态，请在右上角添加节点端点密钥。
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1 style-scrollbar custom-scrollbar">
                            {config.keys.map(key => {
                              const usedPercent = key.quotaLimit ? Math.round(((key.quotaUsed || 0) / key.quotaLimit) * 100) : 0;
                              const badge = getProviderBadge(key.endpoint, key.provider);
                              return (
                                <div key={key.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors px-1">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${!key.enabled ? 'bg-slate-300' : key.status === 'active' ? 'bg-emerald-500 shadow-sm animate-pulse' : key.status === 'rate-limited' ? 'bg-amber-400' : 'bg-red-500'}`}></span>
                                    <div className="truncate min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-sans text-sm font-bold text-slate-850 truncate">{key.name}</p>
                                        <span className={`px-2 py-0.5 border text-[9px] font-mono rounded-md font-bold ${
                                          badge.bg.includes('emerald') || badge.bg.includes('green') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                          badge.bg.includes('purple') ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                                          badge.bg.includes('orange') || badge.bg.includes('amber') ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                          'bg-indigo-50 text-indigo-600 border-indigo-100'
                                        }`}>
                                          {badge.name}
                                        </span>
                                      </div>
                                      <p className="font-mono text-[10px] text-slate-400 truncate mt-1">{key.endpoint || 'Built-in Provider Proxy'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-5 shrink-0 font-mono text-[11px]">
                                    <div className="text-right">
                                      <span className="text-slate-400 text-[9px] font-bold block">RPM LIMIT</span>
                                      <p className="font-bold text-slate-700">{key.rpmLimit || '∞'}</p>
                                    </div>
                                    <div className="text-right w-20">
                                      <span className="text-slate-400 text-[9px] font-bold block">QUOTA USED</span>
                                      <p className="font-bold text-slate-600">{key.quotaLimit ? `${usedPercent}%` : 'NO_LIMIT'}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-150 text-slate-500 p-3 font-sans text-xs flex justify-between items-center shrink-0 mt-5 rounded-xl">
                        <span className="flex items-center gap-1.5 text-slate-500 text-[10px] leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          多路备用隧道机制：当第一顺位主渠道拥堵或断网时，智能探针将在毫秒级重平衡！
                        </span>
                        <span className="font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1 shrink-0" onClick={() => setViewMode('endpoints')}>
                          <span>精细策略管理</span>
                          <span>&rarr;</span>
                        </span>
                      </div>
                    </div>
  
                    {/* Recent Transactions Feed */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                      <div className="space-y-4">
                        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                          <span className="font-sans text-xs uppercase tracking-wider font-extrabold text-slate-800">网关中转实时链路穿透流水 (LIVE STREAM)</span>
                          <Terminal size={14} className="text-emerald-500 animate-pulse" />
                        </div>
                        
                        {globalLogs.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400 font-mono italic border border-dashed border-slate-200 rounded-xl">
                            等待中转网关接收并发请求流量...
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-[11px] font-mono custom-scrollbar">
                            {globalLogs.slice(0, 8).map((log, idx) => {
                              const isErr = log.status >= 400;
                              return (
                                <div key={log.id || idx} className="p-2.5 rounded-xl border bg-slate-50/50 border-slate-150 flex items-center justify-between hover:bg-slate-100 hover:border-slate-200 transition-all">
                                  <div className="min-w-0 flex-1 mr-2 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 text-[8.5px] font-bold rounded font-mono uppercase tracking-wider">{log.method}</span>
                                      <span className="truncate max-w-[130px] font-bold text-slate-700">{log.model}</span>
                                    </div>
                                    <p className="text-[9.5px] text-slate-400 truncate">{log.path} &middot; <span className="opacity-80 font-bold">{log.keyName}</span></p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isErr ? "bg-red-50 text-red-650 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                                      {log.status}
                                    </span>
                                    <p className="text-[9px] text-slate-400 mt-1 font-mono">{log.duration ? `${log.duration}ms` : '100ms'}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

              ) : viewMode === 'endpoints' ? (
                <motion.div key="endpoints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {config.keys.map((key) => (
                    <React.Fragment key={`frag-${key.id}`}>
                    <motion.div 
                      key={key.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group bg-white border border-slate-200 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:bg-slate-50/55 shadow-sm ${!key.enabled ? 'grayscale opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button 
                          onClick={() => toggleKey(key.id, !key.enabled)}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${key.enabled ? (key.status === 'circuit-broken' || key.status === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold' : 'bg-emerald-50 border-emerald-200 text-emerald-600 font-bold') : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                        >
                          <Key size={17} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => openEditForm(key)} className="font-sans text-sm hover:underline text-left truncate font-bold text-slate-800">
                              {key.name}
                            </button>
                            {(() => {
                              const badge = getProviderBadge(key.endpoint, key.provider);
                              return (
                                <span className={`px-2 py-0.5 border text-[9px] font-mono rounded-full font-bold ${
                                  badge.bg.includes('emerald') || badge.bg.includes('green') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                  badge.bg.includes('purple') ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                                  badge.bg.includes('orange') || badge.bg.includes('amber') ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                  'bg-indigo-50 text-indigo-600 border-indigo-100'
                                }`}>
                                  {badge.name}
                                </span>
                              );
                            })()}
                            {key.modelFilters && key.modelFilters.length > 0 && (
                              <span className="px-1.5 py-0.5 border border-emerald-100 bg-emerald-50/50 text-emerald-700 text-[8px] font-mono rounded font-bold">路由过滤</span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] opacity-65 truncate flex items-center gap-2 mt-1">
                            <span className="truncate max-w-[200px] text-slate-500">{key.endpoint || (config.settings.defaultEndpoint + ' (系统默认)')}</span>
                            {key.rpmLimit ? <span className="text-emerald-600 font-bold">RPM: {key.rpmLimit}</span> : null}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-6 font-mono text-sm shrink-0">
                        <div className="flex items-center gap-2">
                          {key.status === 'active' ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : key.status === 'rate-limited' ? (
                            <Clock size={16} className="text-amber-500 animate-pulse" />
                          ) : key.status === 'circuit-broken' ? (
                            <AlertCircle size={16} className="text-red-700 animate-pulse" />
                          ) : (
                            <AlertCircle size={16} className="text-red-600" />
                          )}
                          <div className="flex flex-col">
                            <span className="hidden lg:inline text-xs uppercase font-bold text-slate-700">
                              {key.status === 'active' ? '在线' : key.status === 'rate-limited' ? '限流冷却中' : key.status === 'error' ? '异常' : key.status === 'circuit-broken' ? '已熔断' : '未知状态'}
                            </span>
                            {(key.status === 'circuit-broken' || key.status === 'rate-limited') && (
                              <button 
                                onClick={() => resetKeyStatus(key.id)}
                                className="text-[9px] hover:underline text-rose-600 font-semibold mt-0.5 cursor-pointer"
                              >
                                手动恢复
                              </button>
                            )}
                          </div>
                        </div>

                        {key.quotaLimit ? (
                          <div className="flex flex-col items-end sm:w-28 text-right">
                             <span className="text-[10px] opacity-40 uppercase leading-none mb-1 font-bold">剩余额度</span>
                             <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-1 select-none font-bold">
                                <div 
                                  className="h-full bg-emerald-500 transition-all" 
                                  style={{ width: `${Math.max(0, Math.min(100, (1 - (key.quotaUsed || 0) / key.quotaLimit) * 100))}%` }}
                                />
                             </div>
                             <span className="numeric text-[10px] font-bold text-emerald-600">{Math.max(0, key.quotaLimit - (key.quotaUsed || 0))}/{key.quotaLimit}</span>
                          </div>
                        ) : null}

                        <div className="flex flex-col items-end sm:w-24">
                          <span className="text-[10px] opacity-40 uppercase leading-none mb-1 font-bold">成功/总数</span>
                          <span className="numeric text-[11px] font-bold text-slate-700">{(key.useCount || 0) - (key.errorCount || 0)}/{key.useCount || 0}</span>
                        </div>

                        <div className="flex flex-col items-end sm:w-32 hidden sm:flex font-sans">
                          <span className="text-[10px] opacity-40 uppercase leading-none mb-1 font-bold">最后透传时间</span>
                          <span className="text-[11px] truncate w-full text-right text-slate-500">
                            {key.lastUsed ? new Date(key.lastUsed).toLocaleTimeString() : '从未调用'}
                          </span>
                        </div>

                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => {
                              if (availableModels[key.id]) {
                                setAvailableModels(prev => {
                                  const next = { ...prev };
                                  delete next[key.id];
                                  return next;
                                });
                              } else if (key.confirmedModels) {
                                const supported = (key.modelFilters && key.modelFilters.length > 0)
                                  ? key.confirmedModels.filter(m => key.modelFilters.includes(m))
                                  : key.confirmedModels;
                                setAvailableModels(prev => ({ ...prev, [key.id]: supported }));
                              } else {
                                fetchModelsForKey(key.id);
                              }
                            }}
                            className={`p-2 transition-colors border rounded-lg hover:bg-slate-50 cursor-pointer ${availableModels[key.id] ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-205 text-slate-500 bg-white'}`}
                            title={availableModels[key.id] ? "收起模型列表" : (key.confirmedModels ? "查看已确认模型" : "查询模型")}
                          >
                            <Database size={16} className={fetchingModels === key.id ? "animate-spin" : ""} />
                          </button>

                          <button 
                            onClick={() => setShowLogs(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                            className={`p-2 transition-colors border rounded-lg hover:bg-slate-50 cursor-pointer ${showLogs[key.id] ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-205 text-slate-500 bg-white'}`}
                            title="查看最后 3 次调用日志"
                          >
                            <History size={16} />
                          </button>

                          <button 
                            onClick={() => deleteKey(key.id)}
                            className="p-2 text-rose-600 border border-slate-200 rounded-lg hover:bg-rose-50 hover:border-rose-150 transition-colors bg-white cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                    
                    {showLogs[key.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mx-4 mb-4 mt-[-4px] bg-slate-50 border border-slate-200 text-slate-700 p-4.5 rounded-xl text-[10px] font-mono shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/80 uppercase tracking-wider text-[8px] font-bold text-slate-500">
                          <span>并发调用追踪 (CONCURRENT CALL TRACKER)</span>
                          <span>最近 3 次流水</span>
                        </div>
                        {key.lastLogs && key.lastLogs.length > 0 ? (
                          <div className="space-y-2">
                            {key.lastLogs.map((log, idx) => (
                              <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 py-1 last:border-0 ${log.status >= 400 ? 'text-rose-600' : ''}`}>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={log.status >= 400 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>[{log.status}]</span>
                                  <span className="opacity-70">{formatDateTime(log.timestamp)}</span>
                                  <span className="bg-slate-200/80 px-1 rounded text-slate-800 truncate max-w-[150px]">{log.model}</span>
                                  {log.status >= 400 && (
                                    <span className="font-bold text-[8px] border border-rose-400 px-1 rounded">
                                      {getErrorDescription(log.status)}
                                    </span>
                                  )}
                                </div>
                                <span className="opacity-50 truncate sm:text-right font-mono text-[9px]">PATH: {log.path}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="opacity-40 italic py-2 text-center text-[10px]">无历史调用记录</div>
                        )}
                      </motion.div>
                    )}

                    {availableModels[key.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mx-4 mb-4 mt-[-4px] bg-slate-50 border border-slate-200 text-slate-700 p-4.5 rounded-xl text-[10px] font-mono shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="opacity-70 font-bold text-slate-750">可用模型组 ({availableModels[key.id].length}):</span>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => fetchModelsForKey(key.id)}
                              disabled={fetchingModels === key.id}
                              className="underline hover:no-underline flex items-center gap-1 font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                            >
                              {fetchingModels === key.id ? <RefreshCw size={10} className="animate-spin" /> : null}
                              更新列表
                            </button>
                            <button 
                              onClick={(e) => {
                                const models = availableModels[key.id].join(', ');
                                navigator.clipboard.writeText(models);
                                const target = e.currentTarget as HTMLButtonElement;
                                const original = target.innerText;
                                target.innerText = '已复制 ✓';
                                setTimeout(() => {
                                  target.innerText = original;
                                }, 1500);
                              }}
                              className="underline hover:no-underline font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                            >
                              复制全部
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 font-mono">
                          {availableModels[key.id].map(modelId => {
                            const detail = key.modelDetails?.[modelId];
                            const ctxLen = detail?.contextLength;
                            const ctx = ctxLen ? (ctxLen >= 1024 * 1024 ? `${(ctxLen / (1024 * 1024)).toFixed(0)}M` : ctxLen >= 1024 ? `${(ctxLen / 1024).toFixed(0)}K` : ctxLen.toString()) : null;
                            const modelType = detectModelType(modelId);
                            return (
                              <span key={modelId} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded select-all flex items-center gap-1.5 text-[11px] hover:border-slate-350">
                                <span className="truncate text-slate-800 font-medium">{modelId}</span>
                                {ctx && <span className="opacity-60 text-[8px] bg-slate-100 text-slate-700 px-1 rounded font-bold">{ctx}</span>}
                                <span className={`text-[8px] leading-none px-1 py-0.5 rounded border ${modelType.bgClass}`}>
                                  {modelType.label.split(" | ")[0]}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                    </React.Fragment>
                  ))}
                </motion.div>
              ) : viewMode === 'models' ? (
                <motion.div key="models" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* Model Search, Filter & Batch Availability Header */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans text-sm font-extrabold text-slate-800">端点聚合模型中心 (Aggregated Model Hub)</h3>
                        {(() => {
                          const results = Object.values(modelAvailabilityResults) as { success: boolean }[];
                          const successCount = results.filter(r => r.success).length;
                          const failCount = results.filter(r => !r.success).length;
                          if (results.length === 0) {
                            return (
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold text-[10px] font-mono">
                                已就绪 · 按需检测
                              </span>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1.5 ml-2 font-mono text-[10px]">
                              {successCount > 0 && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                                  ✓ {successCount} 个可用
                                </span>
                              )}
                              {failCount > 0 && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold">
                                  ✗ {failCount} 个异常
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono">
                        智能汇总当前所有路由节点授权的大模型源（共 {groupedModels.length} 个独立可用模型，仅在报错或按需时发起检测）
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
                      {/* Check Errored Models Only Button */}
                      {erroredModelsCount > 0 && (
                        <button
                          onClick={handleCheckErroredModelsOnly}
                          disabled={batchCheckingModels}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                          title="仅针对当前出现调用异常或检测失败的模型发起复检"
                        >
                          <RefreshCw size={13} className={batchCheckingModels ? "animate-spin" : ""} />
                          <span>仅复检报错模型 ({erroredModelsCount})</span>
                        </button>
                      )}

                      {/* Manual Full Batch Check Button */}
                      <button
                        onClick={handleBatchCheckAllModels}
                        disabled={batchCheckingModels}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                        title="按需对全部模型进行全量检测"
                      >
                        {batchCheckingModels ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>
                              检测中 {batchCheckProgress ? `(${batchCheckProgress.current}/${batchCheckProgress.total})` : '...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={14} className="text-slate-600" />
                            <span>按需全量检测</span>
                          </>
                        )}
                      </button>

                      <div className="w-full sm:w-64 relative font-sans">
                        <input
                          type="search"
                          placeholder="快速过滤模型 (如 qwen, deepseek)..."
                          value={modelsSearch}
                          onChange={(e) => setModelsSearch(e.target.value)}
                          className="w-full border border-slate-250 focus:border-slate-450 p-2.5 pl-3.5 text-xs font-mono focus:ring-0 focus:outline-none bg-slate-50 rounded-xl font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Model Grouping View - High Performance Memoized Rendering */}
                  {filteredGroupedModels.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 font-sans text-xs">
                      未检索到匹配的大模型。您可以调整过滤条件或在端点管理中更新模型列表。
                    </div>
                  ) : (
                    filteredGroupedModels.map(({ modelId, keys: keysForModel, ctx, modelType }) => {
                      const testResult = modelAvailabilityResults[modelId];
                      const isTestingThisModel = testingModel === modelId;

                      return (
                        <div key={modelId} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden font-sans">
                          <div className="bg-slate-50 border-b border-slate-150 text-slate-700 p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] uppercase font-mono tracking-wider">
                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                              <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-lg flex items-center gap-2 font-bold font-mono">
                                模型: {modelId}
                                {ctx && <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[8px]">{ctx} CTX</span>}
                              </span>
                              <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-indigo-700 text-[8px] tracking-normal font-sans font-bold">
                                {modelType.label}
                              </span>
                              <span className="text-slate-550 text-[9px] font-bold">{keysForModel.length} 个端点支持此模型路由</span>
                            </div>

                            <div className="flex items-center gap-2 font-sans normal-case">
                              {testResult ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
                                  testResult.success
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>
                                  {testResult.success ? (
                                    <>
                                      <CheckCircle2 size={11} />
                                      <span>可用 · {testResult.latency}ms ({testResult.keyName || "200 OK"})</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle size={11} />
                                      <span>不可用 (HTTP {testResult.status || 500})</span>
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono border bg-slate-100/90 text-slate-600 border-slate-200 flex items-center gap-1 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                  已就绪
                                </span>
                              )}

                              <button
                                onClick={() => checkModelAvailability(modelId)}
                                disabled={isTestingThisModel || batchCheckingModels}
                                className="px-2.5 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                title="手动检测此模型可用性"
                              >
                                {isTestingThisModel ? <RefreshCw size={10} className="animate-spin" /> : <ShieldCheck size={11} />}
                                <span>{isTestingThisModel ? "检测中..." : "单模型检测"}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setPlaygroundModel(modelId);
                                  setViewMode('playground');
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>在线调试</span>
                              </button>
                            </div>
                          </div>
                          
                          {/* Availability Error & Model Removal Prompt with Code-Specific Advice */}
                          {testResult && !testResult.success && (() => {
                            const advice = getErrorResolutionAdvice(testResult.status, testResult.error);
                            return (
                              <div className="bg-rose-50/90 border-b border-rose-200 p-4 text-xs font-sans text-rose-800 flex flex-col gap-3">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                    <div className="min-w-0 space-y-1">
                                      <div className="font-bold flex items-center gap-2 flex-wrap text-rose-900">
                                        <span>可用性检测报错</span>
                                        <span className="text-[10px] font-mono bg-rose-200/90 px-2 py-0.5 rounded text-rose-900 font-bold border border-rose-300">
                                          HTTP {testResult.status || 500}
                                        </span>
                                        {testResult.keyName && (
                                          <span className="text-[10px] bg-white border border-rose-200 px-2 py-0.5 rounded text-rose-700 font-bold font-mono">
                                            失败节点: {testResult.keyName}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-rose-700 font-mono truncate max-w-[680px]">
                                        {testResult.error || "未能成功响应测试请求"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto flex-wrap">
                                    <button
                                      onClick={() => checkModelAvailability(modelId, testResult.keyId)}
                                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                      title="重新发起此模型/节点的可用性检测"
                                    >
                                      <RefreshCw size={12} className={isTestingThisModel ? "animate-spin" : ""} />
                                      <span>重新检测</span>
                                    </button>
                                    {testResult.keyId && (
                                      <button
                                        onClick={() => handleRemoveModel(modelId, testResult.keyId)}
                                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                        title={`从端点「${testResult.keyName || '该端点'}」中移除`}
                                      >
                                        <Trash2 size={12} />
                                        <span>从「{testResult.keyName || '该端点'}」移除</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemoveModel(modelId)}
                                      className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                      <span>从全部端点移除</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Intelligent Action Advice Box */}
                                <div className="bg-white/85 border border-rose-200/80 rounded-xl p-2.5 px-3 flex items-start sm:items-center gap-2.5 shadow-2xs text-[11px]">
                                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 sm:mt-0">
                                    💡
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-extrabold text-slate-800 shrink-0">处理建议 ({advice.tag}):</span>
                                      <span className="text-slate-700">{advice.suggestion}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 self-start sm:self-auto border ${
                                      advice.recommendedAction === 'retry_later' 
                                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                        : advice.recommendedAction === 'remove_model' 
                                        ? 'bg-rose-50 text-rose-800 border-rose-200' 
                                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    }`}>
                                      {advice.actionLabel}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-150 font-sans">
                            {/* Left Column: Endpoints list */}
                            <div className="lg:col-span-7 divide-y divide-slate-100">
                              {keysForModel.map(key => {
                                const perf = getLatencyForProviderModel(key, modelId, globalLogs);
                                const endpointKey = `${modelId}:${key.id}`;
                                const keyResult = keyModelAvailability[endpointKey];
                                const isTestingThisKey = testingKeyModel === endpointKey;

                                return (
                                  <div key={key.id} className="p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors hover:bg-slate-50/70">
                                    <div className="flex items-center gap-3 font-semibold min-w-0">
                                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${key.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-sans text-sm font-bold text-slate-800 truncate">{key.name}</span>
                                          <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded font-mono text-slate-500">
                                            {perf.latency}ms 基准
                                          </span>
                                          {keyResult && (
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                                              keyResult.success 
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                : "bg-rose-50 text-rose-700 border-rose-200"
                                            }`}>
                                              {keyResult.success ? `✓ 可用 (${keyResult.latency}ms)` : `✗ HTTP ${keyResult.status}`}
                                            </span>
                                          )}
                                        </div>
                                        <span className="opacity-55 font-mono text-[9px] block truncate max-w-[260px] text-slate-500 mt-0.5">{key.endpoint || '系统置顶节点'}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 font-mono text-[10px] justify-between sm:justify-end">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => checkModelAvailability(modelId, key.id)}
                                          disabled={isTestingThisKey}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                          title="单独检测此端点可用性"
                                        >
                                          {isTestingThisKey ? <RefreshCw size={9} className="animate-spin" /> : <Play size={9} />}
                                          <span>检测此端点</span>
                                        </button>
                                        <button
                                          onClick={() => handleRemoveModel(modelId, key.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                          title={`从端点「${key.name}」中移除该模型`}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>

                                      {key.quotaLimit ? (
                                        <div className="text-right">
                                          <span className="opacity-55 mr-1 font-bold">剩余配额:</span>
                                          <span className="font-bold text-emerald-600">{Math.max(0, key.quotaLimit - (key.quotaUsed || 0))} / {key.quotaLimit}</span>
                                        </div>
                                      ) : <span className="opacity-55 uppercase tracking-wider text-[9px] font-bold text-emerald-600 font-sans">不限配额</span>}
                                      
                                      <div className="text-right min-w-[50px] font-bold text-slate-700">
                                        <span className="opacity-55 mr-1">RPM:</span>
                                        <span className="font-bold">{key.rpmLimit || '∞'}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Right Column: High-Performance CSS Latency Indicator (Zero DOM bloat) */}
                            <div className="lg:col-span-5 p-5 bg-slate-50/40 flex flex-col justify-between min-h-[190px]">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-sans text-xs font-extrabold text-[#094D2B] flex items-center gap-1.5">
                                    <Activity size={12} className="text-emerald-600" />
                                    <span>端点通道与基准延时 (Routing Latency)</span>
                                  </h4>
                                </div>
                                <p className="text-[10px] text-slate-500 font-sans mb-3 leading-relaxed">
                                  该模型在各分流通道上的响应基准。网关调度时优先命中延时更低且健康的就绪节点。
                                </p>
                              </div>

                              <div className="space-y-2.5 bg-white/80 border border-slate-150 p-3 rounded-xl">
                                {keysForModel.map(key => {
                                  const perf = getLatencyForProviderModel(key, modelId, globalLogs);
                                  const latency = perf.latency;
                                  const percent = Math.min(100, Math.max(10, (latency / 1000) * 100));
                                  const isFast = latency < 200;
                                  const isMedium = latency >= 200 && latency < 500;
                                  const barColor = isFast ? 'bg-emerald-500' : isMedium ? 'bg-cyan-500' : latency < 800 ? 'bg-amber-500' : 'bg-rose-500';
                                  const badgeClass = isFast ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isMedium ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-amber-50 text-amber-700 border-amber-200';

                                  return (
                                    <div key={key.id} className="space-y-1">
                                      <div className="flex items-center justify-between text-[10px] font-mono">
                                        <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${key.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                          <span className="font-bold text-slate-700 truncate">{key.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="font-bold text-slate-800">{latency} ms</span>
                                          <span className={`text-[8px] px-1.5 py-0.2 rounded border font-bold ${badgeClass}`}>
                                            {isFast ? '极速' : isMedium ? '良好' : '较慢'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                          className={`h-full ${barColor} rounded-full transition-all duration-300`} 
                                          style={{ width: `${percent}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              ) : viewMode === 'logs' ? (
                <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="bg-[#111A2E]/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <span className="font-sans text-xs uppercase tracking-wider font-extrabold text-white">中转流水实时总日志 (PROXY ENDPOINT LOGS)</span>
                      <span className="font-mono text-[9px] text-[#10B981] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                        存储深度: 最近 100 笔
                      </span>
                    </div>

                    {globalLogs.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500 font-mono italic border border-dashed border-slate-800 mt-5 rounded-xl">
                        没有近期接口代理请求日志。请呼叫 API 或者是用网关沙盒测试进行连接触发！
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 text-xs font-mono custom-scrollbar mt-5">
                        {globalLogs.map((log, idx) => {
                          const isErr = log.status >= 400;
                          return (
                            <div key={log.id || idx} className="p-3 bg-slate-950/40 border border-slate-800/85 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/30 transition-colors">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 text-[8.5px] font-mono font-black uppercase tracking-wider rounded">{log.method}</span>
                                  <span className="font-mono font-bold text-slate-200">{log.model}</span>
                                  <span className="text-[10px] bg-slate-900 text-slate-400 font-mono border border-slate-800/60 px-1.5 py-0.5 rounded-md">{log.keyName}</span>
                                  <span className="text-[10px] text-slate-400 font-mono bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/40">📅 {formatDateTime(log.timestamp)}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-mono break-all">{log.path}</p>
                              </div>
                              <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${isErr ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                                  {log.status}
                                </span>
                                <p className="text-[10px] text-slate-500 font-mono">{log.duration ? `${log.duration}ms` : '120ms'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (<motion.div 
                  key="playground" 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }} 
                  className="space-y-6"
                >
                  {allModels.length === 0 ? (
                    <div className="border border-dashed border-[#1E2E24] p-12 text-center space-y-4 rounded-lg bg-[#EBF5EE]/10">
                      <Sparkles className="w-12 h-12 mx-auto text-[#094D2B] opacity-40 animate-pulse" />
                      <p className="font-serif italic text-xl text-[#094D2B] font-bold">无可用的活端点模型以启动沙盒。</p>
                      <p className="text-xs opacity-75 max-w-md mx-auto text-gray-600">请确保您已经成功添加了至少一个符合格式要求的 API 密钥，并在对应节点里成功拉取并绑定了可用模型列表。</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Side: Parameters Form */}
                      <form onSubmit={handlePlaygroundSubmit} className="lg:col-span-12 xl:col-span-5 space-y-6 bg-white border-2 border-[#1E2E24] p-6 shadow-[4px_4px_0px_0px_#1E2E24]">
                        <div className="border-b border-[#1E2E24]/20 pb-4 flex items-center justify-between">
                          <span className="font-mono text-xs uppercase tracking-widest font-bold text-[#094D2B]">端点高可用沙盒测试 (SANDBOX PARAMS)</span>
                          <span className="font-mono text-[9px] bg-[#094D2B] text-white px-2.5 py-1 rounded uppercase font-bold">
                            {detectModelType(playgroundModel).label.split(" | ")[0]} Mode
                          </span>
                        </div>
 
                        {/* Model Selector */}
                        <div className="space-y-1">
                          <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black block">选择测试模型</label>
                          <select 
                            value={playgroundModel}
                            onChange={(e) => {
                              setPlaygroundModel(e.target.value);
                              setPlaygroundPrompt('');
                              setPlaygroundResponse('');
                              setPlaygroundImageUrl('');
                              setPlaygroundImageBase64('');
                              setPlaygroundLogs(null);
                              setPlaygroundVisionImage(null);
                              setPlaygroundVisionFilename(null);
                            }}
                            className="w-full border-2 border-[#1E2E24] p-3 font-mono text-xs bg-white focus:outline-none focus:bg-[#EBF5EE]/10"
                          >
                            {allModels.map(model => {
                              const modelType = detectModelType(model);
                              return (
                                <option key={model} value={model}>
                                  [{modelType.label.split(" | ")[0]}] {model}
                                </option>
                              );
                            })}
                          </select>
                        </div>
 
                        {/* Parameter Controls based on Model Type */}
                        {!detectModelType(playgroundModel).label.includes("生图") && !detectModelType(playgroundModel).label.includes("Image") ? (
                          <>
                            {/* Text Model Controls */}
                            <div className="space-y-1">
                              <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black block">系统 Prompt (System instructions)</label>
                              <textarea 
                                rows={2}
                                value={playgroundSystemPrompt}
                                onChange={(e) => setPlaygroundSystemPrompt(e.target.value)}
                                className="w-full border-2 border-[#1E2E24] p-2.5 font-mono text-xs focus:outline-none focus:bg-[#EBF5EE]/10 rounded-sm"
                              />
                            </div>

                            {/* Vision Model Image Upload Area */}
                            {(detectModelType(playgroundModel).label.includes("视觉") || detectModelType(playgroundModel).label.includes("Vision")) && (
                              <div className="space-y-1 bg-emerald-50/40 p-4 border border-dashed border-[#1E2E24]/30 rounded">
                                <label className="font-mono text-[10px] uppercase text-[#094D2B] font-bold block flex items-center gap-1.5 animate-pulse">
                                  <ImageIcon size={12} /> 视觉输入 (Vision/Multimodal Input)
                                </label>
                                
                                {!playgroundVisionImage ? (
                                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#1E2E24]/30 hover:border-[#1E2E24] bg-white p-4 rounded cursor-pointer transition-colors group">
                                    <Upload size={18} className="text-[#094D2B]/50 group-hover:text-[#094D2B] mb-1.5 animate-bounce" />
                                    <span className="font-sans text-xs font-semibold text-[#094D2B] mb-0.5">点击或拖拽上传图片</span>
                                    <span className="text-[10px] text-gray-400 scale-95 origin-center font-mono">PNG, JPG, WEBP (最大 4MB)</span>
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={handleVisionImageUpload} 
                                      className="hidden" 
                                    />
                                  </label>
                                ) : (
                                  <div className="flex items-center gap-3 bg-white p-2 border border-[#1E2E24]/30 rounded">
                                    <img 
                                      src={playgroundVisionImage} 
                                      alt="Vision Input Preview" 
                                      className="w-12 h-12 object-cover rounded border border-[#1E2E24]/10"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-medium text-gray-700 truncate">{playgroundVisionFilename}</p>
                                      <p className="text-[9px] text-gray-400 font-mono">已成功加载 Base64 资源</p>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setPlaygroundVisionImage(null);
                                        setPlaygroundVisionFilename(null);
                                      }}
                                      className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"
                                      title="移除图片"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black block">随机度 (Temp): {playgroundTemperature}</label>
                                <input 
                                  type="range"
                                  min="0"
                                  max="2"
                                  step="0.1"
                                  value={playgroundTemperature}
                                  onChange={(e) => setPlaygroundTemperature(parseFloat(e.target.value))}
                                  className="w-full h-1.5 bg-[#EFF2EF] rounded-lg appearance-none cursor-pointer accent-[#094D2B]"
                                />
                              </div>
                              <div className="space-y-1 flex items-center justify-end border-t border-transparent pt-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    checked={playgroundStream}
                                    onChange={(e) => setPlaygroundStream(e.target.checked)}
                                    className="accent-[#094D2B] w-4 h-4"
                                  />
                                  <span className="font-mono text-[10px] uppercase text-[#0a331c] font-black">流式输出 Stream</span>
                                </label>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Image Model Controls */}
                            <div className="space-y-1">
                              <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black block">图像尺寸 (Dimensions)</label>
                              <select 
                                value={playgroundImageSize}
                                onChange={(e) => setPlaygroundImageSize(e.target.value)}
                                className="w-full border-2 border-[#1E2E24] p-3 font-mono text-xs bg-white focus:outline-none focus:bg-[#EBF5EE]/15"
                              >
                                <option value="1024x1024">1024 x 1024 (1:1 正方形)</option>
                                <option value="512x512">512 x 512 (小正方形)</option>
                                <option value="1216x832">1216 x 832 (高清 3:2 横屏)</option>
                                <option value="832x1216">832 x 1216 (高清 2:3 竖屏)</option>
                              </select>
                            </div>
                          </>
                        )}

                        {/* Common Prompt Field */}
                        <div className="space-y-1">
                          <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black block">
                            {detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? "生图提示词 (Prompt)" : "对话 Prompt"}
                          </label>
                          <textarea 
                            required
                            rows={4}
                            placeholder={detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? "一个精致的水彩画，画中是一个古朴的东方茶室，窗外桃花盛开，柔和的光线射入..." : "写一段关于人工智能高可用负载均衡器的诗吧..."}
                            value={playgroundPrompt}
                            onChange={(e) => setPlaygroundPrompt(e.target.value)}
                            className="w-full border-2 border-[#1E2E24] p-3 text-xs focus:outline-none focus:bg-[#EBF5EE]/10 font-sans"
                          />
                        </div>

                        {/* Submit Button */}
                        <button 
                          type="submit"
                          disabled={playgroundLoading}
                          className="w-full bg-[#094D2B] text-white p-4 font-mono text-xs uppercase tracking-widest hover:bg-[#073A21] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#1E2E24] font-bold"
                        >
                          {playgroundLoading ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>模型在线计算中 / AWAITING RESPONSE...</span>
                            </>
                          ) : (
                            <>
                              {detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? <Play size={14} /> : <Send size={14} />}
                              <span>
                                {detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? "生成创意图像" : "发送实时测试指令"}
                              </span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Right Side: Visual Output & Timing Trace Window */}
                      <div className="lg:col-span-12 xl:col-span-7 flex flex-col bg-white border-2 border-[#1E2E24] p-5 shadow-[4px_4px_0px_0px_#1E2E24] min-h-[460px]">
                        {/* Top Header & Tab Controls */}
                        <div className="border-b border-[#1E2E24]/20 pb-3 flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 bg-[#EFF2EF] p-1 rounded border border-[#1E2E24]/20">
                            <button
                              type="button"
                              onClick={() => setPlaygroundActiveTab('response')}
                              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-colors flex items-center gap-1.5 ${
                                playgroundActiveTab === 'response'
                                  ? 'bg-[#094D2B] text-white shadow-xs'
                                  : 'text-gray-600 hover:text-[#094D2B]'
                              }`}
                            >
                              <MessageSquare size={12} />
                              <span>回复内容 (Response)</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setPlaygroundActiveTab('timings')}
                              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-colors flex items-center gap-1.5 relative ${
                                playgroundActiveTab === 'timings'
                                  ? 'bg-[#094D2B] text-white shadow-xs'
                                  : 'text-gray-600 hover:text-[#094D2B]'
                              }`}
                            >
                              <Clock size={12} />
                              <span>每步耗时透视 (Lifecycle & Timings)</span>
                              {playgroundTrace && (
                                <span className="bg-amber-400 text-[#1E2E24] text-[9px] px-1 py-0.2 rounded font-mono font-bold">
                                  {playgroundTrace.totalDuration}ms
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setPlaygroundActiveTab('payload')}
                              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-colors flex items-center gap-1.5 ${
                                playgroundActiveTab === 'payload'
                                  ? 'bg-[#094D2B] text-white shadow-xs'
                                  : 'text-gray-600 hover:text-[#094D2B]'
                              }`}
                            >
                              <FileCode size={12} />
                              <span>报文与元数据 (Payload)</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {playgroundResponse && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(playgroundResponse);
                                  alert("已复制回复内容至剪贴板");
                                }}
                                className="text-[10px] font-mono text-gray-600 hover:text-[#094D2B] px-2 py-1 bg-white border border-[#1E2E24]/30 rounded hover:bg-[#EBF5EE] flex items-center gap-1 font-bold"
                              >
                                <Copy size={11} /> 复制
                              </button>
                            )}
                            {(playgroundResponse || playgroundTrace || playgroundImageBase64 || playgroundImageUrl) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPlaygroundResponse('');
                                  setPlaygroundImageUrl('');
                                  setPlaygroundImageBase64('');
                                  setPlaygroundTrace(null);
                                  setPlaygroundLogs(null);
                                  setPlaygroundCurrentSteps([]);
                                }}
                                className="text-[10px] font-mono text-gray-500 hover:text-red-700 px-2 py-1 bg-white border border-[#1E2E24]/30 rounded hover:bg-red-50 flex items-center gap-1"
                              >
                                <Trash2 size={11} /> 清空
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Top Timing & Phase Metrics Bar (Always Visible when trace / logs available) */}
                        {(playgroundTrace || playgroundLoading || playgroundCurrentSteps.length > 0) && (
                          <div className="mb-3 bg-[#EBF5EE] border border-[#094D2B]/30 rounded-md p-2.5 font-mono text-[11px]">
                            {/* Summary Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                              <div className="bg-white/80 border border-[#094D2B]/20 rounded p-1.5 flex flex-col">
                                <span className="text-[9px] text-gray-500 font-sans">⏱️ 全链路总耗时</span>
                                <span className="font-bold text-[#094D2B] text-xs">
                                  {playgroundTrace ? `${playgroundTrace.totalDuration} ms` : playgroundLoading ? '计算中...' : '-'}
                                </span>
                              </div>

                              <div className="bg-white/80 border border-[#094D2B]/20 rounded p-1.5 flex flex-col">
                                <span className="text-[9px] text-gray-500 font-sans">⚡ 首字延迟 (TTFB)</span>
                                <span className="font-bold text-blue-700 text-xs">
                                  {playgroundTrace ? `${playgroundTrace.ttfb} ms` : playgroundLoading ? '握手中...' : '-'}
                                </span>
                              </div>

                              <div className="bg-white/80 border border-[#094D2B]/20 rounded p-1.5 flex flex-col">
                                <span className="text-[9px] text-gray-500 font-sans">🌊 数据流传输</span>
                                <span className="font-bold text-purple-700 text-xs">
                                  {playgroundTrace ? `${playgroundTrace.transferDuration} ms` : playgroundLoading ? '传输中...' : '-'}
                                </span>
                              </div>

                              <div className="bg-white/80 border border-[#094D2B]/20 rounded p-1.5 flex flex-col">
                                <span className="text-[9px] text-gray-500 font-sans">🚀 输出吞吐速率</span>
                                <span className="font-bold text-emerald-800 text-xs">
                                  {playgroundTrace?.tokensPerSec ? `${playgroundTrace.tokensPerSec} t/s` : playgroundTrace?.tokens ? `${playgroundTrace.tokens} tok` : '-'}
                                </span>
                              </div>

                              <div className="col-span-2 sm:col-span-1 bg-white/80 border border-[#094D2B]/20 rounded p-1.5 flex flex-col overflow-hidden">
                                <span className="text-[9px] text-gray-500 font-sans">🛡️ 命中间接节点</span>
                                <span className="font-bold text-gray-800 text-xs truncate" title={playgroundTrace?.router || ''}>
                                  {playgroundTrace?.router || (playgroundLoading ? '路由探测中' : '-')}
                                </span>
                              </div>
                            </div>

                            {/* Visual Waterfall Progression Bar */}
                            {playgroundTrace && playgroundTrace.totalDuration > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[9px] text-gray-600 font-mono">
                                  <span>阶段耗时分布瀑布流 (Timeline Waterfall)</span>
                                  <span className="text-gray-500">100% = {playgroundTrace.totalDuration}ms</span>
                                </div>
                                <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden flex border border-[#1E2E24]/20 shadow-inner">
                                  {/* Step 1: Prep */}
                                  <div 
                                    style={{ width: `${Math.max(3, (playgroundTrace.prepDuration / playgroundTrace.totalDuration) * 100)}%` }} 
                                    className="bg-amber-400 h-full" 
                                    title={`参数装配: ${playgroundTrace.prepDuration}ms`} 
                                  />
                                  {/* Step 2: Route */}
                                  <div 
                                    style={{ width: `${Math.max(3, (playgroundTrace.routeDuration / playgroundTrace.totalDuration) * 100)}%` }} 
                                    className="bg-indigo-400 h-full" 
                                    title={`网关寻址: ${playgroundTrace.routeDuration}ms`} 
                                  />
                                  {/* Step 3: TTFB */}
                                  <div 
                                    style={{ width: `${Math.max(6, (playgroundTrace.ttfb / playgroundTrace.totalDuration) * 100)}%` }} 
                                    className="bg-blue-500 h-full" 
                                    title={`首字响应 TTFB: ${playgroundTrace.ttfb}ms`} 
                                  />
                                  {/* Step 4: Transfer */}
                                  <div 
                                    style={{ width: `${Math.max(6, (playgroundTrace.transferDuration / playgroundTrace.totalDuration) * 100)}%` }} 
                                    className="bg-emerald-500 h-full" 
                                    title={`流式传输: ${playgroundTrace.transferDuration}ms`} 
                                  />
                                  {/* Step 5: Cleanup */}
                                  <div 
                                    style={{ width: `${Math.max(2, (playgroundTrace.cleanupDuration / playgroundTrace.totalDuration) * 100)}%` }} 
                                    className="bg-gray-400 h-full" 
                                    title={`指标聚合: ${playgroundTrace.cleanupDuration}ms`} 
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-[9px] text-gray-600 pt-0.5">
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> 装配 {playgroundTrace.prepDuration}ms</span>
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> 寻址 {playgroundTrace.routeDuration}ms</span>
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 首字 (TTFB) {playgroundTrace.ttfb}ms</span>
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 传输 {playgroundTrace.transferDuration}ms</span>
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span> 归档 {playgroundTrace.cleanupDuration}ms</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Render Workspace Content depending on Active Tab */}
                        <div className="flex-1 flex flex-col min-h-[340px] bg-[#EFF2EF] border-2 border-[#1E2E24]/30 p-4 relative overflow-hidden font-mono text-xs rounded">
                          
                          {/* TAB 1: RESPONSE VIEW */}
                          {playgroundActiveTab === 'response' && (
                            <div className="flex-1 flex flex-col space-y-3">
                              {playgroundLoading && !playgroundResponse && !playgroundImageBase64 && !playgroundImageUrl && (
                                <div className="absolute inset-0 bg-[#EFF2EF]/90 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 z-10 text-center p-6 bg-opacity-70">
                                  <RefreshCw size={32} className="text-[#094D2B] animate-spin" />
                                  <div className="space-y-1">
                                    <p className="font-mono uppercase font-bold text-xs tracking-wider text-[#094D2B]">API_ROUTING_IN_PROGRESS</p>
                                    <p className="text-[10px] text-gray-600">正在通过健康分析调用高可用端点进行在线路由分流计算与流式传输...</p>
                                  </div>
                                  {/* Live Step Indicator in Loading Spinner */}
                                  {playgroundCurrentSteps.length > 0 && (
                                    <div className="w-full max-w-sm bg-white border border-[#1E2E24]/30 rounded p-2.5 text-left space-y-1.5 shadow-sm">
                                      {playgroundCurrentSteps.map((step) => (
                                        <div key={step.id} className="flex items-center justify-between text-[10px]">
                                          <span className="flex items-center gap-1.5 font-bold">
                                            {step.status === 'completed' && <CheckCircle2 size={11} className="text-emerald-600" />}
                                            {step.status === 'running' && <RefreshCw size={11} className="text-amber-500 animate-spin" />}
                                            {step.status === 'pending' && <span className="w-2.5 h-2.5 rounded-full border border-gray-400 inline-block"></span>}
                                            {step.status === 'error' && <AlertCircle size={11} className="text-red-500" />}
                                            <span className={step.status === 'running' ? 'text-amber-800' : step.status === 'completed' ? 'text-gray-800' : 'text-gray-400'}>
                                              {step.name}
                                            </span>
                                          </span>
                                          <span className="font-mono text-gray-500">
                                            {step.durationMs > 0 ? `${step.durationMs}ms` : step.status === 'running' ? '进行中...' : '等待中'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {!playgroundLoading && !playgroundResponse && !playgroundImageBase64 && !playgroundImageUrl ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                                  <Sparkles size={28} className="mb-2 text-[#094D2B] animate-pulse" />
                                  <p className="font-serif italic text-sm mb-1 text-[#094D2B] font-bold">等待接收高可用路由分析执行答案</p>
                                  <p className="text-[10px] text-gray-500 max-w-sm">在左侧对话栏发送指令，负载均衡器会自动分析并路由至延迟最低的活节点上，并在上方实时输出阶段耗时细分。</p>
                                </div>
                              ) : detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? (
                                /* Image Output Frame */
                                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                  {(playgroundImageBase64 || playgroundImageUrl) ? (
                                    <div className="space-y-4 w-full max-w-md flex flex-col items-center">
                                      <div className="relative group overflow-hidden border-2 border-[#1E2E24] shadow-[4px_4px_0px_0px_#1E2E24] bg-white">
                                        <img 
                                          src={playgroundImageBase64 ? `data:image/png;base64,${playgroundImageBase64}` : playgroundImageUrl} 
                                          alt="Generated creative"
                                          className="max-h-[350px] w-auto max-w-full object-contain pointer-events-auto select-all"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <a 
                                          href={playgroundImageBase64 ? `data:image/png;base64,${playgroundImageBase64}` : playgroundImageUrl}
                                          download={`ai-balancer-image-${Date.now()}.png`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] font-mono px-3.5 py-1.5 bg-white border-2 border-[#1E2E24] shadow-[2px_2px_0px_0px_#1E2E24] hover:bg-[#094D2B] hover:text-white transition-colors flex items-center gap-1 leading-none uppercase font-bold"
                                        >
                                          <Download size={12} /> 下载并保存生图
                                        </a>
                                      </div>
                                    </div>
                                  ) : (
                                    playgroundLoading && (
                                      <div className="flex-1 flex flex-col items-center justify-center bg-transparent py-12">
                                        <div className="w-16 h-16 border-2 border-dashed border-[#1E2E24] rounded-full animate-spin flex items-center justify-center">
                                          <ImageIcon size={24} className="text-[#094D2B] opacity-50" />
                                        </div>
                                        <p className="text-[10px] font-mono uppercase tracking-widest mt-4 text-[#094D2B]">渲染图纸生成中...</p>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                /* Chat / Text Output Frame */
                                <div className="flex-1 flex flex-col space-y-2">
                                  <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-[380px] bg-white p-4 border-2 border-[#1E2E24]/20 select-text select-all rounded-md shadow-inner text-gray-800">
                                    {playgroundResponse || (playgroundLoading && <span className="animate-pulse">_</span>)}
                                  </div>

                                  {/* Step-by-Step Duration Quick Bar at the bottom of response */}
                                  {(playgroundTrace || playgroundCurrentSteps.length > 0) && (
                                    <div className="bg-white border border-[#1E2E24]/20 rounded p-2.5 shadow-xs">
                                      <div className="flex items-center justify-between pb-1.5 border-b border-gray-150 mb-2">
                                        <span className="font-bold text-[10px] text-[#094D2B] flex items-center gap-1">
                                          <Activity size={12} /> 链路阶段耗时速览 (Execution Step Timings)
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setPlaygroundActiveTab('timings')}
                                          className="text-[10px] text-blue-700 hover:underline font-bold"
                                        >
                                          查看完整阶段耗时详情 →
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[10px] font-mono">
                                        {(playgroundTrace?.steps || playgroundCurrentSteps).map((step, idx) => (
                                          <div 
                                            key={step.id || idx}
                                            className={`p-1.5 rounded border ${
                                              step.status === 'completed'
                                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                                : step.status === 'running'
                                                ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
                                                : step.status === 'error'
                                                ? 'bg-red-50 border-red-200 text-red-900'
                                                : 'bg-gray-50 border-gray-200 text-gray-500'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between font-bold text-[9px] mb-0.5">
                                              <span>Step {idx + 1}</span>
                                              <span>{step.durationMs > 0 ? `${step.durationMs}ms` : step.status === 'running' ? '计算中' : '0ms'}</span>
                                            </div>
                                            <p className="text-[9px] font-sans truncate" title={step.name}>{step.name}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB 2: DETAILED STEP TIMINGS VIEW */}
                          {playgroundActiveTab === 'timings' && (
                            <div className="flex-1 flex flex-col space-y-4 overflow-y-auto max-h-[500px] pr-1">
                              <div className="bg-white border-2 border-[#1E2E24]/30 rounded-md p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between border-b border-[#1E2E24]/20 pb-2">
                                  <h4 className="font-serif italic font-bold text-sm text-[#094D2B] flex items-center gap-1.5">
                                    <Clock size={16} /> 沙盒全链路各阶段耗时分解与性能追踪
                                  </h4>
                                  <span className="font-mono text-[10px] bg-[#EBF5EE] text-[#094D2B] font-bold px-2 py-0.5 rounded border border-[#094D2B]/30">
                                    状态: {playgroundLoading ? '执行中 (Active)' : playgroundTrace ? '已完成 (Completed)' : '空闲 (Idle)'}
                                  </span>
                                </div>

                                <p className="text-xs text-gray-600 leading-relaxed font-sans">
                                  通过网关内核探针，实时测量从客户端组包、智能寻址路由、上游握手（TTFB）到流式数据帧解码各环节的真实消耗时间。
                                </p>

                                {/* Step-by-Step Detailed Cards */}
                                <div className="space-y-2.5 pt-2">
                                  {(playgroundTrace?.steps || playgroundCurrentSteps).length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 font-sans text-xs">
                                      尚无沙盒测试记录。请在左侧点击“发送实时测试指令”或“生图”触发一次执行。
                                    </div>
                                  ) : (
                                    (playgroundTrace?.steps || playgroundCurrentSteps).map((step, idx) => {
                                      const total = playgroundTrace?.totalDuration || 1;
                                      const percent = step.durationMs > 0 ? Math.round((step.durationMs / total) * 100) : 0;
                                      return (
                                        <div 
                                          key={step.id || idx}
                                          className={`border-2 rounded-lg p-3 transition-all ${
                                            step.status === 'completed'
                                              ? 'bg-[#F9FCFA] border-[#094D2B]/30'
                                              : step.status === 'running'
                                              ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                                              : step.status === 'error'
                                              ? 'bg-red-50/80 border-red-400'
                                              : 'bg-gray-50/60 border-gray-200 opacity-60'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                                                step.status === 'completed' 
                                                  ? 'bg-[#094D2B] text-white' 
                                                  : step.status === 'running'
                                                  ? 'bg-amber-500 text-white animate-pulse'
                                                  : step.status === 'error'
                                                  ? 'bg-red-600 text-white'
                                                  : 'bg-gray-300 text-gray-700'
                                              }`}>
                                                {idx + 1}
                                              </span>
                                              <div>
                                                <h5 className="font-bold text-xs text-gray-900">{step.name}</h5>
                                                <p className="text-[10px] text-gray-500 font-sans">{step.desc}</p>
                                              </div>
                                            </div>

                                            <div className="text-right font-mono">
                                              <div className="font-bold text-sm text-[#094D2B]">
                                                {step.durationMs > 0 ? `${step.durationMs} ms` : step.status === 'running' ? '测量中...' : '0 ms'}
                                              </div>
                                              {step.durationMs > 0 && total > 0 && (
                                                <span className="text-[10px] text-gray-500">占比: {percent}%</span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Duration bar */}
                                          {step.durationMs > 0 && total > 0 && (
                                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden my-1.5">
                                              <div 
                                                className={`h-full ${
                                                  idx === 0 ? 'bg-amber-400' :
                                                  idx === 1 ? 'bg-indigo-400' :
                                                  idx === 2 ? 'bg-blue-500' :
                                                  idx === 3 ? 'bg-emerald-500' : 'bg-gray-500'
                                                }`}
                                                style={{ width: `${Math.min(100, Math.max(4, percent))}%` }}
                                              />
                                            </div>
                                          )}

                                          {/* Telemetry Detail Line */}
                                          {step.details && (
                                            <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 font-mono text-[10px] text-gray-600 bg-white/70 px-2 py-1 rounded border border-gray-150">
                                              <span className="text-[#094D2B] font-bold">↳ 遥测数据:</span> {step.details}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* TAB 3: PAYLOAD & METADATA VIEW */}
                          {playgroundActiveTab === 'payload' && (
                            <div className="flex-1 flex flex-col space-y-3 overflow-y-auto max-h-[500px]">
                              <div className="bg-white border-2 border-[#1E2E24]/30 rounded-md p-4 space-y-3">
                                <h4 className="font-serif italic font-bold text-xs text-[#094D2B] flex items-center gap-1.5 border-b pb-1.5">
                                  <FileCode size={14} /> 请求报文结构与元数据 (Request Payload)
                                </h4>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-gray-500 font-bold block">HTTP 请求体 (JSON):</span>
                                  <pre className="bg-[#1E2E24] text-emerald-300 p-3 rounded text-[11px] font-mono overflow-x-auto max-h-[180px] select-all">
                                    {playgroundTrace?.requestPayload 
                                      ? JSON.stringify(playgroundTrace.requestPayload, null, 2)
                                      : playgroundPrompt
                                      ? JSON.stringify({
                                          model: playgroundModel,
                                          messages: [
                                            { role: 'system', content: playgroundSystemPrompt },
                                            { role: 'user', content: playgroundPrompt }
                                          ],
                                          temperature: playgroundTemperature,
                                          stream: playgroundStream
                                        }, null, 2)
                                      : '// 尚未发起请求'}
                                  </pre>
                                </div>

                                <div className="space-y-1 pt-2 border-t">
                                  <span className="text-[10px] text-gray-500 font-bold block">响应状态与诊断头 (Response Headers):</span>
                                  <div className="bg-[#EFF2EF] p-2.5 rounded border border-[#1E2E24]/20 space-y-1 text-[11px] font-mono">
                                    <div className="flex justify-between border-b pb-1">
                                      <span className="text-gray-600">HTTP Status:</span>
                                      <span className="font-bold text-emerald-700">{playgroundTrace ? `${playgroundTrace.status} OK` : '等待中'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                      <span className="text-gray-600">x-routed-node:</span>
                                      <span className="font-bold text-gray-800">{playgroundTrace?.router || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                      <span className="text-gray-600">x-router-duration-ms:</span>
                                      <span className="font-bold text-gray-800">{playgroundTrace ? `${playgroundTrace.routeDuration}ms` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">content-type:</span>
                                      <span className="font-bold text-gray-800">{playgroundStream ? 'text/event-stream; charset=utf-8' : 'application/json'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {config.keys.length === 0 && !loading && (
              <div className="border-2 border-dashed border-[#1E2E24]/40 bg-[#EBF5EE]/20 rounded-lg p-12 text-center space-y-4">
                <Settings className="w-12 h-12 mx-auto text-[#094D2B] opacity-40 animate-bounce" />
                <p className="font-serif italic text-xl text-[#094D2B] font-bold">未添加任何后端服务节点数据</p>
                <p className="text-xs text-gray-600 max-w-md mx-auto">点击顶部的“添加服务密钥端点”开始载入可用节点，支持 OpenAI、SiliconFlow、DeepSeek、Zhipu, 以及任何 OpenAI-Compatible 本地大模型代理端点。</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Add Form Overlay */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1E2E24]/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-2 border-[#1E2E24] w-full max-w-lg shadow-[8px_8px_0px_0px_#1E2E24] overflow-hidden rounded-md"
            >
              <div className="bg-[#094D2B] text-white p-4 flex justify-between items-center font-mono text-xs uppercase tracking-widest font-bold">
                <span>{editingKeyId ? "修改端点密钥配置 (EDIT ENDPOINT)" : "配置新高可用端点 (ADD ENDPOINT)"}</span>
                <button onClick={() => setShowAddForm(false)} className="hover:opacity-80 transition-opacity font-bold underline">✕ 关闭</button>
              </div>
              <form onSubmit={saveKeyForm} className="p-8 space-y-5 max-h-[85vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black">服务提供商及端点预设 (PROVIDER PRESET)</label>
                    <select
                      className="w-full border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-3 font-sans text-xs focus:ring-0 focus:outline-none bg-white rounded font-bold text-[#094D2B]"
                      value={selectedPresetId}
                      onChange={(e) => {
                        const presetId = e.target.value;
                        setSelectedPresetId(presetId);
                        const preset = PROVIDER_PRESETS.find(p => p.id === presetId);
                        if (preset) {
                          setNewKey(prev => ({
                            ...prev,
                            endpoint: preset.endpoint,
                            provider: preset.provider || 'openai',
                            name: prev.name && 
                                  !prev.name.startsWith("通用") && 
                                  !prev.name.includes("NVIDIA") && 
                                  !prev.name.includes("SiliconFlow") && 
                                  !prev.name.includes("Groq") && 
                                  !prev.name.includes("SambaNova") && 
                                  !prev.name.includes("DeepSeek") && 
                                  !prev.name.includes("Zhipu") && 
                                  !prev.name.includes("Gemini") && 
                                  !prev.name.includes("Claude") && 
                                  !prev.name.includes("Antigravity") && 
                                  !prev.name.includes("OpenRouter")
                                  ? prev.name 
                                  : `${preset.name.split(" ")[0]} 节点`
                          }));
                          setValidationResult(null);
                        }
                      }}
                    >
                      {PROVIDER_PRESETS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-[#094D2B]/70 font-mono italic mt-1">支持无缝、一键选择国内与国际主流大模型 API 服务商接口（极速完成多端点预填配置）</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black">端点友好名称</label>
                    <input 
                      type="text" 
                      required
                      placeholder="例如：主生产分流节点 SiliconFlow-01"
                      className="w-full border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-3 font-sans text-xs focus:ring-0 focus:outline-none focus:bg-[#EBF5EE]/10 rounded"
                      value={newKey.name}
                      onChange={e => setNewKey({...newKey, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black block">端点工作状态 (ENDPOINT STATUS)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewKey({...newKey, enabled: true})}
                        className={`flex-1 p-2.5 font-mono text-xs uppercase border-2 transition-all rounded ${newKey.enabled ? 'bg-[#094D2B] text-white border-[#094D2B] font-bold' : 'hover:bg-gray-50 border-[#1E2E24]/30 text-gray-500'}`}
                      >
                        ✓ 正常启用 (Enabled)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewKey({...newKey, enabled: false})}
                        className={`flex-1 p-2.5 font-mono text-xs uppercase border-2 transition-all rounded ${!newKey.enabled ? 'bg-red-600 text-white border-red-600 font-bold' : 'hover:bg-gray-50 border-[#1E2E24]/30 text-gray-500'}`}
                      >
                        ✗ 暂停维护 (Disabled)
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black">API 授权密钥 (API KEY)</label>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        required
                        placeholder={PROVIDER_PRESETS.find(p => p.id === selectedPresetId)?.placeholder || "请输入授权密钥..."}
                        className="flex-1 border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-3 font-mono text-xs focus:ring-0 focus:outline-none focus:bg-[#EBF5EE]/10 rounded"
                        value={newKey.key}
                        onChange={e => {
                          setNewKey({...newKey, key: e.target.value});
                          setValidationResult(null);
                        }}
                      />
                      <button 
                        type="button"
                        onClick={validateKey}
                        disabled={isValidating}
                        className={`px-4 border-2 transition-all text-xs font-mono font-bold rounded disabled:opacity-50 ${
                          validationResult?.status === 'success' ? 'bg-[#094D2B] text-white border-[#094D2B]' : 
                          validationResult?.status === 'error' ? 'bg-red-600 text-white border-red-600' : 
                          'border-[#1E2E24] hover:bg-[#094D2B] hover:text-white'
                        }`}
                      >
                        {isValidating ? '检测中...' : 
                         validationResult?.status === 'success' ? '连接成功' : 
                         validationResult?.status === 'error' ? '检测失败' : '测试连接'}
                      </button>
                    </div>
                    {validationResult && (
                      <p className={`text-[10px] font-mono mt-1 ${validationResult.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {validationResult.status === 'success' ? '✓ ' : '✗ '}{validationResult.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black">
                      后端网关 API URL (OpenAI-compatible)
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://api.openai.com/v1"
                      className="w-full border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-3 font-mono text-xs focus:ring-0 focus:outline-none focus:bg-[#EBF5EE]/10 rounded font-semibold text-[#094D2B]"
                      value={newKey.endpoint}
                      onChange={e => setNewKey({...newKey, endpoint: e.target.value})}
                    />
                    <p className="text-[9px] text-[#094D2B]/70 font-mono italic mt-1">
                      {newKey.endpoint ? "已输入自定义或预设端点，支持该端下的高性能负载。" : `留空将采用默认端点：${config.settings.defaultEndpoint}`}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black">
                      传输协议转换适配层 (PROTOCOL ADAPTER)
                    </label>
                    <select
                      className="w-full border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-3 font-sans text-xs focus:ring-0 focus:outline-none bg-white rounded font-bold text-[#094D2B]"
                      value={newKey.provider || 'openai'}
                      onChange={e => setNewKey({...newKey, provider: e.target.value})}
                    >
                      <option value="openai">标准 OpenAI 兼容协议 (兼容 99% OpenAI 服务端/NIM/DeepSeek)</option>
                      <option value="gemini">Google Gemini 原生 REST 协议 (网关将自动中转翻译并流式转发)</option>
                      <option value="claude">Anthropic Claude 原生 Messages 协议 (网关将自动中转翻译并流式流回)</option>
                      <option value="antigravity">Antigravity Workspace Native 适配器协议</option>
                    </select>
                    <p className="text-[9px] text-[#094D2B]/70 font-mono italic mt-1">
                      选择特定的协议转换器后，本节点网关会充当中置中继适配层，以把 Google Gemini / Claude / Antigravity 的非标能力输出标准 OpenAI 格式给其他 Agent 或调用端。
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black block mb-2">服务模型分发路由准入规则</label>
                    <div className="border-2 border-[#1E2E24]/20 p-4 bg-[#EFF2EF] space-y-4 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#0a331c] font-bold">选择为此网关放行的白名单模型 (不选默认全部放行):</span>
                        <button 
                          type="button"
                          onClick={fetchFormModels}
                          disabled={formFetchingModels}
                          className="flex items-center gap-1.5 font-mono text-[9px] uppercase border bg-white p-1.5 opacity-80 hover:opacity-100 disabled:opacity-30 border-[#1E2E24]/30"
                        >
                          <RefreshCw size={11} className={formFetchingModels ? "animate-spin" : ""} />
                          读取线上模型树
                        </button>
                      </div>
                      
                      {formAvailableModels.length > 0 && (
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="flex items-center gap-3">
                            <button 
                              type="button" 
                              onClick={() => setNewKey({...newKey, modelFilters: [...formAvailableModels]})}
                              className="underline text-[#094D2B] font-bold hover:no-underline"
                            >
                              全选模型
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setNewKey({...newKey, modelFilters: []})}
                              className="underline text-gray-500 hover:no-underline"
                            >
                              清空白名单
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <input 
                              type="text"
                              placeholder="检索支持的模型(e.g., Qwen, deepseek)..."
                              className="w-full border border-[#1E2E24]/30 bg-white p-1 px-2 text-[10px] focus:outline-none rounded"
                              value={formModelSearch}
                              onChange={e => setFormModelSearch(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {formAvailableModels.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono max-h-36 overflow-y-auto">
                          {formAvailableModels
                            .filter(model => model.toLowerCase().includes(formModelSearch.toLowerCase()))
                            .map(model => (
                            <label key={model} className="flex items-center gap-2 border border-[#1E2E24]/10 p-1.5 cursor-pointer hover:bg-white transition-colors bg-white/70 rounded">
                              <input 
                                type="checkbox"
                                checked={!!(newKey.modelFilters && newKey.modelFilters.includes(model))}
                                onChange={e => {
                                  const currentFilters = newKey.modelFilters || [];
                                  if (e.target.checked) {
                                    setNewKey({...newKey, modelFilters: [...currentFilters, model]});
                                  } else {
                                    setNewKey({...newKey, modelFilters: currentFilters.filter(m => m !== model)});
                                  }
                                }}
                                className="accent-[#094D2B]"
                              />
                              <span className="truncate flex-1 text-gray-700">{model}</span>
                              <span className={`text-[7px] leading-none px-1 py-0.5 rounded border shrink-0 ${detectModelType(model).bgClass}`}>
                                {detectModelType(model).label.split(" | ")[0]}
                              </span>
                              {formModelDetails[model]?.contextLength && (
                                <span className="opacity-40 text-[7px] bg-black/5 px-1 rounded shrink-0">
                                  {(formModelDetails[model].contextLength! >= 1024 * 1024 ? `${(formModelDetails[model].contextLength! / (1024 * 1024)).toFixed(0)}M` : formModelDetails[model].contextLength! >= 1024 ? `${(formModelDetails[model].contextLength! / 1024).toFixed(0)}K` : formModelDetails[model].contextLength!.toString())}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono opacity-50 italic py-2 text-center">
                          尚未获取，请点击右上角按钮安全拉取远端配置。
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black">单节点 QPS 限制</label>
                    <input 
                      type="number" 
                      placeholder="0 (零为不限制)"
                      className="w-full border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-3 font-mono text-xs focus:outline-none rounded focus:bg-[#EBF5EE]/10"
                      value={newKey.qpsLimit}
                      onChange={e => setNewKey({...newKey, qpsLimit: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black">单节点 RPM 限制</label>
                    <input 
                      type="number" 
                      placeholder="0 (零为不限制)"
                      className="w-full border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-3 font-mono text-xs focus:outline-none rounded focus:bg-[#EBF5EE]/10"
                      value={newKey.rpmLimit}
                      onChange={e => setNewKey({...newKey, rpmLimit: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase text-[#0a331c] font-black">此物理节点分配权重比例 / 对应总额度</label>
                    <input 
                      type="number" 
                      placeholder="例如: 100"
                      className="w-full border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-3 font-mono text-xs focus:outline-none rounded focus:bg-[#EBF5EE]/10"
                      value={newKey.quotaLimit}
                      onChange={e => setNewKey({...newKey, quotaLimit: parseInt(e.target.value) || 0})}
                    />
                    <p className="text-[9px] text-[#094D2B]/70 font-mono italic">说明：在轮询、比例加权分发模式下，数值越大表示路由节点获取概率也更高。</p>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#094D2B] text-white p-4 font-mono text-xs uppercase tracking-widest hover:bg-[#073A21] transition-colors rounded shadow-[4px_4px_0px_0px_#1E2E24] font-bold"
                >
                  确认保存网关节点
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Removal Confirmation Modal */}
      <AnimatePresence>
        {modelRemovalPrompt && (() => {
          const advice = getErrorResolutionAdvice(modelRemovalPrompt.status, modelRemovalPrompt.error);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border-2 border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full p-6 font-sans space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      advice.recommendedAction === 'remove_model' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">可用性检测诊断 · 处理建议</h3>
                      <p className="text-xs text-slate-500 font-mono">模型: {modelRemovalPrompt.modelId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModelRemovalPrompt(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Status & Raw Error Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-800 font-bold">
                    <span className="flex items-center gap-2">
                      <span>异常状态码:</span>
                      <span className="font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200">
                        HTTP {modelRemovalPrompt.status}
                      </span>
                    </span>
                    {modelRemovalPrompt.keyName && (
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-600 font-mono">
                        目标端点: {modelRemovalPrompt.keyName}
                      </span>
                    )}
                  </div>
                  <p className="text-rose-700 font-mono text-[11px] break-all leading-relaxed">
                    {modelRemovalPrompt.error}
                  </p>
                </div>

                {/* Smart Code Diagnosis & Advice Card */}
                <div className={`border rounded-xl p-3.5 space-y-2 text-xs ${
                  advice.recommendedAction === 'retry_later' 
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                    : advice.recommendedAction === 'remove_model' 
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                    : 'bg-sky-50/70 border-sky-200 text-sky-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold flex items-center gap-1.5 text-[12px]">
                      <span>💡</span>
                      <span>诊断提示: {advice.title}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      advice.recommendedAction === 'retry_later'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : advice.recommendedAction === 'remove_model'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-sky-100 text-sky-800 border-sky-300'
                    }`}>
                      推荐: {advice.actionLabel}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-95">
                    {advice.suggestion}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const mid = modelRemovalPrompt.modelId;
                        const kid = modelRemovalPrompt.keyId;
                        setModelRemovalPrompt(null);
                        checkModelAvailability(mid, kid);
                      }}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>立即重试检测</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelRemovalPrompt(null)}
                      className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      稍后再试 (保留)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {modelRemovalPrompt.keyId && (
                      <button
                        type="button"
                        onClick={() => handleRemoveModel(modelRemovalPrompt.modelId, modelRemovalPrompt.keyId)}
                        className={`px-3 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer ${
                          advice.recommendedAction === 'remove_model' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-rose-500 hover:bg-rose-600 opacity-90'
                        }`}
                      >
                        <Trash2 size={13} />
                        <span>从「{modelRemovalPrompt.keyName || '该端点'}」移除</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveModel(modelRemovalPrompt.modelId)}
                      className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>全部移除</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 text-xs font-sans max-w-md"
          >
            {toastMessage.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle size={16} className="text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <RefreshCw size={16} className="text-sky-400 shrink-0" />}
            <span className="flex-1 leading-snug">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-8 mt-20 border-t border-[#1E2E24] flex flex-col sm:flex-row justify-between gap-6 overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#094D2B]">
            <Activity size={14} className="animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest leading-none font-bold">高可用协同代理系统：运行就绪</span>
          </div>
          <p className="font-serif italic text-sm text-[#0a331c]/80">
            高可用 AI 多端负载分发均衡器 v2.0.0。专为高并发生产部署设计。
          </p>
        </div>
        <div className="flex items-center gap-8 font-mono text-[10px] uppercase text-[#0a331c]/60">
          <div className="flex flex-col">
            <span>动态流量路由 (Traffic Director)</span>
            <span className="text-[#094D2B] opacity-100 italic font-bold">智能保活 Active</span>
          </div>
          <div className="flex flex-col">
            <span>多节点算法 Strategy</span>
            <span className="text-[#094D2B] opacity-100 italic font-bold">{config.settings.strategy.toUpperCase()}</span>
          </div>
        </div>
      </footer>
      </>
    )}
    </div>
  );
}
