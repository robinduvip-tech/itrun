import { create } from "zustand";
import {
  getSettings,
  setSetting as tauriSetSetting,
} from "@/lib/tauri";

type Theme = "dark" | "light";

interface SettingsState {
  settings: Record<string, string>;
  theme: Theme;
  proxyPort: number;
  isLoading: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  setTheme: (theme: Theme) => void;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  theme: "light",
  proxyPort: 9876,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await getSettings();
      const theme = (settings.theme as Theme) || "light";
      const proxyPort = parseInt(settings.proxy_port || "9876", 10) || 9876;

      set({
        settings,
        theme,
        proxyPort,
        isLoading: false,
      });

      // Apply theme
      applyTheme(theme);
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to load settings",
      });
    }
  },

  setSetting: async (key: string, value: string) => {
    try {
      await tauriSetSetting(key, value);
      set((state) => ({
        settings: { ...state.settings, [key]: value },
      }));

      // Handle special settings
      if (key === "theme") {
        applyTheme(value as Theme);
        set({ theme: value as Theme });
      }
      if (key === "proxy_port") {
        set({ proxyPort: parseInt(value, 10) || 3000 });
      }
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to save setting",
      });
    }
  },

  setTheme: (theme: Theme) => {
    applyTheme(theme);
    set({ theme });
    // Persist
    get().setSetting("theme", theme);
  },

  clearError: () => set({ error: null }),
}));

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
