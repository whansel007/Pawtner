import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard, type CardSheet } from "../components/FullCard";
import { ActionRow } from "../components/ActionRow";
import { ClinicMemoRow } from "../components/ClinicMemoRow";
import type { BackAction } from "../lib/navigation";
import { bpCardLineKey, explainDecision, SIDE_EFFECT_PROMPT, type HealthTopCard } from "../lib/decisions";
import { PeekCard } from "../components/PeekCard";
import { BP_RANGE } from "../config/bp";
import { SYMPTOM_KEYS, type SymptomKey } from "../config/health";
import { buildBpNote } from "../lib/bpNote";
import { bloodPressureProgress } from "../../../shared/rules";
import type { AgentDecision, HealthMetric } from "../../../shared/contract";
import type { BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask } from "../types";
import "./HealthScreen.css";

export function HealthScreen({
  back,
  sheet,
  bpLogged,
  healthMetrics,
  onLogBp,
  onScreening,
  onSummary,
  bloodPressureReading,
  screeningInfo,
  activityLink,
  clinicTasks,
  seniorName,
  topCard,
  petName,
  visitNoteLatest,
  onVisitNotes,
  onBpLog,
  firstReading,
}: {
  back: BackAction;
  /** Set when this screen's card drags like Home (App, config/homeView.ts CARD_SHEET). */
  sheet?: CardSheet;
  bpLogged: boolean;
  healthMetrics: HealthMetric[];
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
  /** The card at the top today: a warning, a side-effect note, or none (lib/decisions.ts healthTopCard). */
  topCard: HealthTopCard<AgentDecision>;
  petName: string;
  /** Newest "For my next visit" note (her own words), or null. */
  visitNoteLatest: string | null;
  onVisitNotes: () => void;
  /** Opens the blood-pressure log. */
  onBpLog: () => void;
  /** Her first blood-pressure reading ever (today.firstBloodPressure, or the earliest local one offline). */
  firstReading: HealthMetric | null;
}) {
  const { t } = useTranslation();
  const heading = { eyebrow: t("health.eyebrow", { name: seniorName }), title: t("health.title") };
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
  const warning = topCard?.kind === "warning" ? topCard.decision : null;
  const reading = lastMetric ? `${lastMetric.systolic} / ${lastMetric.diastolic}` : null;
  const warningReason = warning ? t(explainDecision(warning).reasonKey) : "";
  const sideEffectReason = t(explainDecision({ ruleId: "possible_side_effect_note" }).reasonKey);
  const bpLine = bpCardLineKey(lastMetric ?? null, firstReading, warning);

  // Bring the top card into view when a warning arrives, without smooth scroll under reduced motion.
  useEffect(() => {
    if (!warning || !resultRef.current) return;
    const prefersReduced = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }, [warning]);

  return (
    <FullCard back={back} sheet={sheet} heading={heading}>
      {/* Same two lines as Milestones ("BUDDY IS LEARNING"): "ROSE'S" / "Health Logs". */}
      <p className="eyebrow green">{heading.eyebrow}</p>
      <h2>{heading.title}</h2>
      {/* Under the title (owner, 18 Oct: "title will start first"), only on a warning or side-effect day: Buddy's
          message + "Why?", which shows the Warning card or the side-effect reason for a moment ("peekaboo"). */}
      <div ref={resultRef}>
        {warning && (
          <PeekCard
            tone="warning"
            message={t("health.warningFront")}
            announce={[`${t("health.warning")}.`, reading ? `${reading}.` : "", warningReason, t("health.warningNotAdvice")].filter(Boolean).join(" ")}
            back={(
              <>
                <p className="peek-warning__head">
                  <span className="peek-warning__title">{t("health.warning")}</span>
                  {reading && <span className="peek-warning__reading">{reading}</span>}
                </p>
                <p className="peek-card__reason">{warningReason}</p>
                <p className="peek-warning__note">{t("health.warningNotAdvice")}</p>
              </>
            )}
          />
        )}
        {topCard?.kind === "sideEffect" && (
          <PeekCard message={SIDE_EFFECT_PROMPT} announce={sideEffectReason} back={<p className="peek-card__reason">{sideEffectReason}</p>} />
        )}
      </div>

      {/* Always shown, also on a warning day: the latest reading in bold and its line (a warning reads "higher than your first reading"). */}
      <div className={`metric-card ${bpLogged ? "complete" : ""}`}>
        <span className="feature-icon sage"><Icon name="heart" /></span>
        <div>
          <small>{t("health.bpLabel")}</small>
          <h3>{lastMetric ? `${lastMetric.systolic} / ${lastMetric.diastolic}` : t("health.bpNeedsReading", { name: petName })}</h3>
          {/* Compared with her first reading (shared/rules.ts bloodPressureProgress): first / keep at it / good job / warning. */}
          {/* lib/decisions.ts bpCardLineKey: follows the warning on a warning day, else compares with her first reading. */}
          <p>{bpLine ? t(bpLine, { name: petName }) : (bpLogged ? bloodPressureReading.note : bloodPressureReading.pendingNote)}</p>
        </div>
      </div>

      {/* Every reading of the last days, on its own screen (BpLogScreen). */}
      <ActionRow icon={<Icon name="stats" />} title={t("bpLog.row")} onClick={onBpLog} />

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
