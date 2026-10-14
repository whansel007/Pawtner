import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { MilestoneWorld, Trick, Souvenir, Pet } from "../types";

export function MilestonesScreen({
  back,
  onWalk,
  onCustomize,
  pet,
  currentWorld,
  tricks,
  souvenirs,
  petName,
}: {
  back: BackAction;
  onWalk: () => void;
  onCustomize: () => void;
  pet: Pet;
  currentWorld: MilestoneWorld;
  tricks: Trick[];
  souvenirs: Souvenir[];
  petName: string;
}) {
  const { t } = useTranslation();
  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("milestones.eyebrow", { name: petName })}</p>
      <h2>{t("milestones.title", { count: pet.caringDays })}</h2>
      <p className="streak-line">{t("milestones.streakLine", { count: pet.streak })}</p>
      <div className="world-card">
        <span className="world-level">{currentWorld.levelText}</span><h3>{currentWorld.label}</h3><p>{currentWorld.description}</p>
        <div className="world-progress"><span /></div>
      </div>
      <button className="customize-row" onClick={onCustomize}><span className="feature-icon"><Icon name="star" /></span><div><strong>{t("milestones.worldWardrobe")}</strong><small>{t("milestones.worldWardrobeSub", { name: petName })}</small></div><Icon name="chevron" /></button>
      <div className="section-title"><h3>{t("milestones.tricks")}</h3><span>{t("milestones.tricksSub")}</span></div>
      <div className="trick-grid">
        {tricks.map((trick) => (
          <article className={trick.earned ? "earned" : ""} key={trick.name}><Icon name="star" /><strong>{trick.name}</strong><small>{trick.note}</small></article>
        ))}
      </div>
      <div className="section-title"><h3>{t("milestones.souvenirs")}</h3><span>{t("milestones.souvenirsSub")}</span></div>
      {souvenirs.map((souvenir) => (
        <button className="souvenir-row" key={souvenir.name} onClick={onWalk}><span>{souvenir.distance}</span><div><strong>{souvenir.name}</strong><small>{souvenir.note}</small></div><Icon name="chevron" /></button>
      ))}
    </FullCard>
  );
}
