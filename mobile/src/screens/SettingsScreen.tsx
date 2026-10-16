import { SENIOR_TIMEZONE } from "../config/scene";
import type { HealthMetric } from "../../../shared/contract";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { Caregiver } from "../types";
import type { EscalationSettingsResponse } from "../../../shared/contract";
import { DEMO_RESET_PRESET, DEMO_TIME_PRESETS, type DemoTimePreset, DEMO_UNLOCKS, type DemoUnlockKey } from "../config/demo";
import { formatClockTime, parseDemoTime } from "../lib/demoTime";
import { useEffect, useState } from "react";

export function SettingsScreen({
  back,
  openMedicines,
  addMedication,
  openReminders,
  caregiver,
  petName,
  demoClockValue,
  onDemoClockChange,
  onRunDemoClock,
  agentBusy,
  escalationSettings,
  onSaveEscalationSettings,
  demoUnlocks,
  onToggleDemoUnlock,
  activeTimePreset,
  onDemoTime,
  onResetDemo,
  shareBloodPressure,
  onShareBloodPressure,
  firstReading,
}: {
  back: BackAction;
  /** "My medicines": the medicine list with Edit and the original pill photo (T2-08). */
  openMedicines: () => void;
  addMedication: () => void;
  openReminders: () => void;
  caregiver: Caregiver;
  petName: string;
  demoClockValue: string;
  onDemoClockChange: (value: string) => void;
  onRunDemoClock: () => void;
  agentBusy: boolean;
  escalationSettings: EscalationSettingsResponse | null;
  onSaveEscalationSettings: (settings: EscalationSettingsResponse) => void;
  /** Demo tick boxes that are on ("7 days", "20 hearts", "40 hearts", config/demo.ts DEMO_UNLOCKS). */
  demoUnlocks: ReadonlySet<DemoUnlockKey>;
  onToggleDemoUnlock: (key: DemoUnlockKey) => void;
  /** The Morning / Evening button currently on, or null (real time). Tapping it again goes back to real time. */
  activeTimePreset: DemoTimePreset | null;
  /** Jump to a preset time today, or back to real time (null). Never runs the agent. */
  onDemoTime: (preset: DemoTimePreset | null) => void;
  /** "Reset to morning": today's doses, readings and decisions cleared (API), this phone's demo choices too, clock at 9:00. */
  onResetDemo: () => void;
  /** "Share my blood pressure with {{caretaker}}" (lib/sharing.ts). */
  shareBloodPressure: boolean;
  onShareBloodPressure: (value: boolean) => void;
  /** Her first blood-pressure reading (every reading is compared with it), or null before any. */
  firstReading: HealthMetric | null;
}) {
  const { t } = useTranslation();
  const caretakerName = caregiver.caretakerName;
  const [escalationDraft, setEscalationDraft] = useState<EscalationSettingsResponse>({ optedIn: false, threshold: 2 });
  const [settingsBusy, setSettingsBusy] = useState(false);
  useEffect(() => { if (escalationSettings) setEscalationDraft(escalationSettings); }, [escalationSettings]);
  const resetTime = parseDemoTime(DEMO_TIME_PRESETS[DEMO_RESET_PRESET], DEMO_TIME_PRESETS);
  return (
    <FullCard back={back} className="settings-card">
      <p className="eyebrow green">{t("settings.eyebrow", { name: petName })}</p>
      <h2>{t("settings.title")}</h2>
      <div className="settings-group">
        <button onClick={openMedicines}><span className="feature-icon"><Icon name="pill" /></span><div><strong>{t("settings.myMeds")}</strong><small>{t("settings.myMedsSub")}</small></div><Icon name="chevron" /></button>
        <button onClick={addMedication}><span className="feature-icon"><Icon name="plus" /></span><div><strong>{t("settings.addMed")}</strong><small>{t("settings.addMedSub")}</small></div><Icon name="chevron" /></button>
        <button onClick={openReminders}><span className="feature-icon sage"><Icon name="bell" /></span><div><strong>{t("settings.nudges", { name: petName })}</strong><small>{t("settings.nudgesSub")}</small></div><Icon name="chevron" /></button>
        {/* Information only: the caretaker's view lives on /care, not on the senior's phone. */}
        <div className="settings-info"><span className="feature-icon sage"><Icon name="users" /></span><div><strong>{t("settings.caretaker", { caretaker: caretakerName })}</strong><small>{t("settings.caretakerSub", { name: petName })}</small></div></div>
      </div>
      <label className="settings-share">
        <input type="checkbox" checked={shareBloodPressure} onChange={(event) => onShareBloodPressure(event.target.checked)} />
        <span>
          <strong>{t("settings.shareBp", { caretaker: caretakerName })}</strong>
          <small>{t("settings.shareBpSub", { caretaker: caretakerName })}</small>
          {firstReading && (
            <small className="settings-share__first">{t("settings.firstReading", { systolic: firstReading.systolic, diastolic: firstReading.diastolic, day: new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", timeZone: SENIOR_TIMEZONE }).format(new Date(firstReading.recordedAt)) })}</small>
          )}
        </span>
      </label>
      <div className="settings-note"><Icon name="heart" /><p><strong>{t("settings.privacyTitle")}</strong></p></div>
            <div className="demo-clock-card escalation-settings-card">
        <p className="eyebrow green">Caretaker check-ins</p>
        <h3>Escalation settings</h3>
        <label className="consent-toggle"><input type="checkbox" checked={escalationDraft.optedIn} onChange={(event) => setEscalationDraft((current) => ({ ...current, optedIn: event.target.checked }))} /> Allow {caretakerName} to check in after repeated missed doses</label>
        <label htmlFor="missed-dose-threshold">Check in after</label>
        <select id="missed-dose-threshold" value={escalationDraft.threshold} onChange={(event) => setEscalationDraft((current) => ({ ...current, threshold: Math.max(2, Number(event.target.value)) }))}>
          {[2, 3, 4, 5].map((threshold) => <option key={threshold} value={threshold}>{threshold} consecutive missed doses</option>)}
        </select>
        <p>Check-ins never include medicine names. The minimum threshold is two missed doses.</p>
        <button className="primary-button" disabled={!escalationSettings || settingsBusy} onClick={async () => { setSettingsBusy(true); try { await onSaveEscalationSettings(escalationDraft); } finally { setSettingsBusy(false); } }}>{settingsBusy ? "Saving…" : "Save check-in settings"}</button>
      </div>
      {/* Every demo-only control in one closed card (user, 16 Oct: people kept tapping them by mistake). */}
      <details className="demo-clock-card demo-panel">
        <summary>
          <span>
            <span className="eyebrow green">{t("settings.demoEyebrow")}</span>
            <strong>{t("settings.demoTitle")}</strong>
            <small>{t("settings.demoSub")}</small>
          </span>
          <Icon name="chevron" />
        </summary>
        <div className="demo-panel__body">
          <section className="demo-panel__section">
            <h3>{t("settings.demoResetTitle")}</h3>
            <p>{t("settings.demoResetHint", { time: resetTime ? formatClockTime(resetTime) : DEMO_TIME_PRESETS[DEMO_RESET_PRESET], name: petName })}</p>
            <button type="button" className="secondary-button" onClick={onResetDemo}>{t("settings.demoReset", { time: resetTime ? formatClockTime(resetTime) : DEMO_TIME_PRESETS[DEMO_RESET_PRESET] })}</button>
          </section>
          <section className="demo-panel__section">
            <h3>{t("settings.demoTimeTitle")}</h3>
            <p>{t("settings.demoTimeHint")}</p>
            <div className="demo-time-buttons">
              {(Object.keys(DEMO_TIME_PRESETS) as DemoTimePreset[]).map((preset) => {
                const time = parseDemoTime(DEMO_TIME_PRESETS[preset], DEMO_TIME_PRESETS);
                return (
                  <button key={preset} type="button" className={`secondary-button ${activeTimePreset === preset ? "is-active" : ""}`} aria-pressed={activeTimePreset === preset} onClick={() => onDemoTime(activeTimePreset === preset ? null : preset)}>
                    {t(`settings.demoTime.${preset}`, { time: time ? formatClockTime(time) : DEMO_TIME_PRESETS[preset] })}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="demo-panel__section">
            <h3>{t("settings.demoUnlockTitle")}</h3>
            <p>{t("settings.demoUnlockHint")}</p>
            <div className="demo-unlocks">
              {DEMO_UNLOCKS.map((unlock) => (
                <label className="consent-toggle" key={unlock.key}>
                  <input type="checkbox" checked={demoUnlocks.has(unlock.key)} onChange={() => onToggleDemoUnlock(unlock.key)} />
                  {t(`settings.demoUnlock.${unlock.key}`)}
                </label>
              ))}
            </div>
          </section>
          <section className="demo-panel__section">
            <h3>{t("settings.demoClockTitle")}</h3>
            <p>{t("settings.demoClockHint")}</p>
            <label htmlFor="demo-clock">{t("settings.demoClockLabel")}</label>
            <input id="demo-clock" type="datetime-local" value={demoClockValue} onChange={(event) => onDemoClockChange(event.target.value)} />
            <button className="primary-button" disabled={agentBusy || !demoClockValue} onClick={onRunDemoClock}>{agentBusy ? t("settings.demoClockBusy") : t("settings.demoClockRun")}</button>
          </section>
        </div>
      </details>
    </FullCard>
  );
}
