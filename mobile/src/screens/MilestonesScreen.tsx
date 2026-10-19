import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard, type CardSheet } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import { useMilestones } from "../lib/useMilestones";
import { withStreak } from "../lib/demoUnlocks";
import { isPerformable, trickCardTap, type TrickLike } from "../lib/tricks";
import type { TrickPerformance } from "../config/tricks";
import type { DogMood } from "../../../shared/contract";
import type { Pet } from "../types";
import "./MilestonesScreen.css";

/**
 * Milestones: Buddy's progress, then Tricks (no decision card: owner, 18 Oct) (no souvenirs for now, owner 18 Oct; badges later).
 * Earned trick cards are buttons: Buddy (standing above the card) performs the trick via onTrick; when he's too
 * sleepy to wave, the Wave card shows a gentle line instead (lib/tricks.ts trickCardTap). Locked tricks do nothing.
 */

export function MilestonesScreen({
  back,
  sheet,
  onCustomize,
  pet,
  petName,
  heartsTotal,
  mood,
  onTrick,
}: {
  back: BackAction;
  /** Set when this screen's card drags like Home (App, config/homeView.ts CARD_SHEET). */
  sheet?: CardSheet;
  onCustomize: () => void;
  pet: Pet;
  petName: string;
  heartsTotal: number;
  mood: DogMood;
  onTrick: (performance: TrickPerformance) => void;
}) {
  const { t } = useTranslation();
  const { data, loading, tricks: loadedTricks } = useMilestones({ refresh: true });
  // Tricks follow the one streak number (pet.streak, which includes the Settings demo days tick).
  const tricks = loadedTricks ? withStreak(loadedTricks, pet.streak) : loadedTricks;
  const [sleepyLine, setSleepyLine] = useState(false);

  function tapTrick(trick: TrickLike) {
    const tap = trickCardTap(trick, mood);
    setSleepyLine(tap === "sleepyLine");
    if (tap === "basic" || tap === "wave") onTrick(tap);
  }

  if (loading) return (
    <FullCard back={back} sheet={sheet}>
      <p className="supporting">Loading milestones…</p>
    </FullCard>
  );

  const caringDays = data?.caringDays ?? pet.caringDays;
  const heading = { eyebrow: t("milestones.eyebrow", { name: petName }), title: t("milestones.title", { count: caringDays }) };

  return (
    <FullCard back={back} sheet={sheet} heading={heading}>
      <p className="eyebrow green">{heading.eyebrow}</p>
      <h2>{heading.title}</h2>
      <p className="streak-line">{t("milestones.streakLine", { count: pet.streak })}</p>
      <p className="streak-line">{t("milestones.hearts", { count: heartsTotal })}</p>

      <button className="customize-row" onClick={onCustomize}><span className="feature-icon"><Icon name="star" /></span><div><strong>{t("milestones.worldWardrobe")}</strong><small>{t("milestones.worldWardrobeSub", { name: petName })}</small></div><Icon name="chevron" /></button>

      <div className="section-title"><h3>{t("milestones.tricks")}</h3><span>{t("milestones.tricksSub")}</span></div>
      <div className="trick-grid">
        {(tricks ?? []).map((trick) => {
          const content = <><Icon name="star" /><strong>{trick.name}</strong><small>{trick.note}</small></>;
          return isPerformable(trick)
            ? <button type="button" className="earned trick-card--perform" key={trick.name} onClick={() => tapTrick(trick)}>{content}</button>
            : <article className={trick.earned ? "earned" : ""} key={trick.name}>{content}</article>;
        })}
      </div>
      {sleepyLine && <p className="trick-note" role="status">{t("milestones.waveSleepy", { name: petName })}</p>}
    </FullCard>
  );
}
