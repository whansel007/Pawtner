import { useTranslation } from "react-i18next";
import type { DerivedDose } from "../../../shared/contract";
import type { HomeView } from "../config/homeView";
import { formatDoseTime, selectNextDose } from "../lib/doses";
import { HomeViewButton } from "../components/HomeViewButton";
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
  onShowBoth,
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
  /** Settings > What Home shows (config/homeView.ts). */
  view?: HomeView;
  /** The big button in a single view: back to Buddy and the medicines together. */
  onShowBoth: () => void;
}) {
  const { t } = useTranslation();
  const nextDose = selectNextDose(todayDoses);
  // "Just Buddy" keeps the next dose in sight on its button.
  const nextLine = nextDose
    ? t(nextDose.status === "missed" ? "home.view.stillToTake" : "home.view.next", { time: formatDoseTime(nextDose.scheduledAt), name: nextDose.medicationName })
    : t(todayDoses.length === 0 ? "home.noDoses" : "home.allDone");
  return (
    // Stacked column: the dog (shared DogLayer) stands in the leftover space, so its paws always sit just above the chips.
    // In landscape the stage and chips form the left column and the cards move to the right pane (index.css).
    // "Just my medicines" hides Buddy and the chips (index.css .home-view-medicines) and the card grows.
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
      {/* Portrait: display: contents, so the cards stack in this column. Landscape: the scrolling right-hand pane. */}
      <div className="home-layout__cards">
        {view === "buddy" ? (
          <HomeViewButton icon="pill" title={t("home.view.showMedicines")} detail={nextLine} onClick={onShowBoth} />
        ) : (
          <NextDoseCard
            doses={todayDoses}
            petName={pet.name}
            onTaken={onTakenDose}
            onSeeAll={onReminders}
            seeAllBadge={seeAllBadge}
            onWalk={onWalk}
            onBloodPressure={onBloodPressure}
          />
        )}
        {view === "medicines" && (
          <HomeViewButton icon="paw" title={t("home.view.showBuddy", { name: pet.name })} detail={t("home.view.showBuddySub", { name: pet.name })} onClick={onShowBoth} />
        )}
      </div>
    </div>
  );
}
