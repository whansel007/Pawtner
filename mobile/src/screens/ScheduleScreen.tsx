import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { NudgeSettings } from "../types";

export function ScheduleScreen({
  onBack,
  onConfirm,
  nudgeSettings,
  petName,
}: {
  onBack: () => void;
  onConfirm: () => void;
  nudgeSettings: NudgeSettings;
  petName: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="content-card full-card">
      <button className="back-button" onClick={onBack}><Icon name="back" size={20} /> {t("schedule.back")}</button>
      <p className="eyebrow green">{t("schedule.eyebrow")}</p>
      <h2>{t("schedule.title", { name: petName })}</h2>
      <p className="supporting">{t("schedule.supporting")}</p>
      {nudgeSettings.slots.map((slot) => (
        <div className="schedule-choice" key={slot.label}><span>{slot.label}</span><strong>{slot.time}</strong><small>{slot.note}</small><Icon name="chevron" /></div>
      ))}
      <div className="dog-message"><Icon name="bell" /><p><strong>{nudgeSettings.message}</strong><br />{t("schedule.noAlarm")}</p></div>
      <button className="primary-button" onClick={onConfirm}>{t("schedule.confirm", { name: petName })}</button>
    </section>
  );
}
