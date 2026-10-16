import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { DerivedDose } from "../../../shared/contract";
import type { HomeView } from "../config/homeView";
import { formatDoseTime, selectNextDose } from "../lib/doses";
import { useSceneLayout } from "../lib/useSceneLayout";
import { HomeSheetHandle } from "../components/HomeSheetHandle";
import { NextDoseCard } from "../components/NextDoseCard";
import { SceneChips } from "../components/SceneChips";
import type { Pet } from "../types";

export function HomeScreen({
  todayDoses,
  pet,
  onTakenDose,
  onReminders,
  onTreat,
  seeAllBadge = false,
  onWalk,
  onBloodPressure,
  onStreak,
  view = "both",
  onView,
}: {
  todayDoses: DerivedDose[];
  pet: Pet;
  onTakenDose: (doseId: string) => void;
  onReminders: () => void;
  onTreat: () => void;
  /** Dot on "See all" while something waits on Reminders (restock help). */
  seeAllBadge?: boolean;
  onWalk: () => void;
  onBloodPressure: () => void;
  onStreak: () => void;
  /** Full-screen Buddy, both, or the full-screen form (config/homeView.ts), set by dragging the card's grab bar. */
  view?: HomeView;
  onView: (view: HomeView) => void;
}) {
  const { t } = useTranslation();
  const layout = useSceneLayout();
  // How far the sheet follows the finger toward the form while the grab bar is dragged (0 at rest).
  const [follow, setFollow] = useState(0);
  const nextDose = selectNextDose(todayDoses);
  // Full-screen Buddy keeps the next dose in sight on the strip that's left of the card, in the card's own type:
  // the label as on the card, the time in grey, only the medicine name bold.
  const peek = nextDose ? (
    <>
      <span className="home-sheet__peek-label">{t(nextDose.status === "missed" ? "home.stillToTake" : "home.next")}</span>
      <span className="home-sheet__peek-dose">
        <time>{formatDoseTime(nextDose.scheduledAt)}</time>
        <strong>{nextDose.medicationName}</strong>
      </span>
    </>
  ) : (
    <span className="home-sheet__peek-empty">{t(todayDoses.length === 0 ? "home.noDoses" : "home.allDone")}</span>
  );
  return (
    // Stacked column: the dog (shared DogLayer) stands in the leftover space, so its paws always sit just above the chips.
    // In landscape the stage and chips form the left column and the cards move to the right pane (index.css).
    // The full-screen form hides Buddy and the chips (index.css .home-view-medicines); full-screen Buddy shrinks the card to a strip.
    <div className="home-layout">
      {view !== "medicines" && (
        <>
          <div className="home-layout__stage" />
          <div className="home-layout__chips">
            <SceneChips
              streak={pet.streak}
              onToday={onReminders}
              onStreak={onStreak}
              onTreat={onTreat}
            />
          </div>
        </>
      )}
      {/* Portrait: display: contents, so the sheet stacks in this column. Landscape: the scrolling right-hand pane. */}
      <div className="home-layout__cards">
        <div
          className={`home-sheet home-sheet--${layout} ${follow !== 0 ? "is-dragging" : ""}`}
          style={{ "--sheet-follow": `${follow}px` } as CSSProperties}
        >
          <HomeSheetHandle view={view} layout={layout} petName={pet.name} onView={onView} onFollow={setFollow} />
          {view === "buddy" ? (
            <p className="home-sheet__peek">{peek}</p>
          ) : (
            <NextDoseCard
              doses={todayDoses}
              petName={pet.name}
              onTaken={onTakenDose}
              onSeeAll={onReminders}
              seeAllBadge={seeAllBadge}
              onWalk={onWalk}
              onBloodPressure={onBloodPressure}
              showAll={view === "medicines"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
