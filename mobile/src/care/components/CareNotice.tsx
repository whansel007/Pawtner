import type { ReactNode } from "react";

/** Calm note. `live` announces changes (save status, offline notice). */
export function CareNotice({ tone = "calm", live = false, children }: { tone?: "calm" | "warm"; live?: boolean; children: ReactNode }) {
  return (
    <p className={`care-notice care-notice--${tone}`} role={live ? "status" : undefined}>
      {children}
    </p>
  );
}
