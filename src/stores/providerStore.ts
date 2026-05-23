import { create } from "zustand";
import {
  addProvider as tauriAddProvider,
  updateProvider as tauriUpdateProvider,
  removeProvider as tauriRemoveProvider,
  listProviders,
  testProviderConnection,
  setDefaultProvider,
  type Provider,
  type ProviderInput,
} from "@/lib/tauri";

interface ProviderState {
  providers: Provider[];
  defaultProviderId: string | null;
  isLoading: boolean;
  error: string | null;
  testingId: string | null;

  loadProviders: () => Promise<void>;
  addProvider: (data: ProviderInput) => Promise<Provider | null>;
  updateProvider: (id: string, data: ProviderInput) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useProviderStore = create<ProviderState>((set, get) => ({
  providers: [],
  defaultProviderId: null,
  isLoading: false,
  error: null,
  testingId: null,

  loadProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const providers = await listProviders();
      const defaultProvider = providers.find((p) => p.is_default);
      set({
        providers,
        defaultProviderId: defaultProvider?.id ?? null,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load providers",
      });
    }
  },

  addProvider: async (data: ProviderInput) => {
    set({ isLoading: true, error: null });
    try {
      const provider = await tauriAddProvider(data);
      const { providers } = get();
      set({
        providers: [...providers, provider],
        isLoading: false,
      });
      return provider;
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to add provider",
      });
      return null;
    }
  },

  updateProvider: async (id: string, data: ProviderInput) => {
    set({ isLoading: true, error: null });
    try {
      await tauriUpdateProvider(id, data);
      // Reload to get updated data
      await get().loadProviders();
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to update provider",
      });
    }
  },

  removeProvider: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await tauriRemoveProvider(id);
      const { providers, defaultProviderId } = get();
      set({
        providers: providers.filter((p) => p.id !== id),
        defaultProviderId: defaultProviderId === id ? null : defaultProviderId,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to remove provider",
      });
    }
  },

  setDefault: async (id: string) => {
    try {
      await setDefaultProvider(id);
      set({ defaultProviderId: id });
      // Update local state to reflect default
      const { providers } = get();
      set({
        providers: providers.map((p) => ({
          ...p,
          is_default: p.id === id,
        })),
      });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to set default provider",
      });
    }
  },

  testConnection: async (id: string) => {
    set({ testingId: id });
    try {
      const success = await testProviderConnection(id);
      // Update provider's enabled status and update API key presence locally
      const { providers } = get();
      set({
        providers: providers.map((p) =>
          p.id === id ? { ...p, enabled: success } : p
        ),
        testingId: null,
      });
      return success;
    } catch (err) {
      set({
        testingId: null,
        error:
          err instanceof Error ? err.message : "Connection test failed",
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
