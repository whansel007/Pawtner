import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { WeekSummary } from "../types";

export function WeeklySummaryScreen({
  back,
  weekSummary,
  onVisitNotes,
}: {
  back: BackAction;
  weekSummary: WeekSummary;
  /** Opens "For my next visit" so the note can be added or edited there. */
  onVisitNotes: () => void;
}) {
  const { t } = useTranslation();
  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("summary.eyebrow")}</p>
      <h2>{t("summary.title")}</h2>
      <div className="summary-score"><strong>{weekSummary.rating}</strong><span>{t("summary.caringDays", { count: weekSummary.caringDays, total: weekSummary.totalDays })}</span></div>
      <div className="summary-grid">
        {weekSummary.metrics.map((metric) => (
          <article key={metric.label}><strong>{metric.value}</strong><small>{metric.label}</small></article>
        ))}
      </div>
      <button type="button" className="doctor-question" onClick={onVisitNotes}><Icon name="note" /><div><small>{t("summary.askDoctor")}</small><p>{weekSummary.doctorQuestion}</p></div><Icon name="chevron" className="doctor-question__chevron" /></button>
      <button className="primary-button" onClick={back.onBack}>{t("summary.doneReading")}</button>
    </FullCard>
  );
}
