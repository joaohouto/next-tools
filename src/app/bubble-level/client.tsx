"use client";

import { useEffect } from "react";
import { BubbleLevelDisplay } from "./bubble-level-display";

export default function BubbleLevelPage() {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        if ("wakeLock" in navigator)
          wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        /* silent */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      wakeLock?.release().catch(() => {});
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-background">
      <BubbleLevelDisplay axis="both" />
    </div>
  );
}
