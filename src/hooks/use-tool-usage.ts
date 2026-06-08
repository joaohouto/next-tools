import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";

export type ToolUsageRecord = Record<string, number>;

export function useToolUsage() {
  const [usage, setUsage] = useLocalStorage<ToolUsageRecord>(
    "tool-usage",
    {},
  );

  const trackUsage = useCallback(
    (path: string) => {
      setUsage((prev) => ({
        ...prev,
        [path]: (prev[path] ?? 0) + 1,
      }));
    },
    [setUsage],
  );

  return { usage, trackUsage };
}
