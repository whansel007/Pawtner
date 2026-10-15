import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentDecision } from "../../../shared/contract";
import { SENIOR_TIMEZONE } from "../config/scene";
import { explainDecision, type WhyFact } from "../lib/decisions";
import { useRevealWhenOpen } from "../lib/useRevealWhenOpen";
import "./DecisionLogCard.css";

const timeFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: SENIOR_TIMEZONE });

/**
 * One DecisionLogCard for Home (urgent decisions), Milestones (routine decisions) and Health.
 * - When `decision` is null, shows an en.json empty state.
 * - When `decision` is present, shows the "Why?" toggle with a plain-language explanation: a reason sentence
 *   from en.json and only the observations config/decisions.ts allows (lib/decisions.ts explainDecision).
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
  const wordingLabel = decision.wordingSource === "template"
    ? t("decisionLog.wordingTemplate")
    : t("decisionLog.wordingModel");

  function formatFact(fact: WhyFact): string {
    if (fact.format === "yesNo") return fact.value ? t("decisionLog.booleanYes") : t("decisionLog.booleanNo");
    if (fact.format === "time") return timeFormat.format(new Date(String(fact.value)));
    return String(fact.value);
  }

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
          {why.facts.length > 0 && (
            <div className="decision-log__section">
              <p className="decision-log__section-label">{t("decisionLog.observationsLabel")}</p>
              <dl>
                {why.facts.map((fact) => (
                  <div className="decision-log__row" key={fact.labelKey}>
                    <dt>{t(fact.labelKey)}</dt>
                    <dd>{formatFact(fact)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <dl>
            <div className="decision-log__row">
              <dt>{t("decisionLog.wordingSourceLabel")}</dt>
              <dd>{wordingLabel}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
