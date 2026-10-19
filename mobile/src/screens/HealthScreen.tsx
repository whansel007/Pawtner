import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { ActionRow } from "../components/ActionRow";
import { ClinicMemoRow } from "../components/ClinicMemoRow";
import type { BackAction } from "../lib/navigation";
import { explainDecision, healthTopDecision, isUrgentDecision } from "../lib/decisions";
import { DecisionLogCard } from "../components/DecisionLogCard";
import { BP_RANGE } from "../config/bp";
import { SYMPTOM_KEYS, type SymptomKey } from "../config/health";
import { buildBpNote } from "../lib/bpNote";
import { bloodPressureProgress } from "../../../shared/rules";
import type { AgentDecision, HealthMetric } from "../../../shared/contract";
import type { BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask } from "../types";
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
  seniorName,
  petName,
  visitNoteLatest,
  onVisitNotes,
  firstReading,
}: {
  back: BackAction;
  bpLogged: boolean;
  healthMetrics: HealthMetric[];
  latestDecision: AgentDecision | null;
  /** Saves the reading (App: API, then the toast); the button shows "Saving…" until it resolves. */
  onLogBp: (metric: HealthMetric) => Promise<void> | void;
  onScreening: () => void;
  onSummary: () => void;
  bloodPressureReading: BloodPressureReading;
  screeningInfo: ScreeningInfo;
  activityLink: ActivityLink;
  clinicTasks: ClinicTask;
  /** The senior's name from data, for the title "{{name}}'s Health Logs". */
  seniorName: string;
  petName: string;
  /** Newest "For my next visit" note (her own words), or null. */
  visitNoteLatest: string | null;
  onVisitNotes: () => void;
  /** Her first blood-pressure reading ever (today.firstBloodPressure, or the earliest local one offline). */
  firstReading: HealthMetric | null;
}) {
  const { t } = useTranslation();
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [note, setNote] = useState("");
  // "How do you feel?" tick boxes: "I feel fine" or any emergency signs (config/health.ts SYMPTOM_KEYS).
  const [feelFine, setFeelFine] = useState(false);
  const [symptoms, setSymptoms] = useState<ReadonlySet<SymptomKey>>(() => new Set());
  const toggleSymptom = (key: SymptomKey) => {
    setFeelFine(false);
    setSymptoms((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };
  const toggleFine = () => { setFeelFine((v) => !v); setSymptoms(new Set()); };
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const diastolicRef = useRef<HTMLInputElement>(null);
  // Right after a save the boxes are empty and the reading shows above; another tap on Save then does nothing
  // (owner, 18 Oct: a second tap used to show "Please enter both numbers" though the reading was saved).
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // A phone keyboard's Enter/Go would submit the whole form from any box (and show "enter both numbers" too early):
  // here it moves to the next box, or closes the keyboard; only "Save reading" saves.
  const enterMovesTo = (next: HTMLInputElement | null) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (next) next.focus(); else event.currentTarget.blur();
  };

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

  // Only a tap on "Save reading" saves: a phone keyboard's action key submits a form even when no Enter keydown
  // arrives (many Android keyboards), so the form's own submit never saves.
  async function handleSave() {
    if (saving || (justSaved && !systolic.trim() && !diastolic.trim())) return;
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
      note: buildBpNote(feelFine ? [t("health.symptoms.fine")] : SYMPTOM_KEYS.filter((key) => symptoms.has(key)).map((key) => t(`health.symptoms.${key}`)), note),
      recordedAt: new Date().toISOString(),
    };
    // The numbers stay in the boxes while it saves; then they clear and App shows the toast.
    setSaving(true);
    try { await onLogBp(metric); } finally { setSaving(false); }
    setJustSaved(true);
    setSystolic("");
    setDiastolic("");
    setNote("");
    setFeelFine(false);
    setSymptoms(new Set());
  }

  // One warning for every condition (owner, 18 Oct); its line names the condition (explainDecision).
  const showResult = isUrgentDecision(latestDecision);

  // Scroll the result card into view after the decision arrives, without smooth scroll under reduced motion.
  useEffect(() => {
    if (!showResult || !resultRef.current) return;
    const prefersReduced = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    resultRef.current.focus({ preventScroll: true });
  }, [showResult]);

  const sideEffect = healthTopDecision(latestDecision);
  return (
    <FullCard back={back}>
      {/* Above the title: only a reading note that may mention a side effect (lib/decisions.ts, owner 18 Oct). */}
      {sideEffect && <DecisionLogCard decision={sideEffect} summary={sideEffect.wording} />}
      <h2>{t("health.title", { name: seniorName })}</h2>

      {/* With a warning, the Warning card replaces this one and carries the reading (owner, 18 Oct: no "Good job" under a Warning). */}
      {!showResult && <div className={`metric-card ${bpLogged ? "complete" : ""}`}>
        <span className="feature-icon sage"><Icon name="heart" /></span>
        <div>
          <small>{t("health.bpLabel")}</small>
          <h3>{lastMetric ? `${lastMetric.systolic} / ${lastMetric.diastolic}` : t("health.bpNeedsReading", { name: petName })}</h3>
          {/* Compared with her first reading (shared/rules.ts bloodPressureProgress): first / keep at it / good job / warning. */}
          <p>{lastMetric ? t(`health.bpProgress.${bloodPressureProgress(lastMetric, firstReading)}`, { name: petName }) : (bpLogged ? bloodPressureReading.note : bloodPressureReading.pendingNote)}</p>
        </div>
      </div>}

      {showResult && latestDecision && (
        <div
          ref={resultRef}
          className="bp-result bp-result--warning"
          tabIndex={-1}
        >
          {/* The warning lives here, not on Home (routine decisions are on Milestones). User, 16 Oct: just "Warning"
              and the plain reason (it follows the condition); no action line, no button, no "Why?". */}
          <p className="bp-result__title">{t("health.warning")}</p>
          {lastMetric && <p className="bp-result__reading">{`${lastMetric.systolic} / ${lastMetric.diastolic}`}</p>}
          <p className="bp-result__wording">{t(explainDecision(latestDecision).reasonKey)}</p>
          <p className="bp-result__disclaimer">{t("health.warningNotAdvice")}</p>
        </div>
      )}

      <form className="bp-form" onSubmit={(e) => e.preventDefault()}>
        <p className="bp-form__title">{t("health.bpFormTitle")}</p>
        <div className="bp-form__row">
          <label className="bp-form__field">
            <span className="bp-form__label">{t("health.bpSystolicLabel")}</span>
            <input
              className="bp-form__input"
              type="text"
              inputMode="numeric"
              value={systolic}
              onChange={(e) => { setSystolic(e.target.value); setError(null); setJustSaved(false); }}
              onKeyDown={(e) => enterMovesTo(diastolicRef.current)(e)}
              enterKeyHint="next"
              autoComplete="off"
            />
          </label>
          <label className="bp-form__field">
            <span className="bp-form__label">{t("health.bpDiastolicLabel")}</span>
            <input
              className="bp-form__input"
              type="text"
              inputMode="numeric"
              ref={diastolicRef}
              value={diastolic}
              onChange={(e) => { setDiastolic(e.target.value); setError(null); setJustSaved(false); }}
              onKeyDown={enterMovesTo(null)}
              enterKeyHint="done"
              autoComplete="off"
            />
          </label>
        </div>
        <fieldset className="bp-form__feelings">
          <legend className="bp-form__label">{t("health.symptomsTitle")}</legend>
          <label className="bp-form__feeling bp-form__feeling--fine">
            <input type="checkbox" checked={feelFine} onChange={toggleFine} />
            {t("health.symptoms.fine")}
          </label>
          {SYMPTOM_KEYS.map((key) => (
            <label className="bp-form__feeling" key={key}>
              <input type="checkbox" checked={symptoms.has(key)} onChange={() => toggleSymptom(key)} />
              {t(`health.symptoms.${key}`)}
            </label>
          ))}
        </fieldset>
        <label className="bp-form__field">
          <span className="bp-form__label">{t("health.bpNoteLabel")}</span>
          <input
            className="bp-form__input bp-form__input--note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={enterMovesTo(null)}
            enterKeyHint="done"
            placeholder={t("health.bpNotePlaceholder")}
            autoComplete="off"
          />
        </label>
        {error && <p className="bp-form__error" role="alert">{error}</p>}
        <button className="bp-form__submit" type="button" disabled={saving} onClick={() => void handleSave()}>{saving ? t("health.bpSaving") : t("health.bpSubmit")}</button>
      </form>

      <ActionRow icon={<Icon name="book" />} title={t("health.weekSummary")} onClick={onSummary} />
      <ClinicMemoRow title={clinicTasks.title} />
      <ActionRow icon={<Icon name="note" />} title={t("visitNotes.title")} subtitle={visitNoteLatest ?? t("visitNotes.empty")} onClick={onVisitNotes} />
      <ActionRow icon={<Icon name="star" />} iconTone="peach" tone="warm" title={t("health.screeningTitle")} subtitle={t("health.screeningSub")} onClick={onScreening} />
      <ActionRow icon={<img className="action-row__logo" src={activityLink.logoSrc} alt={activityLink.logoAlt} />} iconTone="white" title={activityLink.title} subtitle={activityLink.subtitle} href={activityLink.url} />
    </FullCard>
  );
}
