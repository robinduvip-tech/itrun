import { create } from "zustand";
import {
  getHistory,
  getRequestDetail,
  clearHistory as tauriClearHistory,
  type HistoryEntry,
  type HistoryQuery,
} from "@/lib/tauri";

interface HistoryFilters {
  provider: string;
  model: string;
  status: "success" | "error" | "all";
  search: string;
}

interface HistoryState {
  entries: HistoryEntry[];
  totalCount: number;
  filters: HistoryFilters;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  selectedDetail: HistoryEntry | null;
  isDetailOpen: boolean;
  isDetailLoading: boolean;

  loadHistory: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilter: (key: keyof HistoryFilters, value: string) => void;
  clearFilters: () => void;
  getDetail: (id: string) => Promise<void>;
  closeDetail: () => void;
  clearHistory: () => Promise<void>;
}

const defaultFilters: HistoryFilters = {
  provider: "",
  model: "",
  status: "all",
  search: "",
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  totalCount: 0,
  filters: { ...defaultFilters },
  currentPage: 1,
  pageSize: 20,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  selectedDetail: null,
  isDetailOpen: false,
  isDetailLoading: false,

  loadHistory: async () => {
    set({ isLoading: true, error: null, currentPage: 1 });
    try {
      const { filters, pageSize } = get();
      const query: HistoryQuery = {
        page: 1,
        page_size: pageSize,
        provider: filters.provider || undefined,
        model: filters.model || undefined,
        status: filters.status,
        search: filters.search || undefined,
      };
      const result = await getHistory(query);
      set({
        entries: result.entries,
        totalCount: result.total,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to load history",
      });
    }
  },

  loadMore: async () => {
    const { isLoadingMore, currentPage, entries, totalCount } = get();
    if (isLoadingMore || entries.length >= totalCount) return;

    set({ isLoadingMore: true });
    try {
      const nextPage = currentPage + 1;
      const { filters, pageSize } = get();
      const query: HistoryQuery = {
        page: nextPage,
        page_size: pageSize,
        provider: filters.provider || undefined,
        model: filters.model || undefined,
        status: filters.status,
        search: filters.search || undefined,
        sort_by: "timestamp",
        sort_order: "desc",
      };
      const result = await getHistory(query);
      set({
        entries: [...entries, ...result.entries],
        currentPage: nextPage,
        isLoadingMore: false,
      });
    } catch (err) {
      set({
        isLoadingMore: false,
        error:
          err instanceof Error ? err.message : "Failed to load more",
      });
    }
  },

  setFilter: (key: keyof HistoryFilters, value: string) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
    // Reload after filter change
    get().loadHistory();
  },

  clearFilters: () => {
    set({ filters: { ...defaultFilters } });
    get().loadHistory();
  },

  getDetail: async (id: string) => {
    set({ isDetailOpen: true, isDetailLoading: true, selectedDetail: null });
    try {
      const detail = await getRequestDetail(id);
      set({ selectedDetail: detail, isDetailLoading: false });
    } catch (err) {
      set({
        isDetailLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to load detail",
      });
    }
  },

  closeDetail: () => {
    set({ isDetailOpen: false, selectedDetail: null });
  },

  clearHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      await tauriClearHistory();
      set({
        entries: [],
        totalCount: 0,
        currentPage: 1,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to clear history",
      });
    }
  },
}));
