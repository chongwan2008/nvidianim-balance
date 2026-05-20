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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [showSettings, setShowSettings] = useState(false);
  const [fetchingModels, setFetchingModels] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [showLogs, setShowLogs] = useState<Record<string, boolean>>({});
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  
  const [formAvailableModels, setFormAvailableModels] = useState<string[]>([]);
  const [formModelDetails, setFormModelDetails] = useState<Record<string, { contextLength?: number }>>({});
  const [formFetchingModels, setFormFetchingModels] = useState(false);
  const [formModelSearch, setFormModelSearch] = useState('');

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
  const [viewMode, setViewMode] = useState<'endpoints' | 'models' | 'playground'>('endpoints');

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

  const allModels = Array.from(new Set(config.keys.flatMap(k => k.confirmedModels || []) as string[])).sort();

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
        
        const resJson = await response.json();
        const b64 = resJson.data?.[0]?.b64_json;
        const url = resJson.data?.[0]?.url;
        
        if (b64) {
          setPlaygroundImageBase64(b64);
        } else if (url) {
          setPlaygroundImageUrl(url);
        } else {
          throw new Error("没能从 NIM 端点返回有效的图像数据");
        }
        
        const activeKey = config.keys.find(k => k.confirmedModels?.includes(playgroundModel));
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
        
        const activeKey = config.keys.find(k => k.confirmedModels?.includes(playgroundModel));
        
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
          const resJson = await response.json();
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
      const response = await fetch('/api/config', {
        headers: { 'x-admin-password': localStorage.getItem('nim_admin_password') || '' }
      });
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await response.json();
      setConfig(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchModelsForKey = async (id: string) => {
    setFetchingModels(id);
    try {
      const response = await fetch(`/api/models/${id}`, {
        headers: { 'x-admin-password': localStorage.getItem('nim_admin_password') || '' }
      });
      const data = await response.json();
      if (data.data) {
        setAvailableModels(prev => ({
          ...prev,
          [id]: data.data.map((m: any) => m.id)
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
    setFormAvailableModels(key.modelFilters || []); // At least show selected
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
      const data = await response.json();
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
      const data = await response.json();
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
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {!authenticated ? (
        <div className="min-h-screen flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#141414] w-full max-w-md shadow-[8px_8px_0px_0px_#141414] overflow-hidden"
          >
            <div className="bg-[#141414] text-[#E4E3E0] p-4 flex justify-between items-center font-mono text-xs uppercase tracking-widest">
              <span>ADMIN_LOGIN</span>
              <Activity size={16} />
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <h2 className="font-serif italic text-2xl">管理员登录</h2>
                <p className="text-sm opacity-50">请输入后台管理密码以访问负载均衡面板。</p>
              </div>
              <div className="space-y-2">
                <input 
                  type="password"
                  placeholder="Password"
                  className="w-full border border-[#141414] p-3 font-mono focus:outline-none focus:bg-[#F5F5F5]"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin(password)}
                />
                {loginError && <p className="text-red-600 text-xs font-mono">{loginError}</p>}
              </div>
              <button 
                onClick={() => handleLogin(password)}
                className="w-full bg-[#141414] text-[#E4E3E0] p-4 font-mono text-sm uppercase tracking-widest hover:bg-[#333] transition-colors"
              >
                进入面板
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-[#E4E3E0] sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#141414] rounded">
                <Activity className="text-[#E4E3E0] w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif italic text-2xl tracking-tight">NVIDIA NIM 负载均衡器 <span className="text-xs opacity-50 not-italic ml-1">v1.4.0</span></h1>
                <p className="font-mono text-[10px] uppercase opacity-50 tracking-widest leading-none">高可用代理接口</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  localStorage.removeItem('nim_admin_password');
                  setAuthenticated(false);
                }}
                className="font-mono text-[10px] uppercase underline hover:no-underline"
              >
                退出
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={openAddForm}
                className="p-3 bg-[#141414] text-[#E4E3E0] hover:scale-105 transition-transform flex items-center gap-2 font-mono text-sm"
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
            <div key={i} className="bg-white border border-[#141414] p-4 flex items-center justify-between shadow-[2px_2px_0px_0px_#141414]">
              <div>
                <p className="font-mono text-[10px] uppercase opacity-50">{stat.label}</p>
                <p className="text-xl font-mono leading-none">{stat.value}</p>
              </div>
              <stat.icon size={20} className="opacity-20" />
            </div>
          ))}
          <button 
            onClick={runAllHealthChecks}
            disabled={isCheckingHealth}
            className="group bg-white border border-[#141414] p-4 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors disabled:opacity-50"
          >
            <ShieldCheck size={20} className={isCheckingHealth ? "animate-pulse mb-1" : "mb-1 group-hover:scale-110 transition-transform"} />
            <span className="font-mono text-[10px] uppercase tracking-widest">{isCheckingHealth ? '检查中...' : '健康检查'}</span>
          </button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.section 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-white border border-[#141414] p-6 space-y-6 shadow-[4px_4px_0px_0px_#141414]"
            >
              <div className="flex items-center justify-between border-b border-[#141414] pb-2 text-xs font-mono uppercase">
                <span>全局策略配置</span>
                <span className="opacity-40">GLOBAL_CONFIG.JSON</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-50 block">调度策略 (Strategy)</label>
                  <select 
                    value={config.settings.strategy}
                    onChange={(e) => updateSettings({ strategy: e.target.value as any })}
                    className="w-full border border-[#141414] p-2 font-mono text-sm focus:outline-none"
                  >
                    <option value="round-robin">轮询 (Round Robin)</option>
                    <option value="random">随机 (Random)</option>
                    <option value="least-used">最少使用 (Least Used)</option>
                    <option value="weighted">比例分配 (Weighted - 基于额度占比)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-50 block">全局 QPS 限制 (0 为不限制)</label>
                  <input 
                    type="number"
                    value={config.settings.globalQpsLimit}
                    onChange={(e) => updateSettings({ globalQpsLimit: parseInt(e.target.value) })}
                    className="w-full border border-[#141414] p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-50 block">熔断阈值 (连续失败次数)</label>
                  <input 
                    type="number"
                    value={config.settings.circuitBreakerThreshold}
                    onChange={(e) => updateSettings({ circuitBreakerThreshold: parseInt(e.target.value) })}
                    className="w-full border border-[#141414] p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase opacity-50 block">自动健康检查间隔 (分钟, 0 为关闭)</label>
                  <input 
                    type="number"
                    value={config.settings.healthCheckInterval || 0}
                    onChange={(e) => updateSettings({ healthCheckInterval: parseInt(e.target.value) })}
                    className="w-full border border-[#141414] p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-3">
                  <label className="font-mono text-[10px] uppercase opacity-50 block">默认 NIM 端点 (Default Endpoint)</label>
                  <input 
                    type="url"
                    value={config.settings.defaultEndpoint}
                    onChange={(e) => updateSettings({ defaultEndpoint: e.target.value })}
                    className="w-full border border-[#141414] p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-3">
                  <label className="font-mono text-[10px] uppercase opacity-50 block">负载均衡器访问密钥 (Master Key - 留空则不校验)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="设置一个访问此代理所需的 Key"
                      value={config.settings.masterKey || ''}
                      onChange={(e) => updateSettings({ masterKey: e.target.value })}
                      className="flex-1 border border-[#141414] p-2 font-mono text-sm focus:outline-none"
                    />
                    <button 
                      onClick={() => updateSettings({ masterKey: Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12) })}
                      className="px-4 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors font-mono text-[10px]"
                    >
                      生成
                    </button>
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase opacity-50">负载均衡器管理密码</label>
                    <input 
                      type="password"
                      placeholder="设置后台管理密码"
                      value={config.settings.adminPassword || ''}
                      onChange={(e) => updateSettings({ adminPassword: e.target.value })}
                      className="w-full border border-[#141414] p-2 font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Proxy Info Card */}
        <section className="bg-white border border-[#141414] p-6 space-y-4 shadow-[4px_4px_0px_0px_#141414]">
          <div className="flex items-center justify-between border-b border-[#141414] pb-4">
            <div className="flex items-center gap-2 capitalize">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="font-serif italic text-xl">代理配置说明</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-mono text-xs uppercase">系统在线</span>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm opacity-80 leading-relaxed md:max-w-2xl">
              在您的应用程序中使用下方的负载均衡代理 URL。请求将通过轮询策略自动分配到您活跃的 NIM 端点。兼容 OpenAI API 格式。
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 font-mono text-sm bg-[#F5F5F5] border border-[#141414] p-3 flex items-center justify-between group">
                <code className="break-all">{proxyUrl}</code>
                <button 
                  onClick={copyProxyUrl}
                  className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors shrink-0"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
            {config.settings.masterKey && (
              <div className="bg-[#141414] text-[#E4E3E0] p-3 font-mono text-[10px] space-y-1">
                <p className="opacity-50">所需请求头 (Required Header):</p>
                <code className="block select-all">Authorization: Bearer {config.settings.masterKey}</code>
              </div>
            )}
          </div>
        </section>

        {/* Endpoints List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#141414] pb-2">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setViewMode('endpoints')}
                className={`font-mono text-xs uppercase tracking-widest flex items-center gap-2 pb-1 border-b-2 transition-all ${viewMode === 'endpoints' ? 'border-[#141414] opacity-100' : 'border-transparent opacity-30 hover:opacity-100'}`}
              >
                <Database size={14} /> 端点视图 (Endpoints)
              </button>
              <button 
                onClick={() => setViewMode('models')}
                className={`font-mono text-xs uppercase tracking-widest flex items-center gap-2 pb-1 border-b-2 transition-all ${viewMode === 'models' ? 'border-[#141414] opacity-100' : 'border-transparent opacity-30 hover:opacity-100'}`}
              >
                <Activity size={14} /> 模型视图 (Grouped)
              </button>
              <button 
                onClick={() => setViewMode('playground')}
                className={`font-mono text-xs uppercase tracking-widest flex items-center gap-2 pb-1 border-b-2 transition-all ${viewMode === 'playground' ? 'border-[#141414] opacity-100' : 'border-transparent opacity-30 hover:opacity-100'}`}
              >
                <Sparkles size={14} /> 极简沙盒 (Playground)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {viewMode === 'endpoints' ? (
                <motion.div key="endpoints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  {config.keys.map((key) => (
                    <React.Fragment key={key.id}>
                    <motion.div 
                      key={key.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group bg-white border border-[#141414] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:bg-[#F5F5F5] ${!key.enabled ? 'grayscale opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button 
                          onClick={() => toggleKey(key.id, !key.enabled)}
                          className={`w-10 h-10 border border-[#141414] flex items-center justify-center transition-colors ${key.enabled ? (key.status === 'circuit-broken' || key.status === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'bg-gray-200'}`}
                        >
                          <Key size={18} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditForm(key)} className="font-serif italic text-lg leading-tight hover:underline text-left truncate">
                              {key.name}
                            </button>
                            {key.modelFilters && key.modelFilters.length > 0 && (
                              <span className="px-1 bg-[#141414] text-[#E4E3E0] text-[8px] font-mono rounded">SMART_ROUTING</span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] opacity-50 truncate flex items-center gap-2">
                            <span className="truncate max-w-[200px]">{key.endpoint || (config.settings.defaultEndpoint + ' (默认)')}</span>
                            {key.rpmLimit ? <span className="text-blue-600">RPM: {key.rpmLimit}</span> : null}
                          </p>
                        </div>
                      </div>

                        <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 font-mono text-sm shrink-0">
                        <div className="flex items-center gap-2">
                          {key.status === 'active' ? (
                            <CheckCircle2 size={16} className="text-green-600" />
                          ) : key.status === 'circuit-broken' ? (
                            <AlertCircle size={16} className="text-red-700 animate-pulse" />
                          ) : (
                            <AlertCircle size={16} className="text-red-600" />
                          )}
                          <div className="flex flex-col">
                            <span className="hidden lg:inline text-xs uppercase">
                              {key.status === 'active' ? '活跃' : key.status === 'error' ? '错误' : key.status === 'circuit-broken' ? '熔断' : '限流'}
                            </span>
                            {key.status === 'circuit-broken' && (
                              <button 
                                onClick={() => resetKeyStatus(key.id)}
                                className="text-[8px] underline opacity-50 hover:opacity-100"
                              >
                                手动恢复
                              </button>
                            )}
                          </div>
                        </div>

                        {key.quotaLimit ? (
                          <div className="flex flex-col items-end sm:w-28 text-right">
                             <span className="text-[10px] opacity-40 uppercase leading-none mb-1">额度 (Remaining)</span>
                             <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden mb-1">
                                <div 
                                  className="h-full bg-[#141414] transition-all" 
                                  style={{ width: `${Math.max(0, Math.min(100, (1 - (key.quotaUsed || 0) / key.quotaLimit) * 100))}%` }}
                                />
                             </div>
                             <span className="numeric text-[10px]">{Math.max(0, key.quotaLimit - (key.quotaUsed || 0))}/{key.quotaLimit}</span>
                          </div>
                        ) : null}

                        <div className="flex flex-col items-end sm:w-24">
                          <span className="text-[10px] opacity-40 uppercase leading-none mb-1">成功/总数</span>
                          <span className="numeric text-[11px]">{(key.useCount || 0) - (key.errorCount || 0)}/{key.useCount || 0}</span>
                        </div>

                        <div className="flex flex-col items-end sm:w-32 hidden sm:flex">
                          <span className="text-[10px] opacity-40 uppercase leading-none mb-1">最后访问</span>
                          <span className="text-[11px] truncate w-full text-right">
                            {key.lastUsed ? new Date(key.lastUsed).toLocaleTimeString() : '从未'}
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
                                setAvailableModels(prev => ({ ...prev, [key.id]: key.confirmedModels! }));
                              } else {
                                fetchModelsForKey(key.id);
                              }
                            }}
                            className={`p-2 transition-colors ${availableModels[key.id] ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-black/5'}`}
                            title={availableModels[key.id] ? "收起模型列表" : (key.confirmedModels ? "查看已确认模型" : "查询模型")}
                          >
                            <Database size={18} className={fetchingModels === key.id ? "animate-spin" : ""} />
                          </button>

                          <button 
                            onClick={() => setShowLogs(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                            className={`p-2 transition-colors ${showLogs[key.id] ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-black/5'}`}
                            title="查看最后 3 次调用日志"
                          >
                            <History size={18} />
                          </button>

                          <button 
                            onClick={() => deleteKey(key.id)}
                            className="p-2 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                    
                    {showLogs[key.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mx-4 mb-2 mt-[-8px] bg-[#141414] text-[#E4E3E0] p-4 text-[10px] font-mono shadow-[2px_2px_0px_0px_#141414]"
                      >
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10 uppercase tracking-widest text-[8px]">
                          <span>近期调用日志 (RECENT_LOGS)</span>
                          <span>MAX_3</span>
                        </div>
                        {key.lastLogs && key.lastLogs.length > 0 ? (
                          <div className="space-y-2">
                            {key.lastLogs.map((log, idx) => (
                              <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-1 last:border-0 ${log.status >= 400 ? 'text-red-400' : ''}`}>
                                <div className="flex items-center gap-2">
                                  <span className={log.status >= 400 ? 'text-red-400 font-bold' : 'text-green-400'}>[{log.status}]</span>
                                  <span className="opacity-70">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                  <span className="bg-white/10 px-1 rounded truncate max-w-[150px]">{log.model}</span>
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
                        className="mx-4 mb-4 mt-[-8px] bg-white border-x border-b border-[#141414] p-4 text-[10px] font-mono shadow-[2px_2px_0px_0px_#141414]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="opacity-50">可用模型 ({availableModels[key.id].length}):</span>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => fetchModelsForKey(key.id)}
                              disabled={fetchingModels === key.id}
                              className="underline hover:no-underline flex items-center gap-1"
                            >
                              {fetchingModels === key.id ? <RefreshCw size={10} className="animate-spin" /> : null}
                              更新列表
                            </button>
                            <button 
                              onClick={() => {
                                const models = availableModels[key.id].join(', ');
                                navigator.clipboard.writeText(models);
                                alert('模型列表已复制');
                              }}
                              className="underline hover:no-underline"
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
                              <span key={modelId} className="px-1.5 py-0.5 bg-[#F5F5F5] border border-[#141414]/10 rounded select-all flex items-center gap-1.5 text-[11px]">
                                <span className="truncate">{modelId}</span>
                                {ctx && <span className="opacity-40 text-[8px] bg-black/5 px-1 rounded">{ctx}</span>}
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
                  {/* Model Grouping View */}
                  {Array.from(new Set(config.keys.flatMap(k => k.confirmedModels || []) as string[])).sort().map((modelId: string) => {
                    const keysForModel = config.keys.filter(k => (k.confirmedModels || []).includes(modelId));
                    if (keysForModel.length === 0) return null;
                    
                    // Try to find context length from any key that has it
                    const sampleKey = keysForModel.find(k => k.modelDetails?.[modelId]?.contextLength);
                    const ctxLen = sampleKey?.modelDetails?.[modelId]?.contextLength;
                    const ctx = ctxLen ? (ctxLen >= 1024 * 1024 ? `${(ctxLen / (1024 * 1024)).toFixed(0)}M` : ctxLen >= 1024 ? `${(ctxLen / 1024).toFixed(0)}K` : ctxLen.toString()) : null;
                    const modelType = detectModelType(modelId);

                    return (
                      <div key={modelId} className="bg-white border border-[#141414] shadow-[4px_4px_0px_0px_#141414] overflow-hidden">
                        <div className="bg-[#141414] text-[#E4E3E0] p-2 px-4 flex justify-between items-center text-[10px] uppercase font-mono tracking-widest">
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            <span className="bg-white/20 px-2 py-0.5 rounded text-white flex items-center gap-2">
                              模型: {modelId}
                              {ctx && <span className="bg-white/10 px-1 rounded text-[8px]">{ctx} CTX</span>}
                            </span>
                            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-white text-[8px] tracking-normal font-sans">
                              {modelType.label}
                            </span>
                            <span className="opacity-50">{keysForModel.length} 个端点支持</span>
                          </div>
                        </div>
                        <div className="divide-y divide-[#141414]/10">
                          {keysForModel.map(key => (
                             <div key={key.id} className="p-3 px-4 flex items-center justify-between text-xs transition-colors hover:bg-gray-50">
                               <div className="flex items-center gap-3">
                                 <div className={`w-2 h-2 rounded-full ${key.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                 <span className="font-serif italic text-sm">{key.name}</span>
                                 <span className="opacity-40 font-mono text-[9px] truncate max-w-[150px]">{key.endpoint || 'DEFAULT'}</span>
                               </div>
                               <div className="flex items-center gap-8 font-mono text-[10px]">
                                 {key.quotaLimit ? (
                                   <div className="text-right">
                                     <span className="opacity-40 mr-2">剩余额度:</span>
                                     <span className="font-bold">{Math.max(0, key.quotaLimit - (key.quotaUsed || 0))} / {key.quotaLimit}</span>
                                   </div>
                                 ) : <span className="opacity-20 uppercase tracking-widest">不限制额度</span>}
                                 
                                 <div className="text-right w-20">
                                   <span className="opacity-40 mr-2">RPM:</span>
                                   <span>{key.rpmLimit || '∞'}</span>
                                 </div>
                               </div>
                             </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
                    <div className="border border-dashed border-[#141414] p-12 text-center space-y-4">
                      <Sparkles className="w-12 h-12 mx-auto opacity-20 animate-pulse" />
                      <p className="font-serif italic text-xl opacity-50">无可用的活端点模型以启动沙盒。</p>
                      <p className="text-xs opacity-40 max-w-md mx-auto">请先确保您已经添加了一个支持模型路由的 NVIDIA NIM 密钥，并成功“拉取模型列表”。</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Side: Parameters Form */}
                      <form onSubmit={handlePlaygroundSubmit} className="lg:col-span-5 space-y-6 bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
                        <div className="border-b border-[#141414] pb-4 flex items-center justify-between">
                          <span className="font-mono text-xs uppercase tracking-widest font-bold">配置测试面板 (PARAMS)</span>
                          <span className="font-mono text-[9px] bg-black text-white px-2 py-0.5 rounded uppercase">
                            {detectModelType(playgroundModel).label.split(" | ")[0]} Mode
                          </span>
                        </div>

                        {/* Model Selector */}
                        <div className="space-y-1">
                          <label className="font-mono text-[10px] uppercase opacity-50 block">选择测试模型</label>
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
                            className="w-full border border-[#141414] p-3 font-mono text-xs focus:outline-none focus:bg-gray-50"
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
                              <label className="font-mono text-[10px] uppercase opacity-50 block">系统 Prompt (System instructions)</label>
                              <textarea 
                                rows={2}
                                value={playgroundSystemPrompt}
                                onChange={(e) => setPlaygroundSystemPrompt(e.target.value)}
                                className="w-full border border-[#141414] p-2 font-mono text-xs focus:outline-none focus:bg-gray-50"
                              />
                            </div>

                            {/* Vision Model Image Upload Area */}
                            {(detectModelType(playgroundModel).label.includes("视觉") || detectModelType(playgroundModel).label.includes("Vision")) && (
                              <div className="space-y-1 bg-purple-50/40 p-4 border border-dashed border-purple-300 rounded">
                                <label className="font-mono text-[10px] uppercase text-purple-700 font-bold block flex items-center gap-1.5">
                                  <ImageIcon size={12} /> 视觉输入 (Vision/Multimodal Input)
                                </label>
                                
                                {!playgroundVisionImage ? (
                                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-200 hover:border-purple-400 bg-white p-4 rounded cursor-pointer transition-colors group">
                                    <Upload size={18} className="text-purple-400 group-hover:text-purple-600 mb-1.5 animate-bounce" />
                                    <span className="font-sans text-xs font-semibold text-purple-700 mb-0.5">点击或拖拽上传图片</span>
                                    <span className="text-[10px] text-gray-400 scale-95 origin-center font-mono">PNG, JPG, WEBP (最大 4MB)</span>
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={handleVisionImageUpload} 
                                      className="hidden" 
                                    />
                                  </label>
                                ) : (
                                  <div className="flex items-center gap-3 bg-white p-2 border border-purple-200 rounded">
                                    <img 
                                      src={playgroundVisionImage} 
                                      alt="Vision Input Preview" 
                                      className="w-12 h-12 object-cover rounded border border-[#141414]/10"
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
                                <label className="font-mono text-[10px] uppercase opacity-50 block">随机度 (Temperature): {playgroundTemperature}</label>
                                <input 
                                  type="range"
                                  min="0"
                                  max="2"
                                  step="0.1"
                                  value={playgroundTemperature}
                                  onChange={(e) => setPlaygroundTemperature(parseFloat(e.target.value))}
                                  className="w-full accent-[#141414]"
                                />
                              </div>
                              <div className="space-y-1 flex items-center justify-end border-t border-transparent pt-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    checked={playgroundStream}
                                    onChange={(e) => setPlaygroundStream(e.target.checked)}
                                    className="accent-[#141414]"
                                  />
                                  <span className="font-mono text-[10px] uppercase opacity-50">流式输出 Stream</span>
                                </label>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Image Model Controls */}
                            <div className="space-y-1">
                              <label className="font-mono text-[10px] uppercase opacity-50 block">图像尺寸 (Dimensions)</label>
                              <select 
                                value={playgroundImageSize}
                                onChange={(e) => setPlaygroundImageSize(e.target.value)}
                                className="w-full border border-[#141414] p-3 font-mono text-xs focus:outline-none focus:bg-gray-50"
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
                          <label className="font-mono text-[10px] uppercase opacity-50 block">
                            {detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? "生图提示词 (Prompt)" : "对话 Prompt"}
                          </label>
                          <textarea 
                            required
                            rows={4}
                            placeholder={detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? "一个精致的水彩画，画中是一个古朴的东方茶室，窗外桃花盛开，柔和的光线射入..." : "写一段关于人工智能高可用负载均衡器的诗吧..."}
                            value={playgroundPrompt}
                            onChange={(e) => setPlaygroundPrompt(e.target.value)}
                            className="w-full border border-[#141414] p-3 text-xs focus:outline-none focus:bg-gray-50 font-sans"
                          />
                        </div>

                        {/* Submit Button */}
                        <button 
                          type="submit"
                          disabled={playgroundLoading}
                          className="w-full bg-[#141414] text-[#E4E3E0] p-4 font-mono text-xs uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {playgroundLoading ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>模型计算中... / 正在响应</span>
                            </>
                          ) : (
                            <>
                              {detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? <Play size={14} /> : <Send size={14} />}
                              <span>
                                {detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? "生成图像" : "发送消息"}
                              </span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Right Side: Visual Output Window */}
                      <div className="lg:col-span-7 flex flex-col bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] min-h-[400px]">
                        <div className="border-b border-[#141414] pb-4 flex items-center justify-between mb-4">
                          <span className="font-mono text-xs uppercase tracking-widest font-bold">响应窗口 (LIVE_RESPONSE)</span>
                          {playgroundLogs && (
                            <span className="font-mono text-[9px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                              分流节点: {playgroundLogs.router} | {playgroundLogs.duration}ms {playgroundLogs.tokens ? `| Token: ${playgroundLogs.tokens}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Render Workspace */}
                        <div className="flex-1 flex flex-col min-h-[320px] bg-[#F5F5F5] border border-[#141414]/10 p-4 relative overflow-hidden font-mono text-xs rounded">
                          {playgroundLoading && !playgroundResponse && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 z-10 text-center p-6 bg-opacity-70">
                              <RefreshCw size={32} className="text-[#141414] animate-spin" />
                              <div className="space-y-1">
                                <p className="font-mono uppercase font-bold text-xs tracking-wider text-[#141414]">NIM_ROUTING_IN_PROGRESS</p>
                                <p className="text-[10px] opacity-60">正在调用高可用端点进行在线代理计算...</p>
                              </div>
                            </div>
                          )}

                          {!playgroundLoading && !playgroundResponse && !playgroundImageBase64 && !playgroundImageUrl ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                              <Sparkles size={28} className="mb-2" />
                              <p className="font-serif italic text-sm mb-1">等待接收 NIM 路由执行结果</p>
                              <p className="text-[10px]">在左侧输入指令，负载均衡器会自动分析并健康分流</p>
                            </div>
                          ) : detectModelType(playgroundModel).label.includes("生图") || detectModelType(playgroundModel).label.includes("Image") ? (
                            /* Image Output Frame */
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                              {(playgroundImageBase64 || playgroundImageUrl) ? (
                                <div className="space-y-4 w-full max-w-md flex flex-col items-center">
                                  <div className="relative group overflow-hidden border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] bg-white">
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
                                      download={`nvidia-nim-image-${Date.now()}.png`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] font-mono px-3 py-1 bg-white border border-[#141414] shadow-[1px_1px_0px_0px_#141414] hover:bg-black hover:text-white transition-colors flex items-center gap-1 leading-none uppercase font-bold"
                                    >
                                      <Download size={12} /> 下载图片
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                playgroundLoading && (
                                  <div className="flex-1 flex flex-col items-center justify-center bg-transparent py-12">
                                    <div className="w-16 h-16 border-2 border-dashed border-[#141414] rounded-full animate-spin flex items-center justify-center">
                                      <ImageIcon size={24} className="opacity-50" />
                                    </div>
                                    <p className="text-[10px] font-mono uppercase tracking-widest mt-4">Pencil Rendering...</p>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            /* Chat / Text Output Frame */
                            <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-[450px] bg-white p-4 border border-[#141414]/10 select-text select-all">
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
              <div className="border border-dashed border-[#141414] p-12 text-center space-y-4">
                <Settings className="w-12 h-12 mx-auto opacity-20" />
                <p className="font-serif italic text-xl opacity-50">未发现端点。请添加您的第一个 NVIDIA NIM 密钥以开始。</p>
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
            className="fixed inset-0 bg-[#E4E3E0]/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-[#141414] w-full max-w-lg shadow-[8px_8px_0px_0px_#141414] overflow-hidden"
            >
              <div className="bg-[#141414] text-[#E4E3E0] p-4 flex justify-between items-center font-mono text-xs uppercase tracking-widest">
                <span>{editingKeyId ? "修改端点配置" : "新端点配置"}</span>
                <button onClick={() => setShowAddForm(false)}>关闭</button>
              </div>
              <form onSubmit={saveKeyForm} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">友好名称</label>
                    <input 
                      type="text" 
                      required
                      placeholder="例如：生产集群 01"
                      className="w-full border border-[#141414] p-3 font-sans focus:outline-none focus:bg-[#F5F5F5]"
                      value={newKey.name}
                      onChange={e => setNewKey({...newKey, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase opacity-50 block">端点状态 (Endpoint Status)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewKey({...newKey, enabled: true})}
                        className={`flex-1 p-3 font-mono text-xs uppercase border border-[#141414] transition-colors ${newKey.enabled ? 'bg-green-500 text-white border-green-600 font-bold' : 'hover:bg-gray-50 text-[gray]'}`}
                      >
                        ✓ 启用 (Enabled)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewKey({...newKey, enabled: false})}
                        className={`flex-1 p-3 font-mono text-xs uppercase border border-[#141414] transition-colors ${!newKey.enabled ? 'bg-red-500 text-white border-red-600 font-bold' : 'hover:bg-gray-50 text-[gray]'}`}
                      >
                        ✗ 禁用 (Disabled)
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">API 密钥 (API Key)</label>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        required
                        placeholder="nvapi-..."
                        className="flex-1 border border-[#141414] p-3 font-mono focus:outline-none focus:bg-[#F5F5F5]"
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
                        className={`px-4 border border-[#141414] transition-colors text-xs font-mono disabled:opacity-50 ${
                          validationResult?.status === 'success' ? 'bg-green-500 text-white border-green-600' : 
                          validationResult?.status === 'error' ? 'bg-red-500 text-white border-red-600' : 
                          'hover:bg-black hover:text-white'
                        }`}
                      >
                        {isValidating ? '...' : 
                         validationResult?.status === 'success' ? '通过' : 
                         validationResult?.status === 'error' ? '失败' : '测试连接'}
                      </button>
                    </div>
                    {validationResult && (
                      <p className={`text-[10px] font-mono mt-1 ${validationResult.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {validationResult.status === 'success' ? '✓ ' : '✗ '}{validationResult.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">NIM 端点 URL (留空使用默认: {config.settings.defaultEndpoint})</label>
                    <input 
                      type="url" 
                      placeholder="https://..."
                      className="w-full border border-[#141414] p-3 font-mono focus:outline-none focus:bg-[#F5F5F5]"
                      value={newKey.endpoint}
                      onChange={e => setNewKey({...newKey, endpoint: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase opacity-50 block mb-2">模型路由规则</label>
                    <div className="border border-[#141414] p-4 bg-[#F5F5F5] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">选择允许通过此端点的模型 (未选则全部允许):</span>
                        <button 
                          type="button"
                          onClick={fetchFormModels}
                          disabled={formFetchingModels}
                          className="flex items-center gap-1 font-mono text-[10px] uppercase border p-1 opacity-70 hover:opacity-100 disabled:opacity-30 border-[#141414]"
                        >
                          <RefreshCw size={12} className={formFetchingModels ? "animate-spin" : ""} />
                          拉取可用模型
                        </button>
                      </div>
                      
                      {formAvailableModels.length > 0 && (
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="flex items-center gap-4">
                            <button 
                              type="button" 
                              onClick={() => setNewKey({...newKey, modelFilters: [...formAvailableModels]})}
                              className="underline hover:no-underline"
                            >
                              全选
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setNewKey({...newKey, modelFilters: []})}
                              className="underline hover:no-underline"
                            >
                              清空
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <input 
                              type="text"
                              placeholder="搜索模型关键词..."
                              className="w-full border border-[#141414]/20 bg-white p-1 px-2 text-[10px] focus:outline-none"
                              value={formModelSearch}
                              onChange={e => setFormModelSearch(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {formAvailableModels.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono max-h-40 overflow-y-auto">
                          {formAvailableModels
                            .filter(model => model.toLowerCase().includes(formModelSearch.toLowerCase()))
                            .map(model => (
                            <label key={model} className="flex items-center gap-2 border border-[#141414]/20 p-1.5 cursor-pointer hover:bg-white transition-colors bg-white/50">
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
                              />
                              <span className="truncate flex-1">{model}</span>
                              <span className={`text-[7px] leading-none px-1 py-0.5 rounded border ${detectModelType(model).bgClass}`}>
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
                        <div className="text-[10px] font-mono opacity-50 italic py-2">
                          点击右上角按钮拉取可用的模型...
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="font-mono text-[10px] uppercase opacity-50">该端点 QPS 限制 (0 为不限)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full border border-[#141414] p-3 font-mono focus:outline-none focus:bg-[#F5F5F5]"
                      value={newKey.qpsLimit}
                      onChange={e => setNewKey({...newKey, qpsLimit: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="font-mono text-[10px] uppercase opacity-50">该端点 RPM 限制 (0 为不限)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full border border-[#141414] p-3 font-mono focus:outline-none focus:bg-[#F5F5F5]"
                      value={newKey.rpmLimit}
                      onChange={e => setNewKey({...newKey, rpmLimit: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">该端点总额度 (0 为无限制, 通常用于羊毛党权重比例)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full border border-[#141414] p-3 font-mono focus:outline-none focus:bg-[#F5F5F5]"
                      value={newKey.quotaLimit}
                      onChange={e => setNewKey({...newKey, quotaLimit: parseInt(e.target.value)})}
                    />
                    <p className="text-[9px] opacity-40 font-mono italic">提示：在比例分配策略下，较大的额度意味着更高的请求权重。</p>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#141414] text-[#E4E3E0] p-4 font-mono text-sm uppercase tracking-widest hover:bg-[#333] transition-colors"
                >
                  保存端点
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-8 mt-20 border-t border-[#141414] flex flex-col sm:flex-row justify-between gap-6 overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity size={14} />
            <span className="font-mono text-[10px] uppercase tracking-widest leading-none">系统状态：运行中</span>
          </div>
          <p className="font-serif italic text-sm opacity-60">
            NVIDIA NIM 负载均衡器 v1.4.0。专为关键任务部署设计。
          </p>
        </div>
        <div className="flex items-center gap-8 font-mono text-[10px] uppercase opacity-40">
          <div className="flex flex-col">
            <span>智能路由 (Smart Routing)</span>
            <span className="text-[#141414] opacity-100 italic">已就绪</span>
          </div>
          <div className="flex flex-col">
            <span>负载均衡算法</span>
            <span className="text-[#141414] opacity-100 italic">{config.settings.strategy.toUpperCase()}</span>
          </div>
        </div>
      </footer>
      </>
    )}
    </div>
  );
}
