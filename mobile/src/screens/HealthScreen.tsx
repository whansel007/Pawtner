import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { ActionRow } from "../components/ActionRow";
import { ClinicMemoRow } from "../components/ClinicMemoRow";
import type { BackAction } from "../lib/navigation";
import { DecisionLogCard } from "../components/DecisionLogCard";
import { BP_RANGE } from "../config/bp";
import { EMERGENCY_PHONE } from "../config/health";
import type { AgentDecision, HealthMetric } from "../../../shared/contract";
import type { BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask, WeekSummary } from "../types";
import "./HealthScreen.css";

export function HealthScreen({
  back,
  bpLogged,
  healthMetrics,
  latestDecision,
  onLogBp,
  onScreening,
  onSummary,
  bloodPressureReading,
  screeningInfo,
  activityLink,
  clinicTasks,
  weekSummary,
  petName,
  visitNoteLatest,
  onVisitNotes,
}: {
  back: BackAction;
  bpLogged: boolean;
  healthMetrics: HealthMetric[];
  latestDecision: AgentDecision | null;
  onLogBp: (metric: HealthMetric) => void;
  onScreening: () => void;
  onSummary: () => void;
  bloodPressureReading: BloodPressureReading;
  screeningInfo: ScreeningInfo;
  activityLink: ActivityLink;
  clinicTasks: ClinicTask;
  weekSummary: WeekSummary;
  petName: string;
  /** Newest "For my next visit" note (her own words), or null. */
  visitNoteLatest: string | null;
  onVisitNotes: () => void;
}) {
  const { t } = useTranslation();
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const lastMetric = healthMetrics.length > 0
    ? [...healthMetrics].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0]
    : null;

  function validate(): { ok: true; sys: number; dia: number } | { ok: false; msg: string } {
    if (!systolic.trim() || !diastolic.trim()) {
      return { ok: false, msg: t("health.bpErrorBothRequired") };
    }
    const sys = Number(systolic);
    const dia = Number(diastolic);
    if (!Number.isInteger(sys) || !Number.isInteger(dia)) {
      return { ok: false, msg: t("health.bpErrorWhole", {
        sysMin: BP_RANGE.systolic.min, sysMax: BP_RANGE.systolic.max,
        diaMin: BP_RANGE.diastolic.min, diaMax: BP_RANGE.diastolic.max,
      }) };
    }
    if (sys < BP_RANGE.systolic.min || sys > BP_RANGE.systolic.max) {
      return { ok: false, msg: t("health.bpErrorSystolic", { min: BP_RANGE.systolic.min, max: BP_RANGE.systolic.max }) };
    }
    if (dia < BP_RANGE.diastolic.min || dia > BP_RANGE.diastolic.max) {
      return { ok: false, msg: t("health.bpErrorDiastolic", { min: BP_RANGE.diastolic.min, max: BP_RANGE.diastolic.max }) };
    }
    return { ok: true, sys, dia };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (!result.ok) {
      setError(result.msg);
      return;
    }
    setError(null);
    const metric: HealthMetric = {
      id: `bp-${Date.now()}`,
      kind: "blood_pressure",
      systolic: result.sys,
      diastolic: result.dia,
      note: note.trim() || null,
      recordedAt: new Date().toISOString(),
    };
    onLogBp(metric);
    setSystolic("");
    setDiastolic("");
    setNote("");
  }

  const isEmergency = latestDecision?.decision === "emergency_995";
  const isSeeGp = latestDecision?.decision === "see_gp_soon";
  const showResult = isEmergency || isSeeGp;

  // Scroll the result card into view after the decision arrives, without smooth scroll under reduced motion.
  useEffect(() => {
    if (!showResult || !resultRef.current) return;
    const prefersReduced = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    resultRef.current.focus({ preventScroll: true });
  }, [showResult]);

  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("health.eyebrow")}</p>
      <h2>{t("health.title")}</h2>

      <div className={`metric-card ${bpLogged ? "complete" : ""}`}>
        <span className="feature-icon sage"><Icon name="heart" /></span>
        <div>
          <small>{t("health.bpLabel")}</small>
          <h3>{lastMetric ? `${lastMetric.systolic} / ${lastMetric.diastolic}` : t("health.bpNeedsReading", { name: petName })}</h3>
          <p>{lastMetric?.note ?? (bpLogged ? bloodPressureReading.note : bloodPressureReading.pendingNote)}</p>
        </div>
      </div>

      {showResult && latestDecision && (
        <div
          ref={resultRef}
          className={`bp-result ${isEmergency ? "bp-result--emergency" : "bp-result--gp"}`}
          tabIndex={-1}
        >
          {isSeeGp && <p className="bp-result__title">{t("health.resultSeeGpTitle")}</p>}
          <p className="bp-result__wording">{latestDecision.wording}</p>
          {isEmergency && (
            <a className="secondary-button bp-result__call" href={`tel:${EMERGENCY_PHONE}`}>
              <Icon name="phone" size={20} /> {t("health.callEmergency", { number: EMERGENCY_PHONE })}
            </a>
          )}
          {/* Urgent decisions (995, see a GP) live here, not on Home; "Why?" sits in the same calm card. Routine ones are on Milestones. */}
          <DecisionLogCard decision={latestDecision} />
        </div>
      )}

      <form className="bp-form" onSubmit={handleSubmit}>
        <p className="bp-form__title">{t("health.bpFormTitle")}</p>
        <div className="bp-form__row">
          <label className="bp-form__field">
            <span className="bp-form__label">{t("health.bpSystolicLabel")}</span>
            <input
              className="bp-form__input"
              type="text"
              inputMode="numeric"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="bp-form__field">
            <span className="bp-form__label">{t("health.bpDiastolicLabel")}</span>
            <input
              className="bp-form__input"
              type="text"
              inputMode="numeric"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
        <label className="bp-form__field">
          <span className="bp-form__label">{t("health.bpNoteLabel")}</span>
          <input
            className="bp-form__input bp-form__input--note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("health.bpNotePlaceholder")}
            autoComplete="off"
          />
        </label>
        {error && <p className="bp-form__error" role="alert">{error}</p>}
        <button className="bp-form__submit" type="submit">{t("health.bpSubmit")}</button>
      </form>

      <ActionRow icon={<Icon name="book" />} title={t("health.weekSummary")} subtitle={t("health.weekSummarySub", { doses: weekSummary.metrics[0].value, walks: weekSummary.metrics[1].value })} onClick={onSummary} />
      <ClinicMemoRow title={clinicTasks.title} />
      <ActionRow icon={<Icon name="note" />} title={t("visitNotes.title")} subtitle={visitNoteLatest ?? t("visitNotes.empty")} onClick={onVisitNotes} />
      <ActionRow icon={<Icon name="star" />} iconTone="peach" tone="warm" title={t("health.screeningTitle")} subtitle={t("health.screeningSub")} onClick={onScreening} />
      <ActionRow icon={<img className="action-row__logo" src={activityLink.logoSrc} alt={activityLink.logoAlt} />} iconTone="white" title={activityLink.title} subtitle={activityLink.subtitle} href={activityLink.url} />
    </FullCard>
  );
}
