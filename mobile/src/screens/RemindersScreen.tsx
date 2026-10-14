import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { Dose } from "../types";

export function RemindersScreen({
  goHome,
  doses,
}: {
  goHome: () => void;
  doses: Dose[];
}) {
  const { t } = useTranslation();
  return (
    <section className="content-card full-card">
      <button className="back-button" onClick={goHome}><Icon name="back" size={20} /> {t("common.home")}</button>
      <p className="eyebrow green">{t("reminders.eyebrow")}</p>
      <h2>{t("reminders.title")}</h2>
      <div className="next-dose">
        <span className="feature-icon sage"><Icon name="bell" /></span>
        <div><small>{t("reminders.nextDose")}</small><h3>{t("reminders.nextDoseTime")}</h3><p>{t("reminders.nextDoseName")}</p></div>
      </div>
      <div className="section-title"><h3>{t("reminders.today")}</h3><span>{t("reminders.todayDate")}</span></div>
      <div className="timeline">
        {doses.map((medicine, index) => (
          <article key={medicine.time}>
            <span className={`timeline-dot ${index < 1 ? "complete" : ""}`} />
            <time>{medicine.time}</time>
            <div><h3>{medicine.name}</h3><p>{medicine.dose}</p></div>
            <span className={`status-tag ${index === 1 ? "now" : ""}`}>{index === 0 ? t("reminders.statusDone") : index === 1 ? t("reminders.statusSoon") : t("reminders.statusLater")}</span>
          </article>
        ))}
      </div>
      <button className="primary-button"><Icon name="plus" size={20} /> {t("reminders.add")}</button>
    </section>
  );
}
