import { useEffect, useState } from "react";

/**
 * Persist a boolean (e.g. sidebar group open/closed) in localStorage.
 */
export function usePersistentBool(key: string, defaultValue = true) {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultValue;
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === "1";
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
