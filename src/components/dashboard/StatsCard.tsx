import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: number;
  color?: "indigo" | "emerald" | "amber" | "sky";
}

const colorMap: Record<
  string,
  { bg: string; text: string; iconBg: string; ring: string; trend: string }
> = {
  indigo: {
    bg: "bg-bridge-500/10",
    text: "text-bridge-400",
    iconBg: "bg-bridge-500/20",
    ring: "ring-bridge-500/20",
    trend: "text-bridge-400",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/20",
    ring: "ring-emerald-500/20",
    trend: "text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    iconBg: "bg-amber-500/20",
    ring: "ring-amber-500/20",
    trend: "text-amber-400",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    iconBg: "bg-sky-500/20",
    ring: "ring-sky-500/20",
    trend: "text-sky-400",
  },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "indigo",
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  const colors = colorMap[color] || colorMap.indigo;

  // Animate numeric counter
  useEffect(() => {
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    if (displayValue === numericValue) return;

    const duration = 600;
    const startTime = performance.now();
    const start = displayValue;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (numericValue - start) * eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const formattedValue = isNaN(parseFloat(value.replace(/[^0-9.]/g, "")))
    ? value
    : displayValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const isPositiveTrend = trend !== undefined && trend >= 0;
  const hasTrend = trend !== undefined;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-surface-800/60",
        "bg-gray-50 dark:bg-surface-900/60 p-5 backdrop-blur-xl transition-all duration-300",
        "hover:border-gray-300 dark:border-surface-700/60 hover:bg-gray-50 dark:bg-surface-900/80",
        "ring-1 ring-inset",
        colors.ring
      )}
    >
      {/* Glass shimmer on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            {formattedValue}
          </p>
          <p className="truncate text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
          {hasTrend && (
            <div className="flex items-center gap-1 pt-1">
              {isPositiveTrend ? (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  isPositiveTrend ? "text-emerald-400" : "text-red-400"
                )}
              >
                {trend > 0 ? "+" : ""}
                {trend}%
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            colors.iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", colors.text)} />
        </div>
      </div>
    </div>
  );
}
