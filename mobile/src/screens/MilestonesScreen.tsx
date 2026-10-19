import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { DecisionLogCard } from "../components/DecisionLogCard";
import type { BackAction } from "../lib/navigation";
import { useMilestones } from "../lib/useMilestones";
import { withStreak } from "../lib/demoUnlocks";
import { isPerformable, trickCardTap, type TrickLike } from "../lib/tricks";
import type { TrickPerformance } from "../config/tricks";
import type { AgentDecision, DogMood } from "../../../shared/contract";
import type { Pet } from "../types";
import "./MilestonesScreen.css";

/**
 * Milestones: the routine agent decision on top (urgent ones stay on Home), Buddy's progress, then Tricks (no souvenirs for now, owner 18 Oct; badges later).
 * Earned trick cards are buttons: Buddy (standing above the card) performs the trick via onTrick; when he's too
 * sleepy to wave, the Wave card shows a gentle line instead (lib/tricks.ts trickCardTap). Locked tricks do nothing.
 */

export function MilestonesScreen({
  back,
  onCustomize,
  pet,
  petName,
  heartsTotal,
  mood,
  decision,
  onTrick,
}: {
  back: BackAction;
  onCustomize: () => void;
  pet: Pet;
  petName: string;
  heartsTotal: number;
  mood: DogMood;
  /** The routine decision to show on top (App passes only non-urgent ones), or null. */
  decision: AgentDecision | null;
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
    <FullCard back={back}>
      <p className="supporting">Loading milestones…</p>
    </FullCard>
  );

  const caringDays = data?.caringDays ?? pet.caringDays;

  return (
    <FullCard back={back}>
      {decision && <DecisionLogCard decision={decision} summary={decision.wording} />}
      <p className="eyebrow green">{t("milestones.eyebrow", { name: petName })}</p>
      <h2>{t("milestones.title", { count: caringDays })}</h2>
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
