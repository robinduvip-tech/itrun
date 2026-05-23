import { useState, useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import ProviderList from "@/components/providers/ProviderList";
import ProviderForm from "@/components/providers/ProviderForm";
import ModelSelector from "@/components/providers/ModelSelector";
import { useProviderStore } from "@/stores/providerStore";
import type { Provider, ProviderInput } from "@/lib/tauri";

export default function Providers() {
  // Provider store
  const addProvider = useProviderStore((s) => s.addProvider);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  const removeProvider = useProviderStore((s) => s.removeProvider);
  const testConnection = useProviderStore((s) => s.testConnection);
  const isLoading = useProviderStore((s) => s.isLoading);
  const error = useProviderStore((s) => s.error);
  const clearError = useProviderStore((s) => s.clearError);
  const testingId = useProviderStore((s) => s.testingId);

  // Local state
  const [formOpen, setFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");

  // Clear model selection on mount
  useEffect(() => {
    setSelectedModel("");
  }, []);

  const handleAdd = useCallback(() => {
    setEditingProvider(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((provider: Provider) => {
    setEditingProvider(provider);
    setFormOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((provider: Provider) => {
    setDeleteTarget(provider);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeProvider(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, removeProvider]);

  const handleSave = useCallback(
    async (data: ProviderInput) => {
      if (editingProvider) {
        await updateProvider(editingProvider.id, data);
      } else {
        await addProvider(data);
      }
      setFormOpen(false);
      setEditingProvider(null);
    },
    [editingProvider, updateProvider, addProvider]
  );

  const handleTestConnection = useCallback(
    async (id: string) => {
      return testConnection(id);
    },
    [testConnection]
  );

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">供应商管理</h1>
          <p className="mt-1 text-sm text-surface-400">
            配置 AI 服务供应商与模型
          </p>
        </div>
      </div>

      {/* Model Selector */}
      <div className="max-w-sm">
        <label className="mb-1.5 block text-xs font-medium text-surface-300">
          默认模型
        </label>
        <ModelSelector value={selectedModel} onChange={setSelectedModel} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="flex-1 text-xs text-red-400">{error}</p>
          <button
            onClick={clearError}
            className="text-xs text-red-400 underline hover:text-red-300"
          >
            关闭
          </button>
        </div>
      )}

      {/* Provider List */}
      <ProviderList
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      {/* Provider Form Modal */}
      <ProviderForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProvider(null);
        }}
        provider={editingProvider}
        onSave={handleSave}
        onTestConnection={handleTestConnection}
        isSaving={isLoading}
        testingId={testingId}
      />

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-sm animate-slide-up rounded-2xl border border-surface-700/60 bg-surface-900/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  确认删除供应商？
                </p>
                <p className="mt-0.5 text-xs text-surface-400">
                  将永久删除{" "}
                  <span className="font-medium text-surface-300">
                    {deleteTarget.name}
                  </span>{" "}
                  及其所有模型配置。此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="btn-danger flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isDeleting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
