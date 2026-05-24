import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Server, ArrowRightLeft, History, Settings } from "lucide-react";
import { useProxyStore } from "@/stores/proxyStore";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "控制台" },
  { to: "/providers", icon: Server, label: "供应商" },
  { to: "/relay", icon: ArrowRightLeft, label: "中转" },
  { to: "/history", icon: History, label: "历史" },
  { to: "/settings", icon: Settings, label: "设置" },
];

export default function IconBar() {
  const isRunning = useProxyStore((s) => s.isRunning);
  const location = useLocation();
  const isActive = (to: string) => to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <div className="flex h-full w-[68px] shrink-0 flex-col items-center bg-gray-100 dark:bg-surface-925 py-3 gap-1">
      <div className="mb-4 mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
        <span className="text-sm font-bold text-white">iT</span>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-1">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink key={item.to} to={item.to}
              className={cn(
                "relative flex h-11 w-11 flex-col items-center justify-center rounded-xl transition-all duration-200",
                active ? "bg-white dark:bg-surface-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
              title={item.label}>
              <item.icon className="h-5 w-5" />
              <span className="mt-0.5 text-[9px] leading-none font-medium">{item.label}</span>
              {active && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </NavLink>
          );
        })}
      </nav>
      <div className="mb-2 flex flex-col items-center gap-1">
        <div className={cn("h-2.5 w-2.5 rounded-full transition-colors",
          isRunning ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-gray-300 dark:bg-gray-600")}
          title={isRunning ? "代理运行中" : "代理已停止"} />
        <span className="text-[9px] text-gray-400">{isRunning ? "ON" : "OFF"}</span>
      </div>
    </div>
  );
}
