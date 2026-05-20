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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { NimKey, NimConfig } from './types';

const detectModelType = (modelId: string): { label: string; bgClass: string; textClass: string } => {
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

export const PROVIDER_PRESETS = [
  { id: 'nvidia', name: 'NVIDIA NIM (官方端点)', endpoint: 'https://integrate.api.nvidia.com/v1', placeholder: 'nvapi-...', desc: 'NVIDIA 官方 NIM 微服务聚合端点' },
  { id: 'siliconflow', name: 'SiliconFlow (硅基流动)', endpoint: 'https://api.siliconflow.cn/v1', placeholder: 'sk-...', desc: '国内极速、高性价比大模型托管平台' },
  { id: 'groq', name: 'Groq Cloud', endpoint: 'https://api.groq.com/openai/v1', placeholder: 'gsk_...', desc: '极速 LPU 推理终端，支持高吞吐大模型' },
  { id: 'sambanova', name: 'SambaNova Systems', endpoint: 'https://api.sambanova.ai/v1', placeholder: 'sambanova-...', desc: '高QPS、大文本极速推理接口' },
  { id: 'deepseek', name: 'DeepSeek (开放云服务)', endpoint: 'https://api.deepseek.com/v1', placeholder: 'sk_...', desc: '高性价比国产自研模型提供商' },
  { id: 'zhipu', name: 'Zhipu AI (智谱 GLM 开放平台)', endpoint: 'https://open.bigmodel.cn/api/paas/v4', placeholder: '...', desc: 'GLM 官方开发者高可靠性大平台' },
  { id: 'gemini', name: 'Google Gemini (OpenAI 兼容)', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', placeholder: '...', desc: '标准 OpenAI 格式的谷歌原生 API 支持' },
  { id: 'openrouter', name: 'OpenRouter (大模型聚合)', endpoint: 'https://openrouter.ai/api/v1', placeholder: 'sk-or-...', desc: '聚合了上百种开源和闭源大模型的代理网关' },
  { id: 'custom', name: '自定义端点 (Custom Endpoint)', endpoint: '', placeholder: 'https://...', desc: '任何兼容 OpenAI 协议规范的私有部署或三方网关' }
];

export const getProviderBadge = (endpoint: string) => {
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
  } else if (url.includes("integrate.api.nvidia.com") || url === "" || url === "https://integrate.api.nvidia.com/v1") {
    return { name: "NVIDIA NIM", bg: "bg-[#E6F4EA] text-[#0F3A20] border-[#A8E6CF]" };
  } else {
    return { name: "通用兼容端点", bg: "bg-slate-100 text-slate-800 border-slate-200" };
  }
};

export default function App() {
  const [config, setConfig] = useState<NimConfig>({ 
    keys: [], 
    settings: { strategy: 'round-robin', globalQpsLimit: 0, circuitBreakerThreshold: 5, defaultEndpoint: 'https://integrate.api.nvidia.com/v1', adminPassword: 'admin' } 
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

  const allModels = Array.from(new Set(config.keys.flatMap(key => {
    const confirmed = key.confirmedModels || [];
    if (key.modelFilters && key.modelFilters.length > 0) {
      return confirmed.filter(m => key.modelFilters.includes(m));
    }
    return confirmed;
  }) as string[])).sort();

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

  useEffect(() => {
    const savedPassword = localStorage.getItem('nim_admin_password');
    if (savedPassword) {
      handleLogin(savedPassword);
    }
    setProxyUrl(`${window.location.origin}/nim-proxy`);
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchConfig();
      const interval = setInterval(fetchConfig, 10000); // 10s interval
      return () => clearInterval(interval);
    }
  }, [authenticated]);

  const handleLogin = async (pwd: string) => {
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
  };

  const fetchConfig = async () => {
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
  };

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
    setNewKey({ name: '', key: '', endpoint: '', qpsLimit: 0, rpmLimit: 0, quotaLimit: 0, modelFilters: [], enabled: true });
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
      enabled: key.enabled !== false
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
        body: JSON.stringify({ key: newKey.key, endpoint: newKey.endpoint })
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
    <div className="min-h-screen bg-[#EFF2EF] text-[#1A2521] font-sans selection:bg-[#094D2B] selection:text-[#E8F5EE]">
      {!authenticated ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#EFF2EF]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-[#1E2E24] w-full max-w-md shadow-[6px_6px_0px_0px_#1E2E24] overflow-hidden"
          >
            <div className="bg-[#094D2B] text-[#E8F5EE] p-4 flex justify-between items-center font-mono text-xs uppercase tracking-widest">
              <span>SECURITY_AUTHENTICATION</span>
              <Activity size={16} className="text-[#A7F3D0] animate-pulse" />
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <h2 className="font-serif italic text-2xl text-[#094D2B] font-bold">接口负载均衡系统</h2>
                <p className="text-sm text-gray-650">请输入管理后台对应的校验密码以访问控制面板。</p>
              </div>
              <div className="space-y-2">
                <input 
                  type="password"
                  placeholder="Password"
                  className="w-full border-2 border-[#1E2E24] p-3 font-mono focus:outline-none focus:bg-[#FAFBF9]"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin(password)}
                />
                {loginError && <p className="text-red-600 text-xs font-mono">{loginError}</p>}
              </div>
              <button 
                onClick={() => handleLogin(password)}
                className="w-full bg-[#1E2E24] text-white p-4 font-mono text-sm uppercase tracking-widest hover:bg-[#094D2B] transition-colors"
              >
                验证口令进入
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="border-b-2 border-[#1E2E24] p-6 flex justify-between items-center bg-[#D0DCD0] sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#094D2B] rounded shadow-sm">
                <Activity className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif italic text-2xl font-bold tracking-tight text-[#094D2B]">NVIDIA NIM & 多端点通用负载均衡器 <span className="text-xs opacity-65 not-italic ml-1">v2.0.0</span></h1>
                <p className="font-mono text-[9px] uppercase opacity-75 tracking-widest leading-none mt-1 text-[#1D3528]">ENTERPRISE HIGH-AVAILABILITY MULTI-PROVIDER BALANCER</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  localStorage.removeItem('nim_admin_password');
                  setAuthenticated(false);
                }}
                className="font-mono text-[10px] uppercase underline hover:no-underline text-gray-700 hover:text-[#094D2B]"
              >
                退出控制台
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 bg-white border border-[#1E2E24] hover:bg-[#094D2B] hover:text-white transition-colors shadow-sm"
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={openAddForm}
                className="p-3 bg-[#094D2B] text-white hover:bg-[#064E3B] transition-colors flex items-center gap-2 font-mono text-xs uppercase"
              >
                <Plus size={18} />
                <span>添加端点</span>
              </button>
            </div>
          </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Global Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: '活跃节点', value: `${config.keys.filter(k => k.enabled && k.status === 'active').length} / ${config.keys.length}`, icon: Database },
            { label: '总请求数', value: config.keys.reduce((acc, k) => acc + k.useCount, 0).toLocaleString(), icon: Activity },
            { label: '负载策略', value: config.settings.strategy.replace('-', '_').toUpperCase(), icon: RefreshCw },
            { label: '平均成功率', value: `${((config.keys.reduce((acc, k) => acc + (k.useCount - (k.errorCount || 0)), 0) / (config.keys.reduce((acc, k) => acc + k.useCount, 0) || 1)) * 100).toFixed(1)}%`, icon: CheckCircle2 },
          ].map((stat, i) => (
            <div key={i} className="bg-white border-2 border-[#1E2E24] p-4 flex items-center justify-between shadow-[3px_3px_0px_0px_#1E2E24]">
              <div>
                <p className="font-mono text-[10px] uppercase text-gray-500 font-bold">{stat.label}</p>
                <p className="text-xl font-mono leading-none text-[#094D2B] font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon size={20} className="text-[#094D2B] opacity-25" />
            </div>
          ))}
          <button 
            onClick={runAllHealthChecks}
            disabled={isCheckingHealth}
            className="group bg-white border-2 border-[#1E2E24] p-3 flex flex-col items-center justify-center shadow-[3px_3px_0px_0px_#1E2E24] hover:bg-[#094D2B] hover:text-white hover:border-[#094D2B] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck size={20} className={isCheckingHealth ? "animate-pulse mb-1 text-[#094D2B]" : "mb-1 text-[#094D2B] group-hover:scale-110 transition-transform"} />
            <span className="font-mono text-[10px] uppercase tracking-widest font-bold">{isCheckingHealth ? '检查中...' : '启动健康检查'}</span>
          </button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.section 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-white border-2 border-[#1E2E24] p-6 space-y-6 shadow-[5px_5px_0px_0px_#1E2E24]"
            >
              <div className="flex items-center justify-between border-b-2 border-[#1E2E24]/20 pb-2 text-xs font-mono uppercase font-bold text-[#094D2B]">
                <span>全局调度与安全参数配置</span>
                <span className="opacity-40">GLOBAL_CONFIG.JSON</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-60 block font-bold">调度策略 (Strategy)</label>
                  <select 
                    value={config.settings.strategy}
                    onChange={(e) => updateSettings({ strategy: e.target.value as any })}
                    className="w-full border-2 border-[#1E2E24] p-2 font-mono text-sm focus:outline-none focus:bg-[#EBF5EE]"
                  >
                    <option value="round-robin">轮询 (Round Robin)</option>
                    <option value="random">随机 (Random)</option>
                    <option value="least-used">最少使用 (Least Used)</option>
                    <option value="weighted">比例分配 (Weighted - 基于额度占比)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-60 block font-bold">全局 QPS 限制 (0 为不限制)</label>
                  <input 
                    type="number"
                    value={config.settings.globalQpsLimit}
                    onChange={(e) => updateSettings({ globalQpsLimit: parseInt(e.target.value) })}
                    className="w-full border-2 border-[#1E2E24] p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-60 block font-bold">熔断阈值 (连续失败次数)</label>
                  <input 
                    type="number"
                    value={config.settings.circuitBreakerThreshold}
                    onChange={(e) => updateSettings({ circuitBreakerThreshold: parseInt(e.target.value) })}
                    className="w-full border-2 border-[#1E2E24] p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-60 block font-bold">自动健康检查间隔 (分钟, 0 为关闭)</label>
                  <input 
                    type="number"
                    value={config.settings.healthCheckInterval || 0}
                    onChange={(e) => updateSettings({ healthCheckInterval: parseInt(e.target.value) })}
                    className="w-full border-2 border-[#1E2E24] p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-3">
                  <label className="font-mono text-[10px] uppercase opacity-70 block font-bold text-[#1E2E24]">默认全局网关端点 (Default Gateway Endpoint)</label>
                  <input 
                    type="url"
                    value={config.settings.defaultEndpoint}
                    onChange={(e) => updateSettings({ defaultEndpoint: e.target.value })}
                    className="w-full border-2 border-[#1E2E24] p-3 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-3">
                  <label className="font-mono text-[10px] uppercase opacity-70 block font-bold text-[#1E2E24]">网关主访问令牌 (Master Key - 留空则对外免鉴权公开开放)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="设置一个访问此代理路由所需的 Key"
                      value={config.settings.masterKey || ''}
                      onChange={(e) => updateSettings({ masterKey: e.target.value })}
                      className="flex-1 border-2 border-[#1E2E24] p-2 font-mono text-sm focus:outline-none"
                    />
                    <button 
                      onClick={() => updateSettings({ masterKey: Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12) })}
                      className="px-4 border-2 border-[#1E2E24] bg-white hover:bg-[#094D2B] hover:text-white transition-colors font-mono text-[10px] font-bold"
                    >
                      自动生成 Key
                    </button>
                  </div>
                  <div className="space-y-1 mt-2">
                    <label className="font-mono text-[10px] uppercase opacity-70 block font-bold text-[#1E2E24]">控制台管理密码 (Password)</label>
                    <input 
                      type="password"
                      placeholder="设置后台管理密码"
                      value={config.settings.adminPassword || ''}
                      onChange={(e) => updateSettings({ adminPassword: e.target.value })}
                      className="w-full border-2 border-[#1E2E24] p-3 font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Proxy Info Card */}
        <section className="bg-white border-2 border-[#1E2E24] p-6 space-y-4 shadow-[4px_4px_0px_0px_#1E2E24]">
          <div className="flex items-center justify-between border-b-2 border-[#1E2E24]/10 pb-4">
            <div className="flex items-center gap-2 capitalize text-[#094D2B]">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="font-serif italic text-xl font-bold">代理配置与集成指南</h2>
            </div>
            <div className="flex items-center gap-2 bg-[#EBF5EE] text-[#0A3D23] px-2.5 py-1 rounded border border-[#BCE5CC]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="font-mono text-[10px] uppercase font-bold">GATEWAY ACTIVE</span>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-gray-755 leading-relaxed md:max-w-2xl">
              在您对应的客户端、双脑聊天、或中转 SDK 框架（兼容标准 OpenAI SDK）中，将默认请求端点替换成下方负载网关 URL，即可实现对 SiliconFlow、Groq、Gemini、DeepSeek 及 NIM 节点的高可用无感分流路由。
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 font-mono text-sm bg-[#EBF5EE] text-[#0A3D23] border border-[#A8D3B9] p-3.5 flex items-center justify-between group rounded shadow-inner">
                <code className="break-all font-bold select-all">{proxyUrl}</code>
                <button 
                  onClick={copyProxyUrl}
                  title="复制代理链接"
                  className="p-1.5 hover:bg-[#094D2B] hover:text-white transition-colors shrink-0 rounded"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
            {config.settings.masterKey && (
              <div className="bg-[#1E2E24] text-[#E8F5EE] p-3 font-mono text-[10px] space-y-1 rounded shadow">
                <p className="opacity-60">调用请求头凭证 (Required Request Header):</p>
                <code className="block select-all bg-[#094D2B]/50 p-1 rounded font-bold">Authorization: Bearer {config.settings.masterKey}</code>
              </div>
            )}
          </div>
        </section>

        {/* Endpoints List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#1E2E24] pb-2">
            <div className="flex items-center gap-6 overflow-x-auto scroller-hidden">
              <button 
                onClick={() => setViewMode('dashboard')}
                className={`font-mono text-xs uppercase tracking-widest flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${viewMode === 'dashboard' ? 'border-[#094D2B] text-[#094D2B] opacity-100 font-bold' : 'border-transparent text-gray-500 opacity-60 hover:opacity-100'}`}
              >
                <BarChart2 size={14} /> 核心仪表盘 (Dashboard)
              </button>
              <button 
                onClick={() => setViewMode('endpoints')}
                className={`font-mono text-xs uppercase tracking-widest flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${viewMode === 'endpoints' ? 'border-[#094D2B] text-[#094D2B] opacity-100 font-bold' : 'border-transparent text-gray-500 opacity-60 hover:opacity-100'}`}
              >
                <Database size={14} /> 可路由端点 (Endpoints / Keys)
              </button>
              <button 
                onClick={() => setViewMode('models')}
                className={`font-mono text-xs uppercase tracking-widest flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${viewMode === 'models' ? 'border-[#094D2B] text-[#094D2B] opacity-100 font-bold' : 'border-transparent text-gray-500 opacity-60 hover:opacity-100'}`}
              >
                <Activity size={14} /> 聚合模型源 (Models)
              </button>
              <button 
                onClick={() => setViewMode('playground')}
                className={`font-mono text-xs uppercase tracking-widest flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${viewMode === 'playground' ? 'border-[#094D2B] text-[#094D2B] opacity-100 font-bold' : 'border-transparent text-gray-500 opacity-60 hover:opacity-100'}`}
              >
                <Sparkles size={14} /> 网关测试沙盒 (Playground)
              </button>
              <button 
                onClick={() => setViewMode('logs')}
                className={`font-mono text-xs uppercase tracking-widest flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${viewMode === 'logs' ? 'border-[#094D2B] text-[#094D2B] opacity-100 font-bold' : 'border-transparent text-gray-500 opacity-60 hover:opacity-100'}`}
              >
                <FileText size={14} /> 实时日志 (Proxy Logs)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {viewMode === 'dashboard' ? (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* Bento Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24]">
                      <div className="flex justify-between items-start opacity-60">
                        <span className="font-mono text-[10px] uppercase font-bold tracking-wider">路由配置节点 (Total Node Keys)</span>
                        <Database size={16} className="text-[#094D2B]" />
                      </div>
                      <p className="font-serif italic text-3xl font-bold mt-2 text-[#094D2B]">{config.keys.length}</p>
                      <div className="mt-1 flex gap-2 font-mono text-[9px]">
                        <span className="text-emerald-700 font-bold">{config.keys.filter(k => k.enabled && k.status === 'active').length} 活跃中</span>
                        <span className="opacity-45">/</span>
                        <span className="text-red-700 font-bold">{config.keys.filter(k => k.enabled && (k.status === 'error' || k.status === 'circuit-broken')).length} 故障</span>
                      </div>
                    </div>

                    <div className="border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24]">
                      <div className="flex justify-between items-start opacity-60">
                        <span className="font-mono text-[10px] uppercase font-bold tracking-wider">已处理总流量 (Proxy Traffic)</span>
                        <Activity size={16} className="text-[#094D2B]" />
                      </div>
                      <p className="font-serif italic text-3xl font-bold mt-2 text-[#094D2B]">{stats.totalRequests || 0}</p>
                      <span className="font-mono text-[9px] text-gray-500 mt-1 block">累计触发网关数 (Requests handled)</span>
                    </div>

                    <div className="border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24]">
                      <div className="flex justify-between items-start opacity-60">
                        <span className="font-mono text-[10px] uppercase font-bold tracking-wider font-sans">网关异常率 (Proxy Failures)</span>
                        <AlertCircle size={16} className={stats.failedRequests > 0 ? "text-red-600" : "text-emerald-600"} />
                      </div>
                      <p className="font-serif italic text-3xl font-bold mt-2 text-[#094D2B]">
                        {stats.totalRequests > 0 ? ((stats.failedRequests / stats.totalRequests) * 100).toFixed(1) : "0.0"}%
                      </p>
                      <span className="font-mono text-[9px] mt-1 block text-gray-500">
                        累计 {stats.failedRequests || 0} 个异常失败
                      </span>
                    </div>

                    <div className="border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24]">
                      <div className="flex justify-between items-start opacity-60">
                        <span className="font-mono text-[10px] uppercase font-bold tracking-wider">最近平均延时 (Avg Latency)</span>
                        <Clock size={16} className="text-[#094D2B]" />
                      </div>
                      <p className="font-serif italic text-3xl font-bold mt-2 text-[#094D2B]">
                        {stats.totalRequests - stats.failedRequests > 0 
                          ? Math.round(stats.totalResponseTimes / (stats.totalRequests - stats.failedRequests)) 
                          : 200} ms
                      </p>
                      <span className="font-mono text-[9px] text-[#A3A3A3] mt-1 block">自启以来活动节点极速响应</span>
                    </div>
                  </div>

                  {/* Recharts Area Chart for API Traffic metrics */}
                  <div className="border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24] space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <BarChart2 size={16} className="text-[#094D2B]" />
                        <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-[#1E2E24]">接口流量及平均响应监控 (REAL-TIME CONCURRENCY & LATENCY)</h3>
                      </div>
                      <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-bold animate-pulse">● 监听在线 (LIVE FEED)</span>
                    </div>
                
                    {stats.statsHistory && stats.statsHistory.length > 0 ? (
                       <div className="h-64 sm:h-72 w-full font-mono text-[10px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.statsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#094D2B" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#094D2B" stopOpacity={0.01}/>
                              </linearGradient>
                              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFF2EE" />
                            <XAxis dataKey="timestamp" stroke="#888888" tickLine={false} />
                            <YAxis yAxisId="left" stroke="#094D2B" tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" stroke="#10B981" tickLine={false} />
                            <Tooltip contentStyle={{ background: '#FFF', border: '2px solid #1E2E24' }} />
                            <Area yAxisId="left" type="monotone" dataKey="requests" name="请求笔数/分" stroke="#094D2B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRequests)" />
                            <Area yAxisId="right" type="monotone" dataKey="avgLatency" name="平均响应(ms)" stroke="#10B981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorLatency)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs opacity-50 font-mono">统计服务加载中...</div>
                    )}
                  </div>

                  {/* Dashboard lower sections: Providers summary & Recent traffic log feed */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Active Provider Nodes list */}
                    <div className="lg:col-span-7 border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24] space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="border-b-2 border-gray-100 pb-2 flex items-center justify-between">
                          <span className="font-mono text-xs uppercase tracking-widest font-bold text-[#094D2B]">接入服务商可用池 (PROVIDER POOL)</span>
                          <span className="font-mono text-[9px] opacity-70">负载算法: {config.settings.strategy}</span>
                        </div>
                        
                        {config.keys.length === 0 ? (
                          <div className="p-8 text-center text-xs opacity-40 font-mono border border-dashed rounded font-bold">
                            无可用的活跃端点。请在左上角或“路由端点”栏中添加多服务密钥！
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto pr-1">
                            {config.keys.map(key => {
                              const usedPercent = key.quotaLimit ? Math.round(((key.quotaUsed || 0) / key.quotaLimit) * 100) : 0;
                              const badge = getProviderBadge(key.endpoint);
                              return (
                                <div key={key.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-[#EBF5EE]/30 transition-colors px-1">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${!key.enabled ? 'bg-gray-300' : key.status === 'active' ? 'bg-emerald-500 animate-pulse' : key.status === 'rate-limited' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`}></span>
                                    <div className="truncate min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="font-serif italic text-sm font-bold truncate text-[#1E2E24]">{key.name}</p>
                                        <span className={`px-1.5 py-0.2 border text-[8px] font-mono rounded-full font-bold scale-90 ${badge.bg}`}>
                                          {badge.name}
                                        </span>
                                      </div>
                                      <p className="font-mono text-[9px] text-gray-500 truncate shrink-0 mt-1">{key.endpoint || 'Built-in Endpoints'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0 font-mono text-[10px]">
                                    <div className="text-right">
                                      <span className="opacity-55 text-[9px] font-bold">RPM</span>
                                      <p className="font-bold text-[#094D2B]">{key.rpmLimit || '∞'}</p>
                                    </div>
                                    <div className="text-right w-20">
                                      <span className="opacity-55 text-[9px] font-bold">已耗额度</span>
                                      <p className="font-bold text-gray-800">{key.quotaLimit ? `${usedPercent}%` : '不限'}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-[#EBF5EE] border border-[#BCE5CC] text-[#064E3B] p-2.5 font-mono text-[9px] opacity-90 flex justify-between items-center shrink-0 mt-4 rounded">
                        <span>💡 网关已通过安全策略对多端点进行降级过滤与负载均衡调度。</span>
                        <span className="font-bold hover:underline cursor-pointer text-[#0A3D23]" onClick={() => setViewMode('endpoints')}>分配管理 &rarr;</span>
                      </div>
                    </div>
 
                    {/* Recent Transactions Feed */}
                    <div className="lg:col-span-5 border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24] space-y-4">
                      <div className="border-b-2 border-gray-100 pb-2 flex items-center justify-between">
                        <span className="font-mono text-xs uppercase tracking-widest font-bold text-[#094D2B]">网关实时流水 (LIVE STREAM)</span>
                        <Terminal size={12} className="text-[#094D2B] opacity-70 animate-bounce" />
                      </div>
                      
                      {globalLogs.length === 0 ? (
                        <div className="p-8 text-center text-xs opacity-40 font-mono italic">
                          等待第一笔并发 API 穿透请求流... (Awaiting traffic)
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-[11px] font-mono">
                          {globalLogs.slice(0, 8).map((log, idx) => {
                            const isErr = log.status >= 400;
                            return (
                              <div key={log.id || idx} className="p-2 border bg-[#EFF2EF]/50 border-gray-100 flex items-center justify-between hover:bg-white transition-colors">
                                <div className="min-w-0 flex-1 mr-2 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="bg-[#094D2B] text-white px-1 text-[8px] font-bold rounded uppercase tracking-wider">{log.method}</span>
                                    <span className="truncate max-w-[150px] font-bold text-gray-700">{log.model}</span>
                                  </div>
                                  <p className="text-[9px] text-gray-400 truncate">{log.path} &middot; {log.keyName}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`px-1 rounded text-[9px] font-bold ${isErr ? "bg-red-100 text-red-700 border border-red-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"}`}>
                                    {log.status}
                                  </span>
                                  <p className="text-[8px] opacity-40 mt-0.5">{log.duration ? `${log.duration}ms` : '100ms'}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : viewMode === 'endpoints' ? (
                <motion.div key="endpoints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {config.keys.map((key) => (
                    <React.Fragment key={key.id}>
                    <motion.div 
                      key={key.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group bg-white border-2 border-[#1E2E24] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:bg-[#EBF5EE]/10 shadow-[3px_3px_0px_0px_#1E2E24] ${!key.enabled ? 'grayscale opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button 
                          onClick={() => toggleKey(key.id, !key.enabled)}
                          className={`w-10 h-10 border-2 border-[#1E2E24] flex items-center justify-center transition-colors shadow-sm cursor-pointer ${key.enabled ? (key.status === 'circuit-broken' || key.status === 'error' ? 'bg-red-500 text-white border-red-700 font-bold' : 'bg-emerald-600 text-white border-emerald-800 font-bold') : 'bg-gray-200 text-gray-500'}`}
                        >
                          <Key size={18} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => openEditForm(key)} className="font-serif italic text-lg leading-tight hover:underline text-left truncate font-bold text-[#094D2B]">
                              {key.name}
                            </button>
                            {(() => {
                              const badge = getProviderBadge(key.endpoint);
                              return (
                                <span className={`px-2 py-0.5 border text-[9px] font-mono rounded-full font-bold ${badge.bg}`}>
                                  {badge.name}
                                </span>
                              );
                            })()}
                            {key.modelFilters && key.modelFilters.length > 0 && (
                              <span className="px-1.5 py-0.5 border border-[#BCE5CC] bg-[#EBF5EE] text-[#0A3D23] text-[8px] font-mono rounded font-bold">路由过滤</span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] opacity-65 truncate flex items-center gap-2 mt-1">
                            <span className="truncate max-w-[200px] text-gray-500">{key.endpoint || (config.settings.defaultEndpoint + ' (系统默认)')}</span>
                            {key.rpmLimit ? <span className="text-emerald-700 font-bold">RPM: {key.rpmLimit}</span> : null}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 font-mono text-sm shrink-0">
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
                            <span className="hidden lg:inline text-xs uppercase font-bold text-gray-700">
                              {key.status === 'active' ? '在线' : key.status === 'rate-limited' ? '限流冷却中' : key.status === 'error' ? '异常' : key.status === 'circuit-broken' ? '已熔断' : '未知状态'}
                            </span>
                            {(key.status === 'circuit-broken' || key.status === 'rate-limited') && (
                              <button 
                                onClick={() => resetKeyStatus(key.id)}
                                className="text-[8px] underline text-red-750 hover:text-red-900 font-bold"
                              >
                                手动恢复
                              </button>
                            )}
                          </div>
                        </div>

                        {key.quotaLimit ? (
                          <div className="flex flex-col items-end sm:w-28 text-right">
                             <span className="text-[10px] opacity-40 uppercase leading-none mb-1 font-bold">剩余额度</span>
                             <div className="w-full h-1 bg-[#EFF2EF] rounded-full overflow-hidden mb-1 border select-none font-bold">
                                <div 
                                  className="h-full bg-[#094D2B] transition-all" 
                                  style={{ width: `${Math.max(0, Math.min(100, (1 - (key.quotaUsed || 0) / key.quotaLimit) * 100))}%` }}
                                />
                             </div>
                             <span className="numeric text-[10px] font-bold text-[#094D2B]">{Math.max(0, key.quotaLimit - (key.quotaUsed || 0))}/{key.quotaLimit}</span>
                          </div>
                        ) : null}

                        <div className="flex flex-col items-end sm:w-24">
                          <span className="text-[10px] opacity-40 uppercase leading-none mb-1 font-bold">成功/总数</span>
                          <span className="numeric text-[11px] font-bold">{(key.useCount || 0) - (key.errorCount || 0)}/{key.useCount || 0}</span>
                        </div>

                        <div className="flex flex-col items-end sm:w-32 hidden sm:flex">
                          <span className="text-[10px] opacity-40 uppercase leading-none mb-1 font-bold">最后透传时间</span>
                          <span className="text-[11px] truncate w-full text-right text-gray-650">
                            {key.lastUsed ? new Date(key.lastUsed).toLocaleTimeString() : '从未调用'}
                          </span>
                        </div>

                        <div className="flex gap-1">
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
                            className={`p-2 transition-colors border rounded hover:bg-[#EBF5EE] ${availableModels[key.id] ? 'bg-[#094D2B] border-[#094D2B] text-white' : 'border-gray-200'}`}
                            title={availableModels[key.id] ? "收起模型列表" : (key.confirmedModels ? "查看已确认模型" : "查询模型")}
                          >
                            <Database size={17} className={fetchingModels === key.id ? "animate-spin" : ""} />
                          </button>

                          <button 
                            onClick={() => setShowLogs(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                            className={`p-2 transition-colors border rounded hover:bg-[#EBF5EE] ${showLogs[key.id] ? 'bg-[#094D2B] border-[#094D2B] text-white' : 'border-gray-200'}`}
                            title="查看最后 3 次调用日志"
                          >
                            <History size={17} />
                          </button>

                          <button 
                            onClick={() => deleteKey(key.id)}
                            className="p-2 text-red-600 border border-gray-200 rounded hover:bg-red-50 hover:border-red-200 transition-colors"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                    
                    {showLogs[key.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mx-4 mb-3 mt-[-8px] bg-[#15231B] border-2 border-[#1E2E24] text-[#EFF5EE] p-4 text-[10px] font-mono shadow-[3px_3px_0px_0px_#1E2E24]"
                      >
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-emerald-800/60 uppercase tracking-widest text-[8px] font-bold text-emerald-400">
                          <span>并发调用追踪 (CONCURRENT CALL TRACKER)</span>
                          <span>最近 3 次流水</span>
                        </div>
                        {key.lastLogs && key.lastLogs.length > 0 ? (
                          <div className="space-y-2">
                            {key.lastLogs.map((log, idx) => (
                              <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-950/40 pb-1 last:border-0 ${log.status >= 400 ? 'text-red-400' : ''}`}>
                                <div className="flex items-center gap-2">
                                  <span className={log.status >= 400 ? 'text-red-400 font-bold' : 'text-emerald-400'}>[{log.status}]</span>
                                  <span className="opacity-70">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                  <span className="bg-white/10 px-1 rounded text-white truncate max-w-[150px]">{log.model}</span>
                                  {log.status >= 400 && (
                                    <span className="font-bold text-[8px] border border-red-400 px-1 rounded">
                                      {getErrorDescription(log.status)}
                                    </span>
                                  )}
                                </div>
                                <span className="opacity-50 truncate sm:text-right">PATH: {log.path}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="opacity-40 italic py-2">无历史调用记录</div>
                        )}
                      </motion.div>
                    )}

                    {availableModels[key.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mx-4 mb-4 mt-[-8px] bg-[#EFF2EF] border-2 border-[#1E2E24] p-4 text-[10px] font-mono shadow-[3px_3px_0px_0px_#1E2E24]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="opacity-70 font-bold text-[#094D2B]">可用模型组 ({availableModels[key.id].length}):</span>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => fetchModelsForKey(key.id)}
                              disabled={fetchingModels === key.id}
                              className="underline hover:no-underline flex items-center gap-1 font-bold text-[#094D2B]"
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
                              className="underline hover:no-underline font-bold text-[#094D2B]"
                            >
                              复制全部
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {availableModels[key.id].map(modelId => {
                            const detail = key.modelDetails?.[modelId];
                            const ctxLen = detail?.contextLength;
                            const ctx = ctxLen ? (ctxLen >= 1024 * 1024 ? `${(ctxLen / (1024 * 1024)).toFixed(0)}M` : ctxLen >= 1024 ? `${(ctxLen / 1024).toFixed(0)}K` : ctxLen.toString()) : null;
                            const modelType = detectModelType(modelId);
                            return (
                              <span key={modelId} className="px-1.5 py-0.5 bg-white border border-[#1E2E24]/20 rounded select-all flex items-center gap-1.5 text-[11px] hover:border-[#1E2E24]">
                                <span className="truncate text-gray-800 font-medium">{modelId}</span>
                                {ctx && <span className="opacity-60 text-[8px] bg-[#EBF5EE] text-[#0A3D23] px-1 rounded font-bold">{ctx}</span>}
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
                  <div className="border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-serif italic text-base font-bold text-[#094D2B]">端点聚合模型中心 (Aggregated Model Hub)</h3>
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
                    <div className="w-full sm:w-72 relative">
                      <input
                        type="search"
                        placeholder="关键字模糊检索大模型 (如 qwen, deepseek)..."
                        value={modelsSearch}
                        onChange={(e) => setModelsSearch(e.target.value)}
                        className="w-full border-2 border-[#1E2E24]/30 focus:border-[#094D2B] p-2 pl-3 text-xs font-mono focus:ring-0 focus:outline-none focus:bg-[#EBF5EE]/10 rounded font-semibold"
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
                        <div key={modelId} className="bg-white border-2 border-[#1E2E24] shadow-[4px_4px_0px_0px_#1E2E24] overflow-hidden">
                          <div className="bg-[#094D2B] text-white p-2.5 px-4 flex justify-between items-center text-[10px] uppercase font-mono tracking-widest">
                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                              <span className="bg-white/20 px-2 py-0.5 rounded text-white flex items-center gap-2 font-bold">
                                模型: {modelId}
                                {ctx && <span className="bg-emerald-900 border border-emerald-700 px-1 rounded text-[8px]">{ctx} CTX</span>}
                              </span>
                              <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-white text-[8px] tracking-normal font-sans font-bold">
                                {modelType.label}
                              </span>
                              <span className="opacity-75 text-[9px] font-bold">{keysForModel.length} 个端点支持此模型路由</span>
                            </div>
                          </div>
                          <div className="divide-y divide-[#1E2E24]/10">
                            {keysForModel.map(key => (
                               <div key={key.id} className="p-3 px-4 flex items-center justify-between text-xs transition-colors hover:bg-[#EBF5EE]/30">
                                 <div className="flex items-center gap-3 font-semibold">
                                   <div className={`w-2.5 h-2.5 rounded-full ${key.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                   <span className="font-serif italic text-sm font-bold text-gray-850">{key.name}</span>
                                   <span className="opacity-55 font-mono text-[9px] truncate max-w-[150px]">{key.endpoint || '系统置顶节点'}</span>
                                 </div>
                                 <div className="flex items-center gap-8 font-mono text-[10px]">
                                   {key.quotaLimit ? (
                                     <div className="text-right">
                                       <span className="opacity-55 mr-2 font-bold">剩余可用额度:</span>
                                       <span className="font-bold text-[#094D2B]">{Math.max(0, key.quotaLimit - (key.quotaUsed || 0))} / {key.quotaLimit}</span>
                                     </div>
                                   ) : <span className="opacity-40 uppercase tracking-widest text-[9px] font-bold text-emerald-700">不限配额</span>}
                                   
                                   <div className="text-right w-20 font-bold">
                                     <span className="opacity-55 mr-2">RPM:</span>
                                     <span className="font-bold">{key.rpmLimit || '∞'}</span>
                                   </div>
                                 </div>
                               </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </motion.div>
              ) : viewMode === 'logs' ? (
                <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="border-2 border-[#1E2E24] bg-white p-4 shadow-[4px_4px_0px_0px_#1E2E24] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-gray-100 pb-2">
                      <span className="font-mono text-xs uppercase tracking-widest font-bold text-[#094D2B]">API 流水穿透总日志 (GLOBAL API PROXY LOGS)</span>
                      <span className="font-mono text-[9px] opacity-60">实时显示最后 100 条请求记录 (Awaiting incoming request payloads)</span>
                    </div>

                    {globalLogs.length === 0 ? (
                      <div className="p-12 text-center text-xs opacity-40 font-mono italic">
                        没有近期接口代理请求日志。在左侧使用命令行请求 API 接口后，日志将在这里实时渲染。
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-xs">
                          <thead>
                            <tr className="border-b-2 border-[#1E2E24]/30 bg-[#EFF2EF] text-[#094D2B] text-[10px] uppercase font-bold">
                              <th className="p-2 select-none">时间 (Time)</th>
                              <th className="p-2 select-none">方法 (Method)</th>
                              <th className="p-2 select-none">请求模型 (Model Keyed)</th>
                              <th className="p-2 select-none">端点源 (Node Key)</th>
                              <th className="p-2 select-none">接口路由 (Path)</th>
                              <th className="p-2 text-right select-none">耗时 (Latency)</th>
                              <th className="p-2 text-center select-none">状态码 (Status)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {globalLogs.map((log, idx) => {
                              const date = new Date(log.timestamp);
                              const timeStr = date.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
                              const isErr = log.status >= 400;
                              return (
                                <tr key={log.id || idx} className="hover:bg-[#EBF5EE]/20 transition-colors">
                                  <td className="p-2 text-[10px] opacity-50 whitespace-nowrap">{timeStr}</td>
                                  <td className="p-2"><span className="bg-[#094D2B] text-white px-1.5 py-0.5 rounded text-[8px] font-bold">{log.method}</span></td>
                                  <td className="p-2 font-bold truncate max-w-[124px] text-[#1E2E24]" title={log.model}>{log.model}</td>
                                  <td className="p-2 font-serif italic text-[#094D2B]" title={log.keyName}>{log.keyName}</td>
                                  <td className="p-2 opacity-70 truncate max-w-[140px] text-gray-500" title={log.path}>{log.path}</td>
                                  <td className="p-2 text-right text-[10px] font-bold text-gray-700">{log.duration ? `${log.duration}ms` : '150ms'}</td>
                                  <td className="p-2 text-center">
                                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${isErr ? "bg-red-100 text-red-700 border border-red-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"}`}>
                                      {log.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
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
                            name: prev.name && 
                                  !prev.name.startsWith("通用") && 
                                  !prev.name.includes("NVIDIA") && 
                                  !prev.name.includes("SiliconFlow") && 
                                  !prev.name.includes("Groq") && 
                                  !prev.name.includes("SambaNova") && 
                                  !prev.name.includes("DeepSeek") && 
                                  !prev.name.includes("Zhipu") && 
                                  !prev.name.includes("Gemini") && 
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
                                checked={newKey.modelFilters.includes(model)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setNewKey({...newKey, modelFilters: [...newKey.modelFilters, model]});
                                  } else {
                                    setNewKey({...newKey, modelFilters: newKey.modelFilters.filter(m => m !== model)});
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
