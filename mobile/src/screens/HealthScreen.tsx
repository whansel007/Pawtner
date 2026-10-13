import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask, WeekSummary } from "../types";

export function HealthScreen({
  goHome,
  bpLogged,
  logBp,
  onScreening,
  onSummary,
  bloodPressureReading,
  screeningInfo,
  activityLink,
  clinicTasks,
  weekSummary,
  petName,
}: {
  goHome: () => void;
  bpLogged: boolean;
  logBp: () => void;
  onScreening: () => void;
  onSummary: () => void;
  bloodPressureReading: BloodPressureReading;
  screeningInfo: ScreeningInfo;
  activityLink: ActivityLink;
  clinicTasks: ClinicTask;
  weekSummary: WeekSummary;
  petName: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="content-card full-card">
      <button className="back-button" onClick={goHome}><Icon name="back" size={20} /> {t("common.home")}</button>
      <p className="eyebrow green">{t("health.eyebrow")}</p>
      <h2>{t("health.title")}</h2>
      <div className={`metric-card ${bpLogged ? "complete" : ""}`}>
        <span className="feature-icon sage"><Icon name="heart" /></span>
        <div><small>{t("health.bpLabel")}</small><h3>{bpLogged ? `${bloodPressureReading.systolic} / ${bloodPressureReading.diastolic}` : t("health.bpNeedsReading", { name: petName })}</h3><p>{bpLogged ? bloodPressureReading.note : bloodPressureReading.pendingNote}</p></div>
        <button onClick={logBp}>{bpLogged ? <Icon name="check" /> : t("common.log")}</button>
      </div>
      <button className="health-bubble" onClick={onSummary}><span className="feature-icon sage"><Icon name="book" /></span><div><strong>{t("health.weekSummary")}</strong><small>{t("health.weekSummarySub", { doses: weekSummary.metrics[0].value, walks: weekSummary.metrics[1].value })}</small></div><Icon name="chevron" /></button>
      <button className="health-bubble"><span className="feature-icon"><Icon name="camera" /></span><div><strong>{clinicTasks.title}</strong><small>{clinicTasks.subtitle}</small></div><Icon name="chevron" /></button>
      <button className="screening-card" onClick={onScreening}><span>{t("health.annualCheck")}</span><div><strong>{t("health.screeningTitle")}</strong><small>{t("health.screeningSub")}</small></div><Icon name="chevron" /></button>
      <a className="activity-link" href={activityLink.url} target="_blank" rel="noreferrer"><span className="feature-icon sage"><Icon name="walk" /></span><div><strong>{activityLink.title}</strong><small>{activityLink.subtitle}</small></div><Icon name="chevron" /></a>
    </section>
  );
}
