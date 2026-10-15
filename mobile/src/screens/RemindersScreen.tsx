import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { DerivedDose } from "../../../shared/contract";
import { formatDoseTime } from "../lib/doses";

export function RemindersScreen({
  back,
  doses,
}: {
  back: BackAction;
  doses: DerivedDose[];
}) {
  const { t } = useTranslation();
  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("reminders.eyebrow")}</p>
      <h2>{t("reminders.title")}</h2>
      <div className="next-dose">
        <span className="feature-icon sage"><Icon name="bell" /></span>
        <div><small>{t("reminders.nextDose")}</small><h3>{t("reminders.nextDoseTime")}</h3><p>{t("reminders.nextDoseName")}</p></div>
      </div>
      <div className="section-title"><h3>{t("reminders.today")}</h3><span>{t("reminders.todayDate")}</span></div>
      <div className="timeline">
        {doses.map((dose, index) => (
          <article key={dose.id}>
            <span className={`timeline-dot ${dose.status === "taken" ? "complete" : ""}`} />
            <time>{formatDoseTime(dose.scheduledAt)}</time>
            <div><h3>{dose.medicationName}</h3><p>{dose.strength ?? ""}</p></div>
            <span className={`status-tag ${dose.status === "due" ? "now" : ""}`}>{dose.status === "taken" ? t("reminders.statusDone") : dose.status === "due" ? t("reminders.statusSoon") : t("reminders.statusLater")}</span>
          </article>
        ))}
      </div>
      <button className="primary-button"><Icon name="plus" size={20} /> {t("reminders.add")}</button>
    </FullCard>
  );
}
