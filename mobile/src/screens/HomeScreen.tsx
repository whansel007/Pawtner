import { useTranslation } from "react-i18next";
import type { AgentDecision, DerivedDose } from "../../../shared/contract";
import { Icon } from "../components/Icon";
import { DecisionLogCard } from "../components/DecisionLogCard";
import { NextDoseCard } from "../components/NextDoseCard";
import type { Pet } from "../types";

export function HomeScreen({
  todayDoses,
  pet,
  onTakenDose,
  onReminders,
  onTreat,
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
  onWalk: () => void;
  onBloodPressure: () => void;
  onStreak: () => void;
  decision: AgentDecision | null;
}) {
  const { t } = useTranslation();
  return (
    // Stacked column: the dog (shared DogLayer) stands in the leftover space, so its paws always sit just above the chips.
    // In landscape the stage and chips form the left column and the cards move to the right pane (index.css).
    <div className="home-layout">
      <div className="home-layout__stage" />
      <div className="home-layout__chips">
        <button className="scene-chip" onClick={onReminders}><Icon name="calendar" size={19} />{t("common.today")}</button>
        <div className="scene-actions">
          <button className="scene-chip" onClick={onStreak}>{t("home.streakChip", { count: pet.streak })}</button>
          <button className="scene-chip gift-chip" onClick={onTreat} aria-label={t("home.treatAria")}>
            <Icon name="gift" size={19} /><span className="badge-dot" />
          </button>
        </div>
      </div>
      {/* Portrait: display: contents, so the cards stack in this column. Landscape: the scrolling right-hand pane. */}
      <div className="home-layout__cards">
        <NextDoseCard
          doses={todayDoses}
          petName={pet.name}
          onTaken={onTakenDose}
          onSeeAll={onReminders}
          onWalk={onWalk}
          onBloodPressure={onBloodPressure}
        />
        {/* Only once the agent has decided something; an empty card would take the dog's space on short phones. */}
        {decision && <DecisionLogCard decision={decision} summary={decision.wording} />}
      </div>
    </div>
  );
}
