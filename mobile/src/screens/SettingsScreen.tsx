import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { Caregiver } from "../types";

export function SettingsScreen({
  goHome,
  addMedication,
  openCaretaker,
  openReminders,
  caregiver,
}: {
  goHome: () => void;
  addMedication: () => void;
  openCaretaker: () => void;
  openReminders: () => void;
  caregiver: Caregiver;
}) {
  const { t } = useTranslation();
  const caretakerName = caregiver.names.split(" + ")[1] || "";
  return (
    <section className="content-card full-card settings-card">
      <button className="back-button" onClick={goHome}><Icon name="back" size={20} /> {t("common.home")}</button>
      <p className="eyebrow green">{t("settings.eyebrow")}</p>
      <h2>{t("settings.title")}</h2>
      <div className="settings-group">
        <button onClick={addMedication}><span className="feature-icon"><Icon name="pill" /></span><div><strong>{t("settings.addMed")}</strong><small>{t("settings.addMedSub")}</small></div><Icon name="chevron" /></button>
        <button onClick={openReminders}><span className="feature-icon sage"><Icon name="bell" /></span><div><strong>{t("settings.nudges")}</strong><small>{t("settings.nudgesSub")}</small></div><Icon name="chevron" /></button>
        <button onClick={openCaretaker}><span className="feature-icon sage"><Icon name="users" /></span><div><strong>{t("settings.caretaker", { name: caretakerName })}</strong><small>{t("settings.caretakerSub")}</small></div><Icon name="chevron" /></button>
      </div>
      <div className="settings-note"><Icon name="heart" /><p><strong>{t("settings.privacyTitle")}</strong><br />{t("settings.privacyBody")}</p></div>
    </section>
  );
}
