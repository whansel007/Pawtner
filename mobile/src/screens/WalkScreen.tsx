import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { WalkStats } from "../types";

export function WalkScreen({
  goHome,
  walkStats,
  petName,
}: {
  goHome: () => void;
  walkStats: WalkStats;
  petName: string;
}) {
  const { t } = useTranslation();
  const [walking, setWalking] = useState(false);
  return (
    <section className="content-card full-card walk-card">
      <button className="back-button" onClick={goHome}><Icon name="back" size={20} /> {t("common.home")}</button>
      <p className="eyebrow green">{t("walk.eyebrow")}</p>
      <h2>{walking ? t("walk.titleWalking") : t("walk.titleReady")}</h2>
      <div className={`walk-orb ${walking ? "active" : ""}`}>
        <Icon name="walk" size={42} />
        <strong>{walking ? walkStats.duration : "00:00"}</strong>
        <small>{walking ? walkStats.distance : t("walk.startReady", { name: petName })}</small>
      </div>
      <div className="walk-stats">
        <div><strong>{walking ? walkStats.steps : "0"}</strong><small>{t("common.steps")}</small></div>
        <div><strong>{walking ? walkStats.calories : "0"}</strong><small>{t("common.calories")}</small></div>
        <div><strong>{walking ? walkStats.speed : "0.0"}</strong><small>{t("common.kmh")}</small></div>
      </div>
      <button className={`primary-button ${walking ? "stop-button" : ""}`} onClick={() => setWalking(!walking)}>
        {walking ? t("walk.finishWalk") : t("walk.startWalk")}
      </button>
      <p className="walk-note">{walkStats.goal}</p>
      <p className="gentle-note">{walkStats.gentleNote}</p>
    </section>
  );
}
