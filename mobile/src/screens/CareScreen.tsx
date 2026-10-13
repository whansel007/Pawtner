import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { Caregiver, CareActivity, RestockAlert, Pet } from "../types";

export function CareScreen({
  goHome,
  sendTreat,
  pet,
  caregiver,
  careActivity,
  restockAlert,
}: {
  goHome: () => void;
  sendTreat: () => void;
  pet: Pet;
  caregiver: Caregiver;
  careActivity: CareActivity;
  restockAlert: RestockAlert;
}) {
  const { t } = useTranslation();
  return (
    <section className="content-card full-card">
      <button className="back-button" onClick={goHome}><Icon name="back" size={20} /> {t("common.home")}</button>
      <div className="card-heading">
        <div><p className="eyebrow green">{t("care.eyebrow")}</p><h2>{t("care.title")}</h2></div>
        <span className="score-orb">{pet.careScore}%</span>
      </div>
      <p className="supporting">{t("care.supporting")}</p>
      <div className="role-strip"><Icon name="users" size={20} /><div><strong>{caregiver.names}</strong><small>{caregiver.relationship}</small></div><span>{caregiver.status}</span></div>
      <div className="alert-card warm">
        <span className="feature-icon"><Icon name="pill" /></span>
        <div><small>{restockAlert.label}</small><h3>{restockAlert.name}</h3><p>{t("care.daysRemaining", { count: restockAlert.daysRemaining })}</p></div>
        <Icon name="chevron" size={20} />
      </div>
      <div className="section-title"><h3>{t("care.careToday")}</h3><button>{t("common.viewAll")}</button></div>
      <div className="care-grid">
        <article><span><Icon name="check" /></span><strong>{careActivity.dosesTaken}</strong><small>{t("care.dosesTaken")}</small></article>
        <article><span><Icon name="walk" /></span><strong>{careActivity.walkDistance}</strong><small>{t("care.walkedToday")}</small></article>
      </div>
      <div className="activity-card">
        <p><strong>{t("care.recentActivity")}</strong><span>{careActivity.timestamp}</span></p>
        <p>{careActivity.description}</p>
      </div>
      <button className="primary-button" onClick={sendTreat}><Icon name="gift" size={20} /> {t("care.sendTreat")}</button>
    </section>
  );
}
