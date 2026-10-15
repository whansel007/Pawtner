import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentDecision } from "../../../shared/contract";
import { explainDecision } from "../lib/decisions";
import { useRevealWhenOpen } from "../lib/useRevealWhenOpen";
import "./DecisionLogCard.css";

/**
 * DecisionLogCard for Milestones (routine decisions). Health's urgent card shows its reason directly.
 * - When `decision` is null, shows an en.json empty state.
 * - When `decision` is present, shows the "Why?" toggle with a plain-language reason sentence from en.json
 *   (lib/decisions.ts explainDecision).
 *   Rule ids, machine field names and ids are never shown.
 * - `summary` puts the decision's wording on the same row as the toggle.
 * - Opening "Why?" scrolls the details into view inside the card's scroll area, clear of the bottom nav.
 */
export function DecisionLogCard({ decision, summary }: { decision: AgentDecision | null; summary?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  useRevealWhenOpen(body, open);

  if (!decision) {
    return (
      <div className="decision-log decision-log--empty">
        <strong>{t("decisionLog.emptyTitle")}</strong>
        <p>{t("decisionLog.emptyBody")}</p>
      </div>
    );
  }

  const why = explainDecision(decision);

  return (
    <div className={`decision-log${summary ? " decision-log--summary" : ""}`}>
      {summary && <p className="decision-log__summary">{summary}</p>}
      <button
        className="decision-log__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        type="button"
      >
        {open ? t("decisionLog.whyButtonExpanded") : t("decisionLog.whyButton")}
      </button>
      {open && (
        <div className="decision-log__body" ref={body}>
          <p className="decision-log__reason">{t(why.reasonKey)}</p>
        </div>
      )}
    </div>
  );
}
