import { useEffect } from "react";
import SettingsPanel from "@/components/settings/SettingsPanel";
import { useSettingsStore } from "@/stores/settingsStore";

export default function Settings() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return <SettingsPanel />;
}
