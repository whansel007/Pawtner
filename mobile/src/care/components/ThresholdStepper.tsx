import { useTranslation } from "react-i18next";

interface ThresholdStepperProps {
  value: number;
  /** False shows the value only (updates-only viewer, no consent, offline). */
  editable: boolean;
  canDecrease: boolean;
  busy: boolean;
  onStep: (delta: -1 | 1) => void;
}

/** "Send a check-in after N missed doses in a row". The caller owns the minimum and saving. */
export function ThresholdStepper({ value, editable, canDecrease, busy, onStep }: ThresholdStepperProps) {
  const { t } = useTranslation();
  const valueLabel = t("care.web.alerts.stepperValue", { count: value });
  return (
    <div className="care-stepper-row">
      <div>
        <p className="care-stepper-row__lead" id="care-threshold-lead">{t("care.web.alerts.stepperLead")}</p>
        <p className="care-stepper-row__unit">{t("care.web.alerts.stepperUnit")}</p>
      </div>
      {editable ? (
        <div className="care-stepper" role="group" aria-labelledby="care-threshold-lead">
          <button type="button" onClick={() => onStep(-1)} disabled={!canDecrease || busy} aria-label={t("care.web.alerts.decrease")}>−</button>
          <output aria-live="polite" aria-label={valueLabel}>{value}</output>
          <button type="button" onClick={() => onStep(1)} disabled={busy} aria-label={t("care.web.alerts.increase")}>+</button>
        </div>
      ) : (
        <p className="care-stepper care-stepper--readonly" aria-label={valueLabel}>
          <span aria-hidden="true">{value}</span>
        </p>
      )}
    </div>
  );
}
