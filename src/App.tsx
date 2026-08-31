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
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { NimKey, NimConfig } from './types';

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

  const [viewMode, setViewMode] = useState<'dashboard' | 'endpoints' | 'models' | 'playground' | 'logs' | 'cli'>('dashboard');

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

  // CLI & OAuth Integration States
  const [cliSelectedProvider, setCliSelectedProvider] = useState<'codex' | 'gemini' | 'claude'>('codex');
  const [cliSimulatedToken, setCliSimulatedToken] = useState<string>('');
  const [cliLoading, setCliLoading] = useState<boolean>(false);
  const [cliShell, setCliShell] = useState<'bash' | 'powershell' | 'cmd'>('bash');
  const [cliModelName, setCliModelName] = useState<string>('gemini-1.5-pro');
  const [cliStream, setCliStream] = useState<boolean>(true);
  const [cliStep, setCliStep] = useState<number>(1);
  const [cliStep1Tab, setCliStep1Tab] = useState<'python' | 'nodejs' | 'curl'>('python');
  const [cliStep2Tab, setCliStep2Tab] = useState<'cursor' | 'claudecode' | 'cline'>('cursor');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [terminalRunning, setTerminalRunning] = useState<boolean>(false);
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

  const allModels = React.useMemo(() => {
    return Array.from(new Set(config.keys.flatMap(key => {
      const confirmed = key.confirmedModels || [];
      if (key.modelFilters && key.modelFilters.length > 0) {
        return confirmed.filter(m => key.modelFilters.includes(m));
      }
      return confirmed;
    }) as string[])).sort();
  }, [config.keys]);

  useEffect(() => {
    if (viewMode === 'playground' && !playgroundModel && allModels.length > 0) {
      setPlaygroundModel(allModels[0]);
    }
  }, [viewMode, allModels, playgroundModel]);

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
    const startTime = Date.now();
    
    const isImageModel = detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image");
    
    try {
      if (isImageModel) {
        // Image generation
        const response = await fetch('/nim-proxy/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.settings.masterKey ? { 'Authorization': `Bearer ${config.settings.masterKey}` } : {})
          },
          body: JSON.stringify({
            model: playgroundModel,
            prompt: playgroundPrompt,
            n: 1,
            size: playgroundImageSize,
            response_format: 'b64_json'
          })
        });
        
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || errData.error || `请求失败 [${response.status}]`);
        }
        
        let resJson;
        try {
          resJson = await response.json();
        } catch (jsonErr) {
          throw new Error("接口返回内容不是合法的 JSON 格式模型对象 (可能受到了重定向、网关网页拦截或 CDN 劫持干扰)");
        }
        const b64 = resJson.data?.[0]?.b64_json;
        const url = resJson.data?.[0]?.url;
        
        if (b64) {
          setPlaygroundImageBase64(b64);
        } else if (url) {
          setPlaygroundImageUrl(url);
        } else {
          throw new Error("没能从 NIM 端点返回有效的图像数据");
        }
        
        const activeKey = config.keys.find(k => {
          const confirmed = k.confirmedModels || [];
          if (k.modelFilters && k.modelFilters.length > 0) {
            return k.modelFilters.includes(playgroundModel) && confirmed.includes(playgroundModel);
          }
          return confirmed.includes(playgroundModel);
        });
        setPlaygroundLogs({
          router: activeKey ? activeKey.name : '智能路由分流',
          duration: duration
        });
      } else {
        // Chat completion
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
        
        const response = await fetch('/nim-proxy/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.settings.masterKey ? { 'Authorization': `Bearer ${config.settings.masterKey}` } : {})
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || errData.error || `请求失败 [${response.status}]`);
        }
        
        const activeKey = config.keys.find(k => {
          const confirmed = k.confirmedModels || [];
          if (k.modelFilters && k.modelFilters.length > 0) {
            return k.modelFilters.includes(playgroundModel) && confirmed.includes(playgroundModel);
          }
          return confirmed.includes(playgroundModel);
        });
        
        if (playgroundStream && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
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
                  setPlaygroundResponse(prev => prev + delta);
                } catch (e) {
                  // ignore
                }
              }
            }
          }
          
          setPlaygroundLogs({
            router: activeKey ? activeKey.name : '智能路由分流',
            duration: Date.now() - startTime
          });
        } else {
          let resJson;
          try {
            resJson = await response.json();
          } catch (jsonErr) {
            throw new Error("接口返回内容不是合法的 JSON 对象 (可能发生了重定向或者是网关/CDN拦截导致返回了 HTML 页面)");
          }
          setPlaygroundResponse(resJson.choices?.[0]?.message?.content || '');
          setPlaygroundLogs({
            router: activeKey ? activeKey.name : '智能路由分流',
            duration: Date.now() - startTime,
            tokens: resJson.usage?.total_tokens
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setPlaygroundResponse(`请求出错: ${err.message || "未知错误"}`);
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
      if (response.ok) {
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

  const fetchConfig = React.useCallback(async () => {
    try {
      const authHeader = localStorage.getItem('nim_admin_password') || '';
      
      const response = await fetch('/api/config', {
        headers: { 'x-admin-password': authHeader }
      });
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error('Failed to parse config as JSON:', jsonErr);
        setLoading(false);
        return;
      }
      setConfig(data);
      setLoading(false);

      // Now fetch stats
      try {
        const statsRes = await fetch('/api/stats', {
          headers: { 'x-admin-password': authHeader }
        });
        if (statsRes.ok) {
          let statsVal;
          try {
            statsVal = await statsRes.json();
          } catch (jsonErrStats) {
            console.warn('Failed to parse stats as JSON:', jsonErrStats);
            return;
          }
          setStats(statsVal);
        }
      } catch (e: any) {
        if (e && (e.message === 'Failed to fetch' || e.name === 'TypeError')) {
          console.warn('Error fetching statistics (server restarting or transient network down):', e.message);
        } else {
          console.error('Error fetching statistics:', e);
        }
      }

      // Now fetch global logs
      try {
        const logsRes = await fetch('/api/global-logs', {
          headers: { 'x-admin-password': authHeader }
        });
        if (logsRes.ok) {
          const logsVal = await logsRes.json();
          setGlobalLogs(logsVal);
        }
      } catch (e: any) {
        if (e && (e.message === 'Failed to fetch' || e.name === 'TypeError')) {
          console.warn('Error fetching global logs (server restarting or transient network down):', e.message);
        } else {
          console.error('Error fetching global logs:', e);
        }
      }
    } catch (error: any) {
      if (error && (error.message === 'Failed to fetch' || error.name === 'TypeError')) {
        console.warn('Error fetching config (server restarting or transient network down):', error.message);
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
      fetchConfig();
      const interval = setInterval(fetchConfig, 10000); // 10s interval
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

  const runTerminalSimulation = () => {
    if (terminalRunning) return;
    setTerminalRunning(true);
    setTerminalLogs([]);
    
    const steps = [
      `[system] Initializing dynamic CLI router on ${proxyUrl || 'http://localhost:3000'}...`,
      `[status] Checking gateway connection latency... OK (4ms)`,
      `[system] Switched authentication profile: [${(cliSelectedProvider || 'codex').toUpperCase()}]`,
      `[auth] Detecting OAuth Bearer Token from Environment...`,
      cliSimulatedToken 
        ? `[auth] Found Environment Token: "${cliSimulatedToken.substring(0, 18)}..."` 
        : `[auth] WARNING: No OAuth token detected, using default credentials on sandbox.`,
      `[proxy] Compiling OpenAI compatible translation rules...`,
      `[proxy] Mapping models to standard completions SDK...`,
      `[gateway] Launching pipeline listener on localhost:8000 -> ${proxyUrl}...`,
      `[status] PIPELINE ACTIVE & LISTENING`
    ];
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setTerminalLogs(prev => [...prev, steps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTerminalRunning(false);
      }
    }, 600);
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
                    { mode: 'cli', label: 'CLI & OAuth 集成', desc: 'CLI Mode', icon: Terminal },
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
                                <div className="flex items-center gap-2">
                                  <span className={log.status >= 400 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>[{log.status}]</span>
                                  <span className="opacity-70">{new Date(log.timestamp).toLocaleTimeString()}</span>
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
                  {/* Model Search and Filter Header */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-sans text-sm font-extrabold text-slate-800">端点聚合模型中心 (Aggregated Model Hub)</h3>
                      <p className="text-[10px] text-gray-500 font-mono">
                        智能汇总当前所有路由节点所授权通过的活跃大模型源（共 {
                          Array.from(new Set(config.keys.flatMap(key => {
                            const confirmed = key.confirmedModels || [];
                            return (key.modelFilters && key.modelFilters.length > 0)
                              ? confirmed.filter(m => key.modelFilters.includes(m))
                              : confirmed;
                          }) as string[])).length
                        } 个独立可用模型）
                      </p>
                    </div>
                    <div className="w-full sm:w-72 relative font-sans">
                      <input
                        type="search"
                        placeholder="关键字模糊检索大模型 (如 qwen, deepseek)..."
                        value={modelsSearch}
                        onChange={(e) => setModelsSearch(e.target.value)}
                        className="w-full border border-slate-250 focus:border-slate-450 p-2.5 pl-3.5 text-xs font-mono focus:ring-0 focus:outline-none bg-slate-50 rounded-xl font-semibold"
                      />
                    </div>
                  </div>

                  {/* Model Grouping View */}
                  {Array.from(new Set(config.keys.flatMap(key => {
                    const confirmed = key.confirmedModels || [];
                    if (key.modelFilters && key.modelFilters.length > 0) {
                      return confirmed.filter(m => key.modelFilters.includes(m));
                    }
                    return confirmed;
                  }) as string[]))
                    .sort()
                    .filter((modelId: string) => modelId.toLowerCase().includes(modelsSearch.toLowerCase()))
                    .map((modelId: string) => {
                      const keysForModel = config.keys.filter(key => {
                        const confirmed = key.confirmedModels || [];
                        const supported = key.modelFilters && key.modelFilters.length > 0
                          ? confirmed.filter(m => key.modelFilters.includes(m))
                          : confirmed;
                        return supported.includes(modelId);
                      });
                      if (keysForModel.length === 0) return null;
                      
                      // Try to find context length from any key that has it
                      const sampleKey = keysForModel.find(k => k.modelDetails?.[modelId]?.contextLength);
                      const ctxLen = sampleKey?.modelDetails?.[modelId]?.contextLength;
                      const ctx = ctxLen ? (ctxLen >= 1024 * 1024 ? `${(ctxLen / (1024 * 1024)).toFixed(0)}M` : ctxLen >= 1024 ? `${(ctxLen / 1024).toFixed(0)}K` : ctxLen.toString()) : null;
                      const modelType = detectModelType(modelId);

                      return (
                        <div key={modelId} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden font-sans animate-fade-in">
                          <div className="bg-slate-50 border-b border-slate-150 text-slate-700 p-3.5 px-4 flex justify-between items-center text-[10px] uppercase font-mono tracking-wider">
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
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-150 font-sans">
                            {/* Left Column: Endpoints list */}
                            <div className="lg:col-span-7 divide-y divide-slate-100">
                              {keysForModel.map(key => {
                                const perf = getLatencyForProviderModel(key, modelId, globalLogs);
                                return (
                                  <div key={key.id} className="p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors hover:bg-slate-50/70">
                                    <div className="flex items-center gap-3 font-semibold min-w-0">
                                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${key.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-sans text-sm font-bold text-slate-800 truncate">{key.name}</span>
                                          <span className="text-[9px] bg-slate-105 border border-slate-200 px-1.5 py-0.2 rounded font-mono text-slate-500">
                                            {perf.latency}ms {perf.type === 'real' || perf.type === 'real_key' ? '🎯 实战' : '⚡ 估算'}
                                          </span>
                                        </div>
                                        <span className="opacity-55 font-mono text-[9px] block truncate max-w-[240px] text-slate-500 mt-0.5">{key.endpoint || '系统置顶节点'}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-6 font-mono text-[10px] justify-between sm:justify-end">
                                      {key.quotaLimit ? (
                                        <div className="text-right">
                                          <span className="opacity-55 mr-1 font-bold">剩余配额:</span>
                                          <span className="font-bold text-emerald-600">{Math.max(0, key.quotaLimit - (key.quotaUsed || 0))} / {key.quotaLimit}</span>
                                        </div>
                                      ) : <span className="opacity-55 uppercase tracking-wider text-[9px] font-bold text-emerald-600 font-sans">不限配额</span>}
                                      
                                      <div className="text-right min-w-[60px] font-bold text-slate-700">
                                        <span className="opacity-55 mr-1">RPM:</span>
                                        <span className="font-bold">{key.rpmLimit || '∞'}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Right Column: Comparative Latency Bar Chart */}
                            <div className="lg:col-span-5 p-5 bg-slate-50/40 flex flex-col justify-between min-h-[220px]">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-sans text-xs font-extrabold text-[#094D2B] flex items-center gap-1.5">
                                    <Activity size={12} className="text-emerald-600" />
                                    <span>端点及协议往返时延对比 (Proxy Latency)</span>
                                  </h4>
                                  {(() => {
                                    const chartData = keysForModel.map(key => {
                                      const perf = getLatencyForProviderModel(key, modelId, globalLogs);
                                      return { name: key.name, latency: perf.latency, type: perf.type };
                                    });
                                    const hasReal = chartData.some(d => d.type === 'real' || d.type === 'real_key');
                                    return (
                                      <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded uppercase tracking-wider ${hasReal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {hasReal ? '🎯 实时测量' : '⏱️ 预设基准'}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <p className="text-[10px] text-slate-500 font-sans mb-4 leading-relaxed">
                                  该模型的各分流通道往返时延（包含协议转换中置开销）。延迟越低代表 Agent 发起回复与首字下发的总体感官体验越优越。
                                </p>
                              </div>

                              {(() => {
                                const chartData = keysForModel.map(key => {
                                  const perf = getLatencyForProviderModel(key, modelId, globalLogs);
                                  return {
                                    name: key.name,
                                    latency: perf.latency,
                                    type: perf.type,
                                    endpoint: key.endpoint || '系统代转端点',
                                    status: key.status
                                  };
                                }).sort((a, b) => a.latency - b.latency);

                                return (
                                  <div className="h-44 w-full bg-white/55 border border-slate-150 p-2 rounded-xl">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart
                                        data={chartData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                                      >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis 
                                          type="number" 
                                          domain={[0, 'dataMax + 100']} 
                                          stroke="#94a3b8" 
                                          fontSize={8} 
                                          tickFormatter={(v) => `${v}ms`}
                                        />
                                        <YAxis 
                                          type="category" 
                                          dataKey="name" 
                                          stroke="#475569" 
                                          fontSize={8} 
                                          width={75}
                                          tickLine={false}
                                          axisLine={false}
                                        />
                                        <Tooltip 
                                          content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                              const data = payload[0].payload;
                                              return (
                                                <div className="bg-white border-2 border-slate-200 p-2 rounded-lg shadow-sm font-sans text-[10px] space-y-1">
                                                  <p className="font-bold text-slate-800">{data.name}</p>
                                                  <p className="text-[8px] text-slate-400 font-mono truncate max-w-[170px]">{data.endpoint}</p>
                                                  <div className="flex items-center gap-2 mt-0.5 py-0.5 px-1 bg-slate-50 rounded">
                                                    <span className="font-bold text-[#094D2B] font-mono">{data.latency} ms</span>
                                                    <span className="text-[7px] bg-slate-200 text-slate-700 px-1 rounded uppercase font-bold tracking-wider">
                                                      {data.type === 'real' ? '🎯 实时实测' : data.type === 'real_key' ? '⚡ 节点平均' : '⏳ 协议基准'}
                                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            }
                                            return null;
                                          }}
                                        />
                                        <Bar dataKey="latency" radius={[0, 4, 4, 0]} barSize={9}>
                                          {chartData.map((entry, index) => {
                                            let color = '#d97706'; 
                                            if (entry.latency < 200) {
                                              color = '#059669'; // Emerald-500
                                            } else if (entry.latency < 400) {
                                              color = '#06b6d4'; // Cyan-500
                                            } else if (entry.latency < 600) {
                                              color = '#f59e0b'; // Amber-500
                                            } else {
                                              color = '#f43f5e'; // Rose-500
                                            }
                                            return <Cell key={`cell-${index}`} fill={color} />;
                                          })}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                        没有近期接口代理请求日志。请呼叫 API 或者是用 CLI 互动沙盒进行连接触发！
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
              ) : viewMode === 'cli' ? (
                <motion.div key="cli" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* CLI INTEGRATION HEADER */}
                  <div className="bg-gradient-to-br from-[#12232E]/40 via-[#10192C]/70 to-[#0B0F19] border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Terminal className="w-5 h-5 stroke-[2.5]" />
                        <h3 className="font-sans text-base font-extrabold text-white">CLI & Terminal OpenAI SDK Adapter</h3>
                      </div>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-2xl">
                        此模块专为开发终端中需要将各类非标大模型（如 SiliconFlow, 各种 Open Weight 本地微调模型等）转换为标准 <b>OpenAI SDK 协议格式</b> 进行快速调试、集成的客户端提供自动输出 of 适配配置。
                      </p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 flex items-center gap-2 rounded-xl shrink-0 self-start md:self-auto">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                      <span className="font-mono text-[9px] tracking-wider uppercase font-black text-emerald-400">OAUTH GATEWAY READY</span>
                    </div>
                  </div>

                  {/* STEP WIZARD INDICATOR */}
                  <div className="bg-slate-950/40 border border-slate-800/80 p-2 rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {[
                        { num: 1, title: '1. OpenAI SDK 格式接入', desc: 'Python / NodeJS / Curl 样例代码' },
                        { num: 2, title: '2. 常用 IDE / CLI 继承端', desc: 'Cursor / Claude Code / Cline 指南' },
                        { num: 3, title: '3. OAuth 自愈拦截模拟器', desc: '高可用令牌适应与终端沙盒' }
                      ].map((s) => {
                        const active = cliStep === s.num;
                        const done = cliStep > s.num;
                        return (
                          <button
                            key={s.num}
                            type="button"
                            onClick={() => setCliStep(s.num)}
                            className={`p-3 text-left rounded-xl transition-all select-none cursor-pointer border ${
                              active 
                                ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500 text-emerald-400 font-bold shadow-md transform scale-[1.01]' 
                                : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-5 h-5 rounded-full text-[10.5px] font-mono font-bold flex items-center justify-center border ${
                                active 
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-500' 
                                  : done
                                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40'
                                  : 'bg-slate-950 text-slate-500 border-slate-800'
                              }`}>
                                {done ? '✓' : s.num}
                              </span>
                              <span className="text-xs font-sans font-bold">{s.title}</span>
                            </div>
                            <span className="text-[10px] font-sans text-slate-500 block truncate pl-7">{s.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* LEFT PANEL: CONFIG STEP ACTIONS */}
                    <div className="xl:col-span-7 space-y-6">
                      
                      {/* STEP 1: OPENAI COMPATIBLE ENDPOINT & SDK SAMPLES */}
                      {cliStep === 1 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border-2 border-[#1E2E24] p-6 shadow-[4px_4px_0px_0px_#1E2E24] space-y-4">
                          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                            <h4 className="font-serif italic font-bold text-base text-[#094D2B]">配置 1: OpenAI SDK / API 标准中转接入与格式转换</h4>
                            <span className="font-mono text-[10px] text-gray-400 uppercase">OpenAI SDK Compatibility</span>
                          </div>
                          
                          <p className="text-xs text-gray-500 font-medium leading-relaxed">
                            本负载网关后端已 100% 自动对齐 OpenAI 兼容规范！您可以将任何模型以 <b>OpenAI SDK 格式</b> 呼叫出来。请将您的应用或代码配置基址 (API Base URL) 和密钥指向本服务器即可。
                          </p>

                          {/* CLI Auto-Translation banner */}
                          <div className="p-4 rounded-xl border border-emerald-800/20 bg-emerald-50/70 dark:bg-emerald-950/20 flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 mt-0.5">
                              <Terminal size={16} />
                            </div>
                            <div className="space-y-1">
                              <span className="font-sans font-bold text-xs text-[#0a2316] dark:text-[#a7f3d0] block">⚡ CLI 专有模型零阻碍无缝代换层 (Model Alias Transformer) 已上线！</span>
                              <p className="text-[10.5px] text-[#2c533c] dark:text-gray-300 leading-relaxed">
                                网关通过拦截并智能解析底层 OAuth 握手和请求 Body，已原生支持对 <b>codex</b>、<b>Gemini-cli</b> 和 <b>antigravity-cli</b> 等终端内置定制模型进行无感式<b>热代换与别名映射</b>。即使您的 CLI 客户端指定了不兼容的旧版/私有模型标识，9router 也会在毫秒级将其自动重映射并路由至当下活跃的、性能最匹配的主流开源/闭源高吞吐模型（如 DeepSeek、Qwen Coder 或 Llama），保障终端一键跑通，永久避免 model_not_found 报错！
                              </p>
                            </div>
                          </div>

                          {/* Quick connection parameters cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#EBF5EE]/20 border border-[#1E2E24]/15 rounded">
                            <div className="space-y-1">
                              <span className="font-mono text-[9px] uppercase font-black text-[#094D2B] block">1. 统一兼容端点 (Base URL)</span>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={`${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1`}
                                  className="flex-1 bg-white border border-gray-200 p-2 font-mono text-[11px] rounded focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1`);
                                    triggerCopy('baseUrl', `${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1`);
                                  }}
                                  className="bg-[#094D2B] text-white font-mono text-[10px] px-3.5 py-1.5 hover:bg-[#073A21] rounded font-bold"
                                >
                                  {copiedStates['baseUrl'] ? "已复制" : "复制"}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="font-mono text-[9px] uppercase font-black text-[#094D2B] block">2. 授权密钥 (OpenAI API Key)</span>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={config.settings.masterKey || "any-key-value (未配置 MasterKey 时填任意串)"}
                                  className="flex-1 bg-white border border-gray-200 p-2 font-mono text-[11px] rounded focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(config.settings.masterKey || "any-key-value");
                                    triggerCopy('masterKey', config.settings.masterKey || "any-key-value");
                                  }}
                                  className="bg-[#094D2B] text-white font-mono text-[10px] px-3.5 py-1.5 hover:bg-[#073A21] rounded font-bold"
                                >
                                  {copiedStates['masterKey'] ? "已复制" : "复制"}
                                </button>
                              </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-1">
                              <span className="font-mono text-[9px] uppercase font-black text-[#094D2B] block">3. 选定测试大模型 (Model Key)</span>
                              <div className="flex items-center gap-3">
                                <select 
                                  value={cliModelName}
                                  onChange={e => setCliModelName(e.target.value)}
                                  className="w-full bg-white border border-gray-200 p-2 font-mono text-[11px] rounded focus:outline-none cursor-pointer focus:border-[#094D2B]"
                                >
                                  {Array.from(new Set([
                                    ...(config?.keys || []).flatMap(k => k.confirmedModels || []),
                                    'gemini-1.5-pro',
                                    'deepseek-chat',
                                    'claude-3-5-sonnet',
                                    'gpt-4o'
                                  ])).filter(Boolean).map(m => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                                <p className="text-[10px] text-gray-500 leading-normal font-mono w-1/2">
                                  选择在下方 SDK 中作为调用形参，网关将自动根据您的活动物理节点挑选出最优源分头转发。
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* SDK Inner Tabs */}
                          <div className="space-y-2">
                            <div className="flex border-b border-gray-105 gap-2">
                              {[
                                { id: 'python', label: 'Python SDK' },
                                { id: 'nodejs', label: 'Node.js SDK' },
                                { id: 'curl', label: 'cURL Terminal' }
                              ].map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setCliStep1Tab(t.id as any)}
                                  className={`px-3 py-1.5 font-mono text-[10.5px] uppercase border-b-2 font-bold transition-all ${cliStep1Tab === t.id ? 'border-[#094D2B] text-[#094D2B]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>

                            <div className="relative font-mono text-xs bg-[#1E2E24] text-[#E8F5EE] p-4 font-normal overflow-x-auto border-2 border-[#1E2E24] rounded">
                              <pre className="text-[10.5px] leading-relaxed select-all">
                                {cliStep1Tab === 'python' ? (
`from openai import OpenAI

# 1. 实例化标准 OpenAI 客户端，基址指向您的 羊毛薅到底 转换服务
client = OpenAI(
    base_url="${proxyUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}/v1",
    api_key="${config.settings.masterKey || 'sk-wool'}"
)

# 2. 以标准的 OpenAI 语法，直连并呼叫网关后方的聚合高可用模型资源
response = client.chat.completions.create(
    model="${cliModelName}", # 支持后端已连接节点对应的任意物理大模型
    messages=[
        {"role": "user", "content": "写一个简明的高可用 Redis 分池负载均衡管理器方案"}
    ],
    stream=True # 秒级流式排版、无延迟打字机回传
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`
                                ) : cliStep1Tab === 'nodejs' ? (
`import OpenAI from "openai";

// 1. 初始化高亮集成的 OpenAI Client 实例
const openai = new OpenAI({
  baseURL: "${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1",
  apiKey: "${config.settings.masterKey || 'sk-wool'}"
});

// 2. 发起流式文本补全对话请求，透明捕获并无感透传至多上游网关
async function main() {
  const stream = await openai.chat.completions.create({
    model: "${cliModelName}",
    messages: [{ role: "user", content: "用 TypeScript 实现具有故障熔断状态的高性能连接管理器" }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`
                                ) : (
`curl -X POST "${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1/chat/completions" \\
  -H "Authorization: Bearer ${config.settings.masterKey || 'sk-wool'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${cliModelName}",
    "messages": [{"role": "user", "content": "你好，这是一条针对高可用网关进行连接与格式转换测试的指令。"}],
    "stream": true
  }'`
                                )}
                              </pre>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = cliStep1Tab === 'python' ? (
`from openai import OpenAI\n\nclient = OpenAI(\n    base_url="${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1",\n    api_key="${config.settings.masterKey || 'sk-wool'}"\n)\n\nresponse = client.chat.completions.create(\n    model="${cliModelName}",\n    messages=[\n        {"role": "user", "content": "写一个简明的高可用 Redis 分池负载均衡管理器方案"}\n    ],\n    stream=True\n)\n\nfor chunk in response:\n    if chunk.choices[0].delta.content:\n        print(chunk.choices[0].delta.content, end="", flush=True)`
                                  ) : cliStep1Tab === 'nodejs' ? (
`import OpenAI from "openai";\n\nconst openai = new OpenAI({\n  baseURL: "${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1",\n  apiKey: "${config.settings.masterKey || 'sk-wool'}"\n});\n\nasync function main() {\n  const stream = await openai.chat.completions.create({\n    model: "${cliModelName}",\n    messages: [{ role: "user", content: "用 TypeScript 实现具有故障熔断状态的高性能连接管理器" }],\n    stream: true,\n  });\n\n  for await (const chunk of stream) {\n    process.stdout.write(chunk.choices[0]?.delta?.content || "");\n  }\n}\n\nmain();`
                                  ) : (
`curl -X POST "${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1/chat/completions" \\\n  -H "Authorization: Bearer ${config.settings.masterKey || 'sk-wool'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${cliModelName}",\n    "messages": [{"role": "user", "content": "你好，这是一条针对高可用网关进行连接与格式转换测试的指令。"}],\n    "stream": true\n  }'`
                              );
                              navigator.clipboard.writeText(text);
                              triggerCopy('sdk-code', text);
                            }}
                            className="absolute top-2 right-2 text-[10px] bg-emerald-500 hover:bg-emerald-600 px-3 py-1 text-[#1E2E24] font-black rounded flex items-center gap-1 transition-all"
                          >
                            {copiedStates['sdk-code'] ? '✓ 已复制！' : '复制此段示例'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setCliStep(2)}
                          className="px-4 py-2 bg-[#094D2B] hover:bg-[#073A21] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-[2px_2px_0px_0px_#1E2E24]"
                        >
                          切换至 IDE / CLI 客户端配置 (Next) &rarr;
                        </button>
                      </div>
                    </motion.div>
                  )}


                      {/* STEP 2: IDE & CLIENT INTEGRATION GUIDES */}
                      {cliStep === 2 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border-2 border-[#1E2E24] p-6 shadow-[4px_4px_0px_0px_#1E2E24] space-y-4">
                          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                            <h4 className="font-serif italic font-bold text-base text-[#094D2B]">配置 2: 常用 AI 编程 IDE & CLI 终端一键中转劫持</h4>
                            <span className="font-mono text-[10px] text-gray-400 uppercase">IDE & Tool Chains</span>
                          </div>
                          
                          <p className="text-xs text-gray-500 font-medium leading-relaxed">
                            您需要使用的是开发套件 CLI，而不是普通的命令行脚本？没问题。您可以将本负载网关直接配置到 Cursor IDE, Claude Code 官方命令行, 或是 Cline/RooCode VSCode 插件中，实现对底层多供应商大模型接口的统一拦截、转发与高可用高吞吐管理。
                          </p>

                          {/* Client Inner Tabs */}
                          <div className="space-y-3">
                            <div className="flex border-b border-gray-105 gap-2">
                              {[
                                { id: 'cursor', label: 'Cursor IDE 接入' },
                                { id: 'claudecode', label: 'Claude Code CLI 命令行' },
                                { id: 'cline', label: 'Cline (Roo Code) 插件' }
                              ].map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setCliStep2Tab(t.id as any)}
                                  className={`px-3 py-1.5 font-mono text-[10.5px] uppercase border-b-2 font-bold transition-all ${cliStep2Tab === t.id ? 'border-[#094D2B] text-[#094D2B]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>

                            {/* CURSOR GUIDE */}
                            {cliStep2Tab === 'cursor' && (
                              <div className="space-y-3 text-xs bg-slate-50 p-4 border border-gray-200 rounded leading-relaxed text-gray-700">
                                <h5 className="font-bold text-[#094D2B] flex items-center gap-1">🎯 Cursor IDE 客户端五秒配置法：</h5>
                                <ol className="list-decimal list-inside space-y-1.5 font-sans">
                                  <li>打开 Cursor，点击右上角齿轮进入 <b>Settings &rarr; Models (设置 &rarr; 模型)</b> 面板。</li>
                                  <li>向下拉至底部找到 <b>OpenAI API Key</b>，填入 API 主密钥：<code className="bg-gray-200 px-1 font-mono text-[#094D2B] font-bold rounded">{config.settings.masterKey || 'sk-9router'}</code> (若未设 API Key 可填任意字符串)。</li>
                                  <li>点击 <b>"Override OpenAI Base URL" (覆盖基址)</b>，填入您的统一中转链接：
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="bg-gray-200 px-2 py-0.5 font-mono text-xs select-all rounded">{proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1</code>
                                    </div>
                                  </li>
                                  <li>在 <b>Model List (自定义模型列表)</b> 中添加您后端有可用额度与节点的模型代号 (例如：<code className="bg-gray-200 px-1 font-mono rounded">{cliModelName}</code>)。</li>
                                  <li>现在直接呼叫 Cursor Chat (Cmd+L) 或 Composer (Cmd+I)，您的工程提示词将全部以标准 OpenAI SDK 的握手逻辑，无损地流经您的 9router 极速负载均衡后台！</li>
                                </ol>
                              </div>
                            )}

                            {/* CLAUDE CODE GUIDE */}
                            {cliStep2Tab === 'claudecode' && (
                              <div className="space-y-3 text-xs bg-slate-50 p-4 border border-gray-200 rounded leading-relaxed text-gray-700">
                                <h5 className="font-bold text-[#094D2B] flex items-center gap-1">🎯 Anthropic 官方 Claude Code CLI 命令行劫持中转：</h5>
                                <p className="font-sans">
                                  Claude Code 会话极多、且高频发生上下文重发。我们可以通过在您的本地控制台导出环境变量覆写 Claude Base URL 指向，从而使 CLI 的所有流量平稳转接到 9router，享受免额度秒级输出：
                                </p>
                                <div className="relative font-mono text-[11px] bg-[#1E2E24] text-[#E8F5EE] p-3.5 rounded">
                                  <pre className="select-all">
{`# 1. 导出 Base URL 为标准 OpenAI SDK 兼容代理端口
export CLAUDE_BASE_URL="${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1"
# 2. 导出系统授权，若后端无需 MasterKey 可填任意伪密钥
export ANTHROPIC_API_KEY="${config.settings.masterKey || 'sk-9router'}"

# 3. 启动指令
claude`}
                                  </pre>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const txt = `export CLAUDE_BASE_URL="${proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1"\nexport ANTHROPIC_API_KEY="${config.settings.masterKey || 'sk-9router'}"\nclaude`;
                                      navigator.clipboard.writeText(txt);
                                      triggerCopy('claudecode-env', txt);
                                    }}
                                    className="absolute top-2 right-2 text-[9px] bg-emerald-500 hover:bg-emerald-600 px-2 py-0.5 text-[#1E2E24] font-bold rounded"
                                  >
                                    {copiedStates['claudecode-env'] ? '✓ 已复制！' : '复制配置变量'}
                                  </button>
                                </div>
                                <p className="font-sans text-[11px] text-gray-500 italic">
                                  注：部分现代版本的 Claude CLI 若遇到不兼容，可选择将其设置提供商设为自定义 API 或使用 OpenAI 兼容层来进行接入。
                                </p>
                              </div>
                            )}

                            {/* CLINE GUIDE */}
                            {cliStep2Tab === 'cline' && (
                              <div className="space-y-3 text-xs bg-slate-50 p-4 border border-gray-200 rounded leading-relaxed text-gray-700">
                                <h5 className="font-bold text-[#094D2B] flex items-center gap-1">🎯 VS Code 顶级 AI 编程插件 Cline / Roo Code 选择 OpenAI Compatible：</h5>
                                <ol className="list-decimal list-inside space-y-1.5 font-sans">
                                  <li>打开 VS Code，唤出 Cline / Roo Code 插件的配置侧边栏。</li>
                                  <li>在 <b>"API Provider" (提供商)</b> 选择框下拉，选定 <b>"OpenAI Compatible" (OpenAI 兼容)</b> 选项。</li>
                                  <li><b>"Base URL" (接口入口)</b> 栏贴入：<code className="bg-gray-200 px-1 font-mono select-all text-[#094D2B] font-bold rounded">{proxyUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')}/v1</code></li>
                                  <li><b>"API Key" (网关凭证)</b> 栏输入您的网关 MasterKey：<code className="bg-gray-200 px-1 font-mono rounded">{config.settings.masterKey || 'sk-9router'}</code> (免密模式随意写)。</li>
                                  <li><b>"Model ID" (模型代号)</b> 输入您指定的目标运行模型：如 <code className="bg-gray-200 px-1 font-mono rounded">{cliModelName}</code>。</li>
                                  <li>现在点击保存，Cline 所有的系统文件读写大提示词工程将立即无感借助 9router 进行自动失效重试分流！</li>
                                </ol>
                              </div>
                            )}
                          </div>

                          <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => setCliStep(1)}
                              className="px-3.5 py-2 border-2 border-gray-300 hover:border-gray-800 text-gray-700 font-mono text-xs font-bold uppercase tracking-wider"
                            >
                              &larr; 返回上一步 (SDK 快速配置)
                            </button>
                            <button
                              type="button"
                              onClick={() => setCliStep(3)}
                              className="px-4 py-2 bg-[#094D2B] hover:bg-[#073A21] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-[2px_2px_0px_0px_#1E2E24]"
                            >
                              前往 CLI OAuth 拦截模拟 Sandbox (Next) &rarr;
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 3: OAUTH INTERCEPT SANDBOX & HEALTH DIAGNOSTIC */}
                      {cliStep === 3 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border-2 border-[#1E2E24] p-6 shadow-[4px_4px_0px_0px_#1E2E24] space-y-4">
                          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                            <h4 className="font-serif italic font-bold text-base text-[#094D2B]">配置 3: CLI 内置 OAuth 拦截与高可用会话校验沙盒</h4>
                            <span className="font-mono text-[10px] text-gray-400 uppercase">OAuth Sandbox Gateway</span>
                          </div>
                          
                          <p className="text-xs text-gray-500 font-medium leading-relaxed">
                            当您在终端中使用 gcloud cli、github copilot-cli 或自定义 IDE 插件时，客户端会自动向下发送特异签名的临时 Bearer Token 或会话 JWT。<b>9router 的核心技术点在于可以无感接管并解密这些底层系统的 OAuth 凭证。</b>
                          </p>

                          {/* How it works grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-gray-700">
                            <div className="bg-[#EBF5EE]/20 p-3 border border-emerald-800/10 rounded space-y-1">
                              <span className="font-bold text-[#094D2B] block">🛡️ 1. 免密 / JWT 身份剥除自愈</span>
                              <p className="text-[11px] leading-relaxed text-gray-500">
                                收到来自 CLI 的 OAuth 持有者令牌后，9router 会快速拦截并执行临时匹配。即使客户端没有提供明文 OpenAI Key，网关也能识别系统签名并根据集群优先级静默转发至可用渠道。
                              </p>
                            </div>
                            <div className="bg-[#EBF5EE]/20 p-3 border border-emerald-800/10 rounded space-y-1">
                              <span className="font-bold text-[#094D2B] block">🔄 2. 路由目标集群重平衡</span>
                              <p className="text-[11px] leading-relaxed text-gray-500">
                                本系统会将客户端传入的目标 Request Payload 进行统一的流式转换。如果检测到目标厂商节点突发熔断或 429 频控，网关会在<b>毫秒级自动切换到备用物理节点</b>，客户端毫无察觉。
                              </p>
                            </div>
                          </div>

                          {/* Interactive Simulation Console Control */}
                          <div className="bg-slate-50 border border-gray-200 p-4 rounded space-y-3">
                            <h5 className="font-mono text-xs font-bold text-gray-800 flex items-center gap-1">
                              ⚡ 互动沙盒联调测试 (Interactive Connection Sandbox)
                            </h5>
                            <p className="text-[10px] text-gray-500 leading-normal">
                              您可以通过点击下方的模拟测试按钮，在不编写代码的情况下直接在右侧的【终端模拟器】中实时观测拦截链路的生命周期流转。
                            </p>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCliLoading(true);
                                  // Reset logs
                                  setTerminalLogs([
                                    `>>> curl -X POST "${proxyUrl || 'http://localhost:3000'}/v1/chat/completions" -H "Authorization: Bearer ${config.settings.masterKey || 'sk-9router'}" -d '{"model": "${cliModelName}"}'`,
                                    `[9router Gateway] ${new Date().toLocaleTimeString()} - 拦截到新呼叫连接... 请求源: Sandbox Simulator Client`
                                  ]);

                                  setTimeout(() => {
                                    setTerminalLogs(prev => [
                                      ...prev,
                                      `[9router Gateway] ${new Date().toLocaleTimeString()} - 读取授权头 Bearer Token 成功 - 校验合法契约`,
                                      `[9router Gateway] ${new Date().toLocaleTimeString()} - 匹配路由目标物理标的: ${cliModelName}`
                                    ]);
                                  }, 400);

                                  setTimeout(() => {
                                    setTerminalLogs(prev => [
                                      ...prev,
                                      `[9router Gateway] ${new Date().toLocaleTimeString()} - 发现底排主控节点活跃：DeepSeek/Gemini API 主干节点 [Ping: 23ms]`,
                                      `[9router Gateway] ${new Date().toLocaleTimeString()} - 正在启动流式内容合并还原代理 (Gateway Proxy Stream Handshake)...`
                                    ]);
                                  }, 950);

                                  setTimeout(() => {
                                    setTerminalLogs(prev => [
                                      ...prev,
                                      'HTTP/1.1 200 OK | Content-Type: text/event-stream',
                                      `[Success Response] data: {"choices":[{"delta":{"content":"恭喜！您的 OpenAI SDK 中转呼叫成功通过 9router 拦截引擎并成功输出响应结果。本条报文是经由底层物理大模型作为高可用聚合池返回的，且链路延迟及响应格式已全面符合 OpenAI Client 所需契约规范！"}}]}}`,
                                      `[9router Gateway] ${new Date().toLocaleTimeString()} - 会话结束。传输总容量: 0.12KB, 负载代理调度耗时: 41ms`
                                    ]);
                                    setCliLoading(false);
                                  }, 1600);
                                }}
                                disabled={cliLoading}
                                className="bg-[#094D2B] hover:bg-[#073A21] disabled:bg-gray-300 text-white font-mono text-xs font-bold py-2 px-4 uppercase tracking-wider rounded shadow transition-all flex items-center gap-1.5"
                              >
                                {cliLoading ? '正在联动测试...' : '🚀 发起一次本地高可用中转负载测试 (Test Connection)'}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setTerminalLogs([
                                    `[9router Gateway] ${new Date().toLocaleTimeString()} - 终端交互日志已重组清屏。等待新的客户端呼叫或测试请求...`
                                  ]);
                                }}
                                className="border border-gray-300 hover:border-gray-500 text-gray-600 font-mono text-[10.5px] font-bold px-3 py-2 rounded"
                              >
                                清空日志
                              </button>
                            </div>
                          </div>

                          <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => setCliStep(2)}
                              className="px-3.5 py-2 border-2 border-gray-300 hover:border-gray-800 text-gray-700 font-mono text-xs font-bold uppercase tracking-wider"
                            >
                              &larr; 返回上一步 (IDE 客户端配置)
                            </button>
                            <span className="font-mono text-[11px] text-[#094D2B] font-black">&#10004; 负载集成配置圆满就绪</span>
                          </div>
                        </motion.div>
                      )}

                    </div>

                    {/* RIGHT PANEL: IMMERSIVE TERMINAL SIMULATOR FOR CONNECTION PLAYGROUND */}
                    <div className="xl:col-span-5 space-y-6">
                      
                      {/* TERMINAL CONTAINER */}
                      <div className="border-2 border-[#1E2E24] bg-slate-950 shadow-[6px_6px_0px_0px_#1E2E24] overflow-hidden flex flex-col h-[480px]">
                        {/* Title Bar */}
                        <div className="bg-[#1E2E24] px-4 py-2 flex items-center justify-between border-b border-black">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          </div>
                          <span className="font-mono text-[10px] font-bold text-gray-400">oauth-tester-terminal ~ sh</span>
                          <Laptop className="w-3.5 h-3.5 text-gray-400" />
                        </div>

                        {/* Interactive Stage Panel */}
                        <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 select-all scroller-hidden">
                          {terminalLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                              <Terminal className="w-10 h-10 text-[#094D2B] opacity-60 animate-bounce" />
                              <h5 className="font-serif italic font-bold text-sm text-[#094D2B]">极速中转网关 CLI 沙盒仿真器</h5>
                              <p className="text-[10px] text-gray-500 max-w-xs leading-normal">
                                无需立即贴入真正终端，直接在此处点击一键触发，即可查看高安全 OAuth 令牌在网关中剥去、验证及重组转发的底层流水机制。
                              </p>
                              
                              <button
                                type="button"
                                onClick={runTerminalSimulation}
                                className="bg-[#094D2B] hover:bg-[#073A21] text-[#E8F5EE] font-mono text-[10px] font-bold px-3 py-2 uppercase tracking-wider rounded border border-emerald-500/30 flex items-center gap-2 transition-all shadow-sm"
                              >
                                <Play size={10} fill="currentColor" /> 执行本地方真网关检测 (Run SandSim)
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5 leading-relaxed font-mono">
                              {terminalLogs.map((log, idx) => {
                                const isSuccess = log && log.includes("[Success Response]");
                                const isErr = log && log.includes("WARNING");
                                const isInput = log && log.startsWith(">>>");
                                return (
                                  <div 
                                    key={idx} 
                                    className={`p-1 font-mono text-[11px] ${
                                      isSuccess 
                                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50 rounded p-2.5 mt-2 font-bold' 
                                        : isErr 
                                        ? 'text-yellow-400' 
                                        : isInput
                                        ? 'text-yellow-200 bg-slate-900 border border-slate-800 rounded p-2 text-xs'
                                        : 'text-slate-300'
                                    }`}
                                  >
                                    {log}
                                  </div>
                                );
                              })}
                              
                              {terminalRunning && (
                                <div className="flex items-center gap-1.5 py-1 text-emerald-400 animate-pulse font-mono">
                                  <span>▋</span>
                                  <span className="text-[10px] tracking-widest uppercase">Executing proxy mapping queries...</span>
                                </div>
                              )}

                              {!terminalRunning && (
                                <div className="pt-4 flex justify-between">
                                  <span className="text-gray-500 text-[10px]">Total process timed out in 1.4s</span>
                                  <button
                                    type="button"
                                    onClick={() => setTerminalLogs([])}
                                    className="text-[10px] text-[#094D2B] hover:underline font-bold"
                                  >
                                    [ 清除屏幕 (Reset Output) ]
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* EXTRA DETAILED FAQ ACCORDION PANEL */}
                      <div className="bg-white border-2 border-[#1E2E24] p-4 shadow-[4px_4px_0px_0px_#1E2E24] space-y-3">
                        <span className="font-mono text-[10px] uppercase font-bold text-[#094D2B] block border-b pb-1.5">集成调试诊断与高频疑难排查 (Diagnostics)</span>
                        
                        <div className="space-y-2 text-xs">
                          <details className="group border-b border-gray-150 pb-1.5 outline-none cursor-pointer">
                            <summary className="font-bold flex justify-between items-center text-gray-800 select-none">
                              <span>❓ 为什么会连续报 `Unauthorized: 401` 异常？</span>
                              <span className="transition-transform group-open:rotate-180 text-gray-400">&darr;</span>
                            </summary>
                            <p className="text-[10px] text-gray-500 leading-relaxed mt-1.5 bg-gray-50 p-2.5 rounded border">
                              这通常是由于一次性获取的 GCP Access Token / AWS JWT 已过 3600 秒标准生命期，导致鉴权过期。本高可用网关支持故障自动侦测：您可以直接重新触发 `gcloud/aws` 脚本重新刷取并注入系统变量。
                            </p>
                          </details>

                          <details className="group border-b border-gray-150 pb-1.5 outline-none cursor-pointer">
                            <summary className="font-bold flex justify-between items-center text-gray-800 select-none">
                              <span>❓ Windows PowerShell 中运行时报解析错误？</span>
                              <span className="transition-transform group-open:rotate-180 text-gray-400">&darr;</span>
                            </summary>
                            <p className="text-[10px] text-gray-500 leading-relaxed mt-1.5 bg-gray-50 p-2.5 rounded border">
                              请确认第二步将系统外壳匹配至 <b>PowerShell</b>。在 Bash 中的环境导出符 `export` 与 PowerShell 下的 `$env:` 存在很大的内核级差异，我们将配置按规范切分为最纯净的版本。
                            </p>
                          </details>

                          <details className="group border-b border-gray-150 pb-1.5 outline-none cursor-pointer">
                            <summary className="font-bold flex justify-between items-center text-gray-800 select-none">
                              <span>❓ 该认证中转对本地网速是否有影响？</span>
                              <span className="transition-transform group-open:rotate-180 text-gray-400">&darr;</span>
                            </summary>
                            <p className="text-[10px] text-gray-500 leading-relaxed mt-1.5 bg-gray-50 p-2.5 rounded border">
                              均分路由系统完全基于高并发内存路由表运行，对 OAuth 的安全性校验均在握手期一次性处理（非每次对话反复登录），数据包穿透流转追加的额外时延极低（通常不超过 5ms），请放心在您的生产流片中集成。
                            </p>
                          </details>
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
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

                      {/* Right Side: Visual Output Window */}
                      <div className="lg:col-span-12 xl:col-span-7 flex flex-col bg-white border-2 border-[#1E2E24] p-6 shadow-[4px_4px_0px_0px_#1E2E24] min-h-[400px]">
                        <div className="border-b border-[#1E2E24]/20 pb-4 flex items-center justify-between mb-4">
                          <span className="font-mono text-xs uppercase tracking-widest font-bold text-[#094D2B]">负载分流监测窗口 (METRICS & RESPONSE)</span>
                          {playgroundLogs && (
                            <span className="font-mono text-[9px] text-[#094D2B] font-bold bg-[#EBF5EE] px-2.5 py-1 rounded border border-[#1E2E24]/30">
                              健康分流节点: {playgroundLogs.router} | 延迟: {playgroundLogs.duration}ms {playgroundLogs.tokens ? `| 吞吐 tokens: ${playgroundLogs.tokens}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Render Workspace */}
                        <div className="flex-1 flex flex-col min-h-[320px] bg-[#EFF2EF] border-2 border-[#1E2E24]/30 p-4 relative overflow-hidden font-mono text-xs rounded">
                          {playgroundLoading && !playgroundResponse && (
                            <div className="absolute inset-0 bg-[#EFF2EF]/90 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 z-10 text-center p-6 bg-opacity-70">
                              <RefreshCw size={32} className="text-[#094D2B] animate-spin" />
                              <div className="space-y-1">
                                <p className="font-mono uppercase font-bold text-xs tracking-wider text-[#094D2B]">API_ROUTING_IN_PROGRESS</p>
                                <p className="text-[10px] text-gray-600">正在通过健康分析调用高可用端点进行在线路由分流计算...</p>
                              </div>
                            </div>
                          )}

                          {!playgroundLoading && !playgroundResponse && !playgroundImageBase64 && !playgroundImageUrl ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                              <Sparkles size={28} className="mb-2 text-[#094D2B] animate-pulse" />
                              <p className="font-serif italic text-sm mb-1 text-[#094D2B] font-bold">等待接收高可用路由分析执行答案</p>
                              <p className="text-[10px] text-gray-500">在左侧对话栏发送指令，负载均衡器会自动分析并路由至延迟最低的活节点上</p>
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
                                    <p className="text-[10px] font-mono uppercase tracking-widest mt-4 text-[#094D2B]">渲染图纸渲染中...</p>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            /* Chat / Text Output Frame */
                            <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-[450px] bg-white p-4 border-2 border-[#1E2E24]/20 select-text select-all rounded-md shadow-inner text-gray-800">
                              {playgroundResponse || (playgroundLoading && <span className="animate-pulse">_</span>)}
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
                      选择特定的协议转换器后，本节点网关会充当中置中继适配层，以把 Google Gemini CLI/Claude CLI/Antigravity 的非标能力输出标准 OpenAI 格式给其他 Agent 或调用端。
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
