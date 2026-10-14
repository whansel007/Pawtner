import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentDecision } from "../../../shared/contract";
import "./DecisionLogCard.css";

export function DecisionLogCard({ decision }: { decision: AgentDecision }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const wordingLabel = decision.wordingSource === "template"
    ? t("decisionLog.wordingTemplate")
    : t("decisionLog.wordingModel");

  function formatValue(value: string | number | boolean | null): string {
    if (typeof value === "boolean") return value ? t("decisionLog.booleanYes") : t("decisionLog.booleanNo");
    if (value === null) return "—";
    return String(value);
  }

  return (
    <div className="decision-log">
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
