import { useEffect } from "react";
import HistoryTable from "@/components/history/HistoryTable";
import RequestDetail from "@/components/history/RequestDetail";
import { useHistoryStore } from "@/stores/historyStore";
import type { HistoryEntry } from "@/lib/tauri";

export default function History() {
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const getDetail = useHistoryStore((s) => s.getDetail);
  const selectedDetail = useHistoryStore((s) => s.selectedDetail);
  const isDetailOpen = useHistoryStore((s) => s.isDetailOpen);
  const isDetailLoading = useHistoryStore((s) => s.isDetailLoading);
  const closeDetail = useHistoryStore((s) => s.closeDetail);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSelect = (entry: HistoryEntry) => {
    getDetail(entry.id);
  };

  return (
    <div className="space-y-6">
      <HistoryTable onSelect={handleSelect} />

      {/* Detail Panel */}
      {isDetailOpen && (
        isDetailLoading ? (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeDetail}
            />
            <div className="relative flex h-full w-full max-w-2xl items-center justify-center border-l border-surface-800/60 bg-surface-900/95 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-600 border-t-bridge-500" />
                <p className="text-xs text-surface-500">加载详情...</p>
              </div>
            </div>
          </div>
        ) : (
          <RequestDetail
            request={selectedDetail}
            onClose={closeDetail}
          />
        )
      )}
    </div>
  );
}
