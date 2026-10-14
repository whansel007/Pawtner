import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentDecision } from "../../../shared/contract";
import "./DecisionLogCard.css";

/**
 * One DecisionLogCard for Home and Health.
 * - When `decision` is null, shows an en.json empty state (Home before any decision).
 * - When `decision` is present, shows the "Why?" toggle with the full decision log.
 * - `summary` (Home) puts the decision's wording on the same row as the toggle.
 */
export function DecisionLogCard({ decision, summary }: { decision: AgentDecision | null; summary?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!decision) {
    return (
      <div className="decision-log decision-log--empty">
        <strong>{t("decisionLog.emptyTitle")}</strong>
        <p>{t("decisionLog.emptyBody")}</p>
      </div>
    );
  }

  const wordingLabel = decision.wordingSource === "template"
    ? t("decisionLog.wordingTemplate")
    : t("decisionLog.wordingModel");

  function formatValue(value: string | number | boolean | null): string {
    if (typeof value === "boolean") return value ? t("decisionLog.booleanYes") : t("decisionLog.booleanNo");
    if (value === null) return "—";
    return String(value);
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
        <dl className="decision-log__body">
          <div className="decision-log__row">
            <dt>{t("decisionLog.ruleLabel")}</dt>
            <dd>{decision.ruleId}</dd>
          </div>
          {decision.scheduledFor && (
            <div className="decision-log__row">
              <dt>{t("decisionLog.scheduledForLabel")}</dt>
              <dd>{decision.scheduledFor}</dd>
            </div>
          )}
          <div className="decision-log__section">
            <dt className="decision-log__section-label">{t("decisionLog.observationsLabel")}</dt>
            {Object.entries(decision.observations).map(([key, value]) => {
              const label = t(`decisionLog.observation.${key}`, { defaultValue: key });
              return (
                <div className="decision-log__row" key={key}>
                  <dt>{label}</dt>
                  <dd>{formatValue(value)}</dd>
                </div>
              );
            })}
          </div>
          <div className="decision-log__row">
            <dt>{t("decisionLog.reasoningLabel")}</dt>
            <dd>{decision.reasoning}</dd>
          </div>
          <div className="decision-log__row">
            <dt>{t("decisionLog.wordingSourceLabel")}</dt>
            <dd>{wordingLabel}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
