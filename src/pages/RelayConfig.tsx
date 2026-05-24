import { useState, useEffect } from "react";
import { Plus, Braces, Zap, Check, X, Save, RotateCcw, RefreshCw, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCodexStatus, addCodexProfile, deleteCodexProfile, switchCodexProfile, backupCodexOfficial, restoreCodexOfficial, updateCodexProfile, setSetting } from "@/lib/tauri";
import type { CodexProfile, CodexStatus } from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settingsStore";

type Tab = "codex" | "claude";

export default function RelayConfig() {
  const [tab, setTab] = useState<Tab>("codex");

  return (
    <div className="flex h-full flex-col bg-white dark:bg-surface-950">
      <div className="flex h-14 shrink-0 items-center border-b border-gray-100 dark:border-surface-800/60 px-5 gap-1">
        <button onClick={() => setTab("codex")}
          className={cn("relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            tab === "codex" ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" : "text-gray-500 hover:text-gray-700")}>
          <Braces className="h-4 w-4 inline mr-1.5" />Codex
        </button>
        <button onClick={() => setTab("claude")}
          className={cn("relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            tab === "claude" ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10" : "text-gray-500 hover:text-gray-700")}>
          <Zap className="h-4 w-4 inline mr-1.5" />Claude
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "codex" ? <CodexTab /> : <ClaudeTab />}
      </div>
    </div>
  );
}

function CodexTab() {
  const [status, setStatus] = useState<CodexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-5");
  const [msg, setMsg] = useState<{ t: "ok" | "err"; text: string } | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editModel, setEditModel] = useState("");

  const refresh = async () => { try { setStatus(await getCodexStatus()); } catch {} setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const showMsg = (t: "ok" | "err", text: string) => { setMsg({ t, text }); setTimeout(() => setMsg(null), 2500); };

  const handleAdd = async () => {
    if (!name.trim() || !apiKey.trim()) return;
    try { await addCodexProfile(name.trim(), apiKey.trim(), baseUrl.trim(), model.trim()); setShowAdd(false); setName(""); setApiKey(""); await refresh(); showMsg("ok", "ok"); }
    catch (e: any) { showMsg("err", e.toString()); }
  };

  const handleSwitch = async (id: string) => {
    setSwitchingId(id);
    try { await switchCodexProfile(id); await refresh(); showMsg("ok", "ok"); } catch (e: any) { showMsg("err", e.toString()); }
    setSwitchingId(null);
  };

  const handleDelete = async (id: string) => { try { await deleteCodexProfile(id); await refresh(); } catch {} };
  const startEdit = (p: CodexProfile) => { setEditingId(p.id); setEditName(p.name); setEditKey(p.api_key); setEditUrl(p.base_url); setEditModel(p.model); };
  const cancelEdit = () => setEditingId(null);
  const handleEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try { await updateCodexProfile(editingId, editName.trim(), editKey.trim(), editUrl.trim(), editModel.trim()); setEditingId(null); await refresh(); showMsg("ok", "ok"); }
    catch (e: any) { showMsg("err", e.toString()); }
  };
  const handleBackup = async () => { try { await backupCodexOfficial(); await refresh(); showMsg("ok", "ok"); } catch (e: any) { showMsg("err", e.toString()); } };
  const handleRestore = async () => { try { await restoreCodexOfficial(); await refresh(); showMsg("ok", "ok"); } catch (e: any) { showMsg("err", e.toString()); } };

  if (loading) return <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" /></div>;

  return (
    <div className="max-w-3xl space-y-5">
      {msg && <div className={cn("text-sm px-4 py-2.5 rounded-xl", msg.t === "ok" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400")}>{msg.text}</div>}
      <div className="rounded-xl border border-gray-200 dark:border-surface-700/60 p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Codex 官方配置</p><p className="text-xs text-gray-400 mt-0.5">{status?.backup_exists ? "已备份，可随时恢复" : "尚未备份，建议先备份"}</p></div>
          <div className="flex gap-2">
            <button onClick={handleBackup} className="btn-secondary text-xs flex items-center gap-1"><Save className="h-3.5 w-3.5" />备份</button>
            <button onClick={handleRestore} disabled={!status?.backup_exists} className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />恢复</button>
          </div>
        </div>
        {status && (
          <div className="grid grid-cols-2 gap-3 text-sm mt-3 pt-3 border-t border-gray-100 dark:border-surface-700/60">
            <div><span className="text-gray-400">当前 auth.json:</span> <span className="font-mono text-xs text-gray-500 truncate block">{status.current_auth?.slice(0, 40) || "(空)"}</span></div>
            <div><span className="text-gray-400">当前 config.toml:</span> <span className="font-mono text-xs text-gray-500 truncate block">{status.current_config?.slice(0, 40) || "(空)"}</span></div>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">自定义配置方案</h3>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"><Plus className="h-3.5 w-3.5" />新增方案</button>
        </div>
        {(!status?.profiles || status.profiles.length === 0) && !showAdd ? (
          <div className="text-center py-10 text-sm text-gray-400 border-2 border-dashed border-gray-200 dark:border-surface-700 rounded-xl">暂无自定义方案，点击右上角新增</div>
        ) : (
          <div className="space-y-2">
            {status?.profiles.map((p: CodexProfile) => (
              editingId === p.id ? (
                /* Inline Edit */
                <div key={p.id} className="rounded-xl border-2 border-indigo-300 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500 mb-1 block">方案名称</label><input value={editName} onChange={e => setEditName(e.target.value)} className="input-field text-sm" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">模型</label><input value={editModel} onChange={e => setEditModel(e.target.value)} className="input-field text-sm" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">API Key</label><input type="password" value={editKey} onChange={e => setEditKey(e.target.value)} className="input-field text-sm" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Base URL</label><input value={editUrl} onChange={e => setEditUrl(e.target.value)} className="input-field text-sm" /></div>
                  </div>
                  <div className="flex justify-end gap-2"><button onClick={cancelEdit} className="btn-secondary text-sm">取消</button><button onClick={handleEdit} className="btn-primary text-sm">保存</button></div>
                </div>
              ) : (
              <div key={p.id} className={cn("flex items-center justify-between rounded-xl border p-4",
                status.active_id === p.id ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-gray-100 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-800/30")}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                    {status.active_id === p.id && <span className="rounded-full bg-emerald-500 px-2 py-0 text-[10px] font-medium text-white">当前</span>}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1"><span className="text-xs text-gray-400 font-mono">{p.model}</span><span className="text-xs text-gray-400 font-mono truncate max-w-[300px]">{p.base_url}</span></div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button onClick={() => handleSwitch(p.id)} disabled={switchingId === p.id || status.active_id === p.id}
                    className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      status.active_id === p.id ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 cursor-default" : "bg-indigo-500 text-white hover:bg-indigo-600")}>
                    {switchingId === p.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : status.active_id === p.id ? "已激活" : "切换"}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><X className="h-3.5 w-3.5" /></button>
                  <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              )))}
          </div>
        )}
        {showAdd && (
          <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5 p-4 mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">方案名称</label><input value={name} onChange={e => setName(e.target.value)} placeholder="公司中转" className="input-field text-sm" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">模型</label><input value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-5" className="input-field text-sm" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">API Key</label><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." className="input-field text-sm" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Base URL</label><input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="input-field text-sm" /></div>
            </div>
            <div className="flex justify-end gap-2"><button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">取消</button><button onClick={handleAdd} className="btn-primary text-sm">添加方案</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClaudeTab() {
  const { settings } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; text: string } | null>(null);
  const [claudeModel, setClaudeModel] = useState(settings.claude_model || "claude-opus-4-7-20250514");
  const [claudeKey, setClaudeKey] = useState(settings.claude_api_key || "");
  const [claudeUrl, setClaudeUrl] = useState(settings.claude_base_url || "https://api.anthropic.com/v1");

  const showMsg = (t: "ok" | "err", text: string) => { setMsg({ t, text }); setTimeout(() => setMsg(null), 2500); };

  const handleSave = async () => {
    setSaving(true);
    try { await setSetting("claude_model", claudeModel); await setSetting("claude_api_key", claudeKey); await setSetting("claude_base_url", claudeUrl); showMsg("ok", "ok"); }
    catch (e: any) { showMsg("err", e.toString()); }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl space-y-5">
      {msg && <div className={cn("text-sm px-4 py-2.5 rounded-xl", msg.t === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>{msg.text}</div>}
      <div className="rounded-xl border border-gray-200 dark:border-surface-700/60 p-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Claude 官方配置</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-400">默认模型:</span> <span className="font-mono text-gray-700 dark:text-gray-300">claude-opus-4-7-20250514</span></div>
          <div><span className="text-gray-400">API 地址:</span> <span className="font-mono text-gray-700 dark:text-gray-300">api.anthropic.com</span></div>
        </div>
      </div>
      <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 p-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">自定义中转配置</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500 mb-1 block">模型</label><input value={claudeModel} onChange={e => setClaudeModel(e.target.value)} className="input-field text-sm font-mono" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">API Key</label><input type="password" value={claudeKey} onChange={e => setClaudeKey(e.target.value)} placeholder="sk-ant-..." className="input-field text-sm" /></div>
          <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Base URL</label><input value={claudeUrl} onChange={e => setClaudeUrl(e.target.value)} className="input-field text-sm font-mono" /></div>
        </div>
        <div className="flex justify-end mt-3"><button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />{saving ? "..." : "保存"}</button></div>
      </div>
    </div>
  );
}
