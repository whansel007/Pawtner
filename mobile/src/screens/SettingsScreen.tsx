import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { Caregiver } from "../types";
import type { EscalationSettingsResponse } from "../../../shared/contract";
import { useEffect, useState } from "react";

export function SettingsScreen({
  back,
  addMedication,
  openCaretaker,
  openReminders,
  caregiver,
  petName,
  demoClockValue,
  onDemoClockChange,
  onRunDemoClock,
  agentBusy,
  escalationSettings,
  onSaveEscalationSettings,
  demoUnlockAll,
  onToggleDemoUnlockAll,
}: {
  back: BackAction;
  addMedication: () => void;
  openCaretaker: () => void;
  openReminders: () => void;
  caregiver: Caregiver;
  petName: string;
  demoClockValue: string;
  onDemoClockChange: (value: string) => void;
  onRunDemoClock: () => void;
  agentBusy: boolean;
  escalationSettings: EscalationSettingsResponse | null;
  onSaveEscalationSettings: (settings: EscalationSettingsResponse) => void;
  demoUnlockAll: boolean;
  onToggleDemoUnlockAll: () => void;
}) {
  const { t } = useTranslation();
  const caretakerName = caregiver.caretakerName;
  const [escalationDraft, setEscalationDraft] = useState<EscalationSettingsResponse>({ optedIn: false, threshold: 2 });
  const [settingsBusy, setSettingsBusy] = useState(false);
  useEffect(() => { if (escalationSettings) setEscalationDraft(escalationSettings); }, [escalationSettings]);
  return (
    <FullCard back={back} className="settings-card">
      <p className="eyebrow green">{t("settings.eyebrow", { name: petName })}</p>
      <h2>{t("settings.title")}</h2>
      <div className="settings-group">
        <button onClick={addMedication}><span className="feature-icon"><Icon name="pill" /></span><div><strong>{t("settings.addMed")}</strong><small>{t("settings.addMedSub")}</small></div><Icon name="chevron" /></button>
        <button onClick={openReminders}><span className="feature-icon sage"><Icon name="bell" /></span><div><strong>{t("settings.nudges", { name: petName })}</strong><small>{t("settings.nudgesSub")}</small></div><Icon name="chevron" /></button>
        <button onClick={openCaretaker}><span className="feature-icon sage"><Icon name="users" /></span><div><strong>{t("settings.caretaker", { caretaker: caretakerName })}</strong><small>{t("settings.caretakerSub", { name: petName })}</small></div><Icon name="chevron" /></button>
      </div>
      <div className="settings-note"><Icon name="heart" /><p><strong>{t("settings.privacyTitle")}</strong><br />{t("settings.privacyBody", { caretaker: caretakerName })}</p></div>
      <div className="demo-clock-card">
        <p className="eyebrow green">Agent demo</p>
        <h3>Demo clock</h3>
        <p>Choose a time to evaluate the dose rules. Nudges are limited to two per scheduled dose.</p>
        <label htmlFor="demo-clock">Simulated local time</label>
        <input id="demo-clock" type="datetime-local" value={demoClockValue} onChange={(event) => onDemoClockChange(event.target.value)} />
        <button className="primary-button" disabled={agentBusy || !demoClockValue} onClick={onRunDemoClock}>{agentBusy ? "Checking…" : "Run agent at this time"}</button>
      </div>
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
      <div className="demo-clock-card demo-unlock-card">
        <p className="eyebrow green">{t("settings.demoEyebrow")}</p>
        <label className="consent-toggle">
          <input type="checkbox" checked={demoUnlockAll} onChange={onToggleDemoUnlockAll} />
          {t("settings.demoUnlockAll")}
        </label>
      </div>
    </FullCard>
  );
}
