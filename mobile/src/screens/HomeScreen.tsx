import type { AgentDecision, DerivedDose } from "../../../shared/contract";
import { DecisionLogCard } from "../components/DecisionLogCard";
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
  decision,
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
  decision: AgentDecision | null;
}) {
  return (
    // Stacked column: the dog (shared DogLayer) stands in the leftover space, so its paws always sit just above the chips.
    // In landscape the stage and chips form the left column and the cards move to the right pane (index.css).
    <div className="home-layout">
      <div className="home-layout__stage" />
      <div className="home-layout__chips">
        <SceneChips
          streak={pet.streak}
          onToday={onReminders}
          onStreak={onStreak}
          onTreat={onTreat}
        />
      </div>
      {/* Portrait: display: contents, so the cards stack in this column. Landscape: the scrolling right-hand pane. */}
      <div className="home-layout__cards">
        <NextDoseCard
          doses={todayDoses}
          petName={pet.name}
          onTaken={onTakenDose}
          onSeeAll={onReminders}
          seeAllBadge={seeAllBadge}
          onWalk={onWalk}
          onBloodPressure={onBloodPressure}
        />
        {/* Only once the agent has decided something; an empty card would take the dog's space on short phones. */}
        {decision && <DecisionLogCard decision={decision} summary={decision.wording} />}
      </div>
    </div>
  );
}
