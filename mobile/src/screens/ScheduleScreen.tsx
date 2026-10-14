import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { NudgeSettings } from "../types";

export function ScheduleScreen({
  back,
  onConfirm,
  nudgeSettings,
  petName,
}: {
  back: BackAction;
  onConfirm: () => void;
  nudgeSettings: NudgeSettings;
  petName: string;
}) {
  const { t } = useTranslation();
  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("schedule.eyebrow")}</p>
      <h2>{t("schedule.title", { name: petName })}</h2>
      <p className="supporting">{t("schedule.supporting")}</p>
      {nudgeSettings.slots.map((slot) => (
        <div className="schedule-choice" key={slot.label}><span>{slot.label}</span><strong>{slot.time}</strong><small>{slot.note}</small><Icon name="chevron" /></div>
      ))}
      <div className="dog-message"><Icon name="bell" /><p><strong>{nudgeSettings.message}</strong><br />{t("schedule.noAlarm")}</p></div>
      <button className="primary-button" onClick={onConfirm}>{t("schedule.confirm", { name: petName })}</button>
    </FullCard>
  );
}
