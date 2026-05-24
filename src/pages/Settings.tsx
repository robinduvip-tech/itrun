import { useState } from "react";
import { Sun, Moon, Trash2, AlertTriangle } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import { setSetting } from "@/lib/tauri";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { theme, proxyPort, settings, setTheme } = useSettingsStore();
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const [showClear, setShowClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const closeToTray = settings.close_to_tray !== "false";

  return (
    <div className="flex h-full flex-col bg-white dark:bg-surface-950">
      <div className="flex h-14 shrink-0 items-center border-b border-gray-100 dark:border-surface-800/60 px-5">
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">设置</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-5 max-w-md space-y-6">
        <Section label="外观">
          <div className="flex gap-3">
            <Btn icon={<Sun className="h-4 w-4" />} label="浅色" active={theme==="light"} onClick={() => setTheme("light")} />
            <Btn icon={<Moon className="h-4 w-4" />} label="深色" active={theme==="dark"} onClick={() => setTheme("dark")} />
          </div>
        </Section>
        <Section label="窗口">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-800 dark:text-gray-200">关闭时最小化到托盘</p><p className="text-xs text-gray-400 mt-0.5">点击关闭按钮时隐藏到托盘而非退出</p></div>
            <Toggle value={closeToTray} onChange={(v) => setSetting("close_to_tray", String(v))} />
          </div>
        </Section>
        <Section label="数据">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-800 dark:text-gray-200">清除请求历史</p><p className="text-xs text-gray-400 mt-0.5">删除所有已记录的请求数据</p></div>
            <button onClick={() => setShowClear(true)} className="btn-danger text-xs flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" />清除</button>
          </div>
        </Section>
        <Section label="关于">
          <Row label="应用" value="iTrun" /><Row label="版本" value="v0.1.0" badge /><Row label="代理地址" value={`http://localhost:${proxyPort}`} />
        </Section>
      </div>
      {showClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowClear(false)} />
          <div className="relative rounded-2xl bg-white dark:bg-surface-900 p-6 shadow-2xl max-w-sm">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
              <div><p className="font-semibold">确认清除历史记录？</p><p className="text-xs text-gray-400 mt-0.5">此操作不可撤销。</p></div></div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowClear(false)} className="btn-secondary text-sm">取消</button>
              <button onClick={async()=>{setClearing(true);await clearHistory();setClearing(false);setShowClear(false)}} disabled={clearing} className="btn-danger text-sm">{clearing?"清除中...":"确认清除"}</button></div>
          </div></div>)}
    </div>
  );
}
function Section({label,children}:{label:string;children:React.ReactNode}){return <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</p><div className="space-y-3">{children}</div></div>}
function Btn({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void}){return <button onClick={onClick} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm",active?"border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300":"border-gray-200 text-gray-400 dark:border-gray-700")}>{icon}{label}</button>}
function Row({label,value,badge}:{label:string;value:string;badge?:boolean}){return <div className="flex items-center justify-between py-1.5"><span className="text-sm text-gray-400">{label}</span>{badge?<span className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{value}</span>:<span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}</div>}
function Toggle({value,onChange}:{value:boolean;onChange:(v:boolean)=>void}){return <button onClick={()=>onChange(!value)} className={cn("relative h-6 w-11 rounded-full transition-colors",value?"bg-emerald-500":"bg-gray-300 dark:bg-gray-700")}><span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",value&&"translate-x-5")}/></button>}
