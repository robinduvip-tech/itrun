import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Check, ChevronDown, Layers } from "lucide-react";
import { useProviderStore } from "@/stores/providerStore";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  value?: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const providers = useProviderStore((s) => s.providers);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Group models by provider, filter by search
  const groupedModels = useMemo(() => {
    return providers
      .filter((p) => p.is_connected)
      .map((provider) => ({
        providerId: provider.id,
        providerName: provider.name,
        models: provider.models.filter((m) =>
          m.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter((g) => g.models.length > 0);
  }, [providers, search]);

  const selectedLabel = value || "选择默认模型...";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm transition-all duration-200",
          "hover:border-surface-600",
          isOpen && "border-bridge-500 ring-1 ring-bridge-500/30"
        )}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Layers className="h-4 w-4 shrink-0 text-surface-500" />
          <span
            className={cn(
              "truncate",
              value ? "text-white" : "text-surface-500"
            )}
          >
            {selectedLabel}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-surface-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-surface-700/60 bg-surface-900 shadow-2xl">
          {/* Search */}
          <div className="border-b border-surface-800/60 p-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索模型..."
                className="w-full rounded-lg border-0 bg-surface-800 py-2 pl-9 pr-3 text-xs text-white placeholder-surface-500 outline-none focus:ring-1 focus:ring-bridge-500/30"
              />
            </div>
          </div>

          {/* Model list */}
          <div className="max-h-64 overflow-y-auto py-1.5">
            {groupedModels.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-surface-500">
                {search
                  ? "未找到匹配的模型"
                  : "没有已配置的供应商或模型"}
              </div>
            ) : (
              groupedModels.map((group) => (
                <div key={group.providerId}>
                  {/* Provider header */}
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-surface-500">
                    {group.providerName}
                  </div>
                  {group.models.map((model) => (
                    <button
                      key={`${group.providerId}:${model}`}
                      type="button"
                      onClick={() => {
                        onChange(model);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors",
                        "hover:bg-surface-800/80",
                        value === model
                          ? "bg-bridge-500/10 text-bridge-400"
                          : "text-surface-300"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded",
                          value === model
                            ? "bg-bridge-500 text-white"
                            : "border border-surface-600"
                        )}
                      >
                        {value === model && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate font-mono">{model}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
