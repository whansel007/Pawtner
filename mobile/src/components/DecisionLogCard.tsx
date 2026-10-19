import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { WHY_REVEAL_MS } from "../config/decisions";
import { useTimedReveal } from "../lib/useTimedReveal";
import "./DecisionLogCard.css";

/**
 * The card at the top of Health (lib/decisions.ts showSideEffectCard): a prompt and its "Why?" button.
 * "Why?" swaps the prompt for the plain reason in the same card for WHY_REVEAL_MS (owner, 18 Oct: 5 s), then folds
 * back. Both texts share one grid cell, so the card keeps its size and nothing below jumps. A thin line along the
 * bottom shows the time running out. Her finger on the card pauses it; "Why?" again (now "Hide why") closes at once.
 * The reason is announced (aria-live); focus stays on the button. Reduced motion: no fade, no line.
 * Timing lives in lib/useTimedReveal.ts.
 */
export function DecisionLogCard({ summary, reasonKey }: { summary: string; reasonKey: string }) {
  const { t } = useTranslation();
  const { open, paused, round, toggle, pause, resume } = useTimedReveal(WHY_REVEAL_MS);
  const reason = t(reasonKey);
  return (
    <div
      className={`decision-log${open ? " is-open" : ""}`}
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
      onPointerLeave={resume}
    >
      <div className="decision-log__texts">
        <p className="decision-log__summary" aria-hidden={open}>{summary}</p>
        <p className="decision-log__reason" aria-hidden={!open}>{reason}</p>
      </div>
      <button className="decision-log__toggle" onClick={toggle} aria-expanded={open} type="button">
        {open ? t("decisionLog.whyButtonExpanded") : t("decisionLog.whyButton")}
      </button>
      <span className="decision-log__live" aria-live="polite">{open ? reason : ""}</span>
      {open && (
        <span
          key={round}
          className={`decision-log__timer${paused ? " is-paused" : ""}`}
          style={{ "--why-reveal-ms": `${WHY_REVEAL_MS}ms` } as CSSProperties}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
