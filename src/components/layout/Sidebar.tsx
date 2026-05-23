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
    <aside className="flex h-full w-56 shrink-0 flex-col border-r backdrop-blur-xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b px-4" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--accent-light)' }}>
          <Link2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          iTrun
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
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
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
      <div className="border-t p-4" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                isRunning ? "bg-emerald-400" : "bg-gray-400"
              )}
              style={{ animationDuration: isRunning ? "2s" : "0s" }}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                isRunning ? "bg-emerald-500" : "bg-gray-400"
              )}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {isRunning ? "代理运行中" : "代理已停止"}
            </span>
            {isRunning && port > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>端口 {port}</span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
