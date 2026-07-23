import { useEffect, useState } from "react";
import {
  hydrateShopSettingsFromServer,
  loadShopSettings,
} from "@/lib/store";

export function useShopSettings() {
  const [settings, setSettings] = useState(loadShopSettings);

  useEffect(() => {
    const sync = () => setSettings(loadShopSettings());
    void hydrateShopSettingsFromServer().then(sync);
    window.addEventListener("shop-settings:updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shop-settings:updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return settings;
}
