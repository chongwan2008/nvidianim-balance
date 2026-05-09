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
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NimKey, NimConfig } from './types';

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
  const [formFetchingModels, setFormFetchingModels] = useState(false);

  const [newKey, setNewKey] = useState({ 
    name: '', 
    key: '', 
    endpoint: '',
    qpsLimit: 0,
    modelFilters: [] as string[]
  });
  const [proxyUrl, setProxyUrl] = useState('');

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
    setNewKey({ name: '', key: '', endpoint: '', qpsLimit: 0, modelFilters: [] });
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
      modelFilters: key.modelFilters || []
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
        setFormAvailableModels(data.data.map((m: any) => m.id));
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
      const response = await fetch('/api/keys/validate', {
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
        setFormAvailableModels(data.models);
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
                <h1 className="font-serif italic text-2xl tracking-tight">NVIDIA NIM 负载均衡器</h1>
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
            <h2 className="font-mono text-xs uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Database size={14} /> 已注册的 NIM 端点
            </h2>
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase opacity-50">
              <span className="hidden sm:inline">状态</span>
              <span className="hidden sm:inline">负载 (成功/总数)</span>
              <span className="hidden sm:inline">最后使用</span>
            </div>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {config.keys.map((key) => (
                <React.Fragment key={key.id}>
                <motion.div 
                  key={key.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group bg-white border border-[#141414] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-[#F5F5F5] ${!key.enabled ? 'grayscale opacity-60' : ''}`}
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
                      <p className="font-mono text-[10px] opacity-50 truncate">
                        {key.endpoint || (config.settings.defaultEndpoint + ' (默认)')}
                      </p>
                    </div>
                  </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 font-mono text-sm shrink-0">
                    <div className="flex items-center gap-2">
                      {key.status === 'active' ? (
                        <CheckCircle2 size={16} className="text-green-600" />
                      ) : key.status === 'circuit-broken' ? (
                        <AlertCircle size={16} className="text-red-700 animate-pulse" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600" />
                      )}
                      <div className="flex flex-col">
                        <span className="hidden sm:inline text-xs uppercase">
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

                    <div className="flex flex-col items-end sm:w-24">
                      <span className="text-[10px] opacity-40 uppercase leading-none mb-1">成功/总数</span>
                      <span className="numeric">{(key.useCount || 0) - (key.errorCount || 0)}/{key.useCount || 0}</span>
                    </div>

                    <div className="flex flex-col items-end sm:w-32">
                      <span className="text-[10px] opacity-40 uppercase leading-none mb-1">最后访问</span>
                      <span className="text-[11px] truncate w-full text-right">
                        {key.lastUsed ? new Date(key.lastUsed).toLocaleTimeString() : '从未'}
                      </span>
                    </div>

                    <button 
                      onClick={() => {
                        if (key.confirmedModels) {
                             setAvailableModels(prev => ({ ...prev, [key.id]: key.confirmedModels! }));
                        } else {
                             fetchModelsForKey(key.id);
                        }
                      }}
                      className={`p-2 transition-colors ${availableModels[key.id] ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-black/5'}`}
                      title={key.confirmedModels ? "查看已确认模型" : "查询模型"}
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
                    <div className="flex flex-wrap gap-1">
                      {availableModels[key.id].map(model => (
                        <span key={model} className="px-1.5 py-0.5 bg-[#F5F5F5] border border-[#141414]/10 rounded select-all">
                          {model}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
              ))}
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
                      )}

                      {formAvailableModels.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono max-h-40 overflow-y-auto">
                          {formAvailableModels.map(model => (
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
                              <span className="truncate">{model}</span>
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
                  <div className="space-y-1 col-span-2">
                    <label className="font-mono text-[10px] uppercase opacity-50">该端点 QPS 限制 (0 为不限)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full border border-[#141414] p-3 font-mono focus:outline-none focus:bg-[#F5F5F5]"
                      value={newKey.qpsLimit}
                      onChange={e => setNewKey({...newKey, qpsLimit: parseInt(e.target.value)})}
                    />
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
            NVIDIA NIM 负载均衡器 v1.0。专为关键任务部署设计。
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
