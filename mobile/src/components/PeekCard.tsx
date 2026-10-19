import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PEEK_MS } from "../config/decisions";
import { useTimedReveal } from "../lib/useTimedReveal";
import "./PeekCard.css";

/**
 * Buddy's message with a "Why?" button that shows a peekaboo card for a moment (owner, 18 Oct: "it will show the
 * warning card for 5 to 8 s. then flip back to why ... it's not there all the time"; "fading is also ok").
 * Front: `message` + "Why?". Tapping "Why?" cross-fades (opacity, 250 ms) to `back`; after PEEK_MS it fades back.
 * Her finger on the card pauses the time; "Close" goes back at once; a thin line on the back shows the time running
 * out. Both faces share one grid cell, so nothing below jumps. Focus moves to the visible button; `announce` is read
 * out when the back shows. `tone="warning"` gives the back the Warning card's colours. Reduced motion: an instant swap
 * with the same timing. Timing lives in lib/useTimedReveal.ts.
 */
export function PeekCard({ message, back, announce, tone = "plain" }: { message: string; back: ReactNode; announce: string; tone?: "plain" | "warning" }) {
  const { t } = useTranslation();
  const { open, paused, round, toggle, pause, resume } = useTimedReveal(PEEK_MS);
  const card = useRef<HTMLDivElement>(null);
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);

  // Keep focus on a visible button when the card flips (only if focus was in the card).
  useEffect(() => {
    if (!card.current?.contains(document.activeElement)) return;
    (open ? backButton : frontButton).current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <div ref={card} className="peek-card" onPointerDown={pause} onPointerUp={resume} onPointerCancel={resume} onPointerLeave={resume}>
      <div className={`peek-card__stack${open ? " is-open" : ""}`}>
        <div className="peek-card__face peek-card__face--front" aria-hidden={open}>
          <p className="peek-card__message">{message}</p>
          <button ref={frontButton} className="peek-card__toggle" onClick={toggle} aria-expanded={false} tabIndex={open ? -1 : 0} type="button">
            {t("health.peekWhy")}
          </button>
        </div>
        <div className={`peek-card__face peek-card__face--back peek-card__face--${tone}`} aria-hidden={!open}>
          <div className="peek-card__back">{back}</div>
          <button ref={backButton} className="peek-card__toggle" onClick={toggle} aria-expanded tabIndex={open ? 0 : -1} type="button">
            {t("health.peekClose")}
          </button>
          {open && (
            <span
              key={round}
              className={`peek-card__timer${paused ? " is-paused" : ""}`}
              style={{ "--peek-ms": `${PEEK_MS}ms` } as CSSProperties}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
      <span className="peek-card__live" aria-live="polite">{open ? announce : ""}</span>
    </div>
  );
}
