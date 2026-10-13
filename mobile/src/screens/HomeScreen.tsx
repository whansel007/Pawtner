import { useTranslation } from "react-i18next";
import type { DerivedDose } from "../../../shared/contract";
import { Icon } from "../components/Icon";
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
}: {
  todayDoses: DerivedDose[];
  pet: Pet;
  onTakenDose: (doseId: string) => void;
  onReminders: () => void;
  onTreat: () => void;
  onWalk: () => void;
  onBloodPressure: () => void;
}) {
  const { t } = useTranslation();
  return (
    // Stacked column: the dog (shared DogLayer) stands in the leftover space, so its paws always sit just above the chips.
    <div className="home-layout">
      <div className="home-layout__stage" />
      <div className="home-layout__chips">
        <button className="scene-chip" onClick={onReminders}><Icon name="calendar" size={19} />{t("common.today")}</button>
        <div className="scene-actions">
          <span className="scene-chip"><Icon name="flame" size={19} />{pet.streak}</span>
          <button className="scene-chip gift-chip" onClick={onTreat} aria-label={t("home.treatAria")}>
            <Icon name="gift" size={19} /><span className="badge-dot" />
          </button>
        </div>
      </div>
      <NextDoseCard
        doses={todayDoses}
        petName={pet.name}
        onTaken={onTakenDose}
        onSeeAll={onReminders}
        onWalk={onWalk}
        onBloodPressure={onBloodPressure}
      />
    </div>
  );
}
