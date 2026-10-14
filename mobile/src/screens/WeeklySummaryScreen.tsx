import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { WeekSummary } from "../types";

export function WeeklySummaryScreen({
  onBack,
  weekSummary,
}: {
  onBack: () => void;
  weekSummary: WeekSummary;
}) {
  const { t } = useTranslation();
  return (
    <section className="content-card full-card">
      <button className="back-button" onClick={onBack}><Icon name="back" size={20} /> {t("summary.back")}</button>
      <p className="eyebrow green">{t("summary.eyebrow")}</p>
      <h2>{t("summary.title")}</h2>
      <div className="summary-score"><strong>{weekSummary.rating}</strong><span>{t("summary.caringDays", { count: weekSummary.caringDays, total: weekSummary.totalDays })}</span></div>
      <div className="summary-grid">
        {weekSummary.metrics.map((metric) => (
          <article key={metric.label}><strong>{metric.value}</strong><small>{metric.label}</small></article>
        ))}
      </div>
      <div className="doctor-question"><Icon name="book" /><div><small>{t("summary.askDoctor")}</small><p>{weekSummary.doctorQuestion}</p></div></div>
      <button className="primary-button" onClick={onBack}>{t("summary.doneReading")}</button>
    </section>
  );
}
