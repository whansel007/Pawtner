import type { CSSProperties } from "react";

/** Ring filled to `percent`; the numbers shown and the accessible label come from the caller. */
export function ProgressRing({ percent, value, caption, label }: { percent: number; value: string; caption: string; label: string }) {
  const style = { "--care-ring-fill": `${percent}%` } as CSSProperties;
  return (
    <div className="care-ring" style={style} role="img" aria-label={label}>
      <div className="care-ring__center" aria-hidden="true">
        <strong>{value}</strong>
        <span>{caption}</span>
      </div>
    </div>
  );
}
