import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import { api } from "../lib/api";
import { tricks as mockTricks } from "../mock";
import type { MilestonesResponse } from "../../../shared/contract";
import type { Pet } from "../types";

export function MilestonesScreen({
  back,
  onWalk,
  onCustomize,
  pet,
  petName,
}: {
  back: BackAction;
  onWalk: () => void;
  onCustomize: () => void;
  pet: Pet;
  petName: string;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<MilestonesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.milestones().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <FullCard back={back}>
      <p className="supporting">Loading milestones…</p>
    </FullCard>
  );

  const caringDays = data?.caringDays ?? pet.caringDays;

  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("milestones.eyebrow", { name: petName })}</p>
      <h2>{t("milestones.title", { count: caringDays })}</h2>
      <p className="streak-line">{t("milestones.streakLine", { count: pet.streak })}</p>

      {data && (
        <div className="world-card">
          <span className="world-level">{data.currentWorld.levelText}</span>
          <h3>{data.currentWorld.label}</h3>
          <p>{data.currentWorld.description}</p>
          <div className="world-progress"><span style={{ width: `${data.currentWorld.progress * 100}%` }} /></div>
          <small>{(data.cumulativeWalkMeters / 1000).toFixed(1)} km total walked · {data.walkCount} walks</small>
        </div>
      )}

      <button className="customize-row" onClick={onCustomize}><span className="feature-icon"><Icon name="star" /></span><div><strong>{t("milestones.worldWardrobe")}</strong><small>{t("milestones.worldWardrobeSub", { name: petName })}</small></div><Icon name="chevron" /></button>

      <div className="section-title"><h3>{t("milestones.tricks")}</h3><span>{t("milestones.tricksSub")}</span></div>
      <div className="trick-grid">
        {(data?.tricks ?? mockTricks).map((trick) => (
          <article className={trick.earned ? "earned" : ""} key={trick.name}><Icon name="star" /><strong>{trick.name}</strong><small>{trick.note}</small></article>
        ))}
      </div>

      <div className="section-title"><h3>{t("milestones.souvenirs")}</h3><span>{t("milestones.souvenirsSub")}</span></div>
      {data && data.unlockedSouvenirs.length > 0 ? data.unlockedSouvenirs.map((souvenir) => (
        <button className="souvenir-row" key={souvenir.key} onClick={onWalk}>
          <span>Unlocked</span>
          <div><strong>{souvenir.name}</strong><small>{souvenir.note}</small></div>
          <Icon name="chevron" />
        </button>
      )) : (
        <button className="souvenir-row" onClick={onWalk}>
          <span>{data?.nextSouvenirTarget ? `${(data.nextSouvenirTarget.cumulativeMeters / 1000).toFixed(0)} km` : "—"}</span>
          <div><strong>{data?.nextSouvenirTarget?.name ?? "No souvenirs yet"}</strong><small>{data?.nextSouvenirTarget?.note ?? "Walk to earn souvenirs"}</small></div>
          <Icon name="chevron" />
        </button>
      )}
      {data?.nextSouvenirTarget && (
        <p className="supporting">Next: {data.nextSouvenirTarget.name} at {(data.nextSouvenirTarget.cumulativeMeters / 1000).toFixed(1)} km ({(data.nextSouvenirTarget.progress * 100).toFixed(0)}% there)</p>
      )}
    </FullCard>
  );
}
