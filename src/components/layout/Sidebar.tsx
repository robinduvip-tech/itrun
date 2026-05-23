import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  History,
  Settings,
  Link2,
} from "lucide-react";
import { useProxyStore } from "@/stores/proxyStore";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "控制台" },
  { to: "/providers", icon: Server, label: "供应商" },
  { to: "/history", icon: History, label: "历史" },
  { to: "/settings", icon: Settings, label: "设置" },
];

export default function Sidebar() {
  const isRunning = useProxyStore((s) => s.isRunning);
  const port = useProxyStore((s) => s.port);
  const location = useLocation();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-surface-800 bg-surface-900/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-surface-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bridge-500/20">
          <Link2 className="h-4 w-4 text-bridge-400" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">
          CodexBridge
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-bridge-500/15 text-bridge-400"
                  : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-bridge-500" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Proxy Status Indicator */}
      <div className="border-t border-surface-800 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-surface-800/50 px-3 py-2.5">
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                isRunning ? "bg-emerald-400" : "bg-surface-500"
              )}
              style={{ animationDuration: isRunning ? "2s" : "0s" }}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                isRunning ? "bg-emerald-500" : "bg-surface-500"
              )}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-surface-300">
              {isRunning ? "代理运行中" : "代理已停止"}
            </span>
            {isRunning && port > 0 && (
              <span className="text-xs text-surface-500">端口 {port}</span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
