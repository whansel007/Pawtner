import type { CSSProperties } from "react";

export interface StreakDay {
  key: string;
  label: string;
  filled: boolean;
}

/** Seven knitted hearts, oldest day first. Decorative; the caller gives the list one accessible summary. */
export function StreakHearts({ days, label }: { days: readonly StreakDay[]; label: string }) {
  return (
    <div className="care-hearts" role="img" aria-label={label}>
      {days.map((day, index) => (
        <div className="care-hearts__day" key={day.key} aria-hidden="true">
          <span
            className={`care-heart ${day.filled ? "is-filled" : ""}`}
            style={{ "--care-heart-delay": `${index * 55}ms` } as CSSProperties}
          />
          <span>{day.label}</span>
        </div>
      ))}
    </div>
  );
}
