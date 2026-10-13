import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../shared/contract";
import { DogStage } from "../components/DogStage";
import { Icon } from "../components/Icon";
import type { Dose, Pet } from "../types";

export function HomeScreen({
  taken,
  doses,
  pet,
  onTaken,
  onReminders,
  onTreat,
  onWalk,
  onBloodPressure,
  mood,
  accessory,
}: {
  taken: boolean[];
  doses: Dose[];
  pet: Pet;
  onTaken: (index: number) => void;
  onReminders: () => void;
  onTreat: () => void;
  onWalk: () => void;
  onBloodPressure: () => void;
  mood: DogMood;
  accessory?: ReactNode;
}) {
  const { t } = useTranslation();
  const takenCount = taken.filter(Boolean).length;
  return (
    // Stacked column: the dog takes all leftover space, so its paws always sit just above the chips.
    <div className="home-layout">
      <div className="home-layout__stage">
        <DogStage mood={mood} dogName={pet.name} accessory={accessory} />
      </div>
      <div className="home-layout__chips">
        <button className="scene-chip" onClick={onReminders}><Icon name="calendar" size={19} />{t("common.today")}</button>
        <div className="scene-actions">
          <span className="scene-chip"><Icon name="flame" size={19} />{pet.streak}</span>
          <button className="scene-chip gift-chip" onClick={onTreat} aria-label={t("home.treatAria")}>
            <Icon name="gift" size={19} /><span className="badge-dot" />
          </button>
        </div>
      </div>
      {/* TODO(CodeBuddy, T1-08/09): replace with the compact next-dose card; this slot stays flex: none. */}
      <section className="content-card home-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow green">{t("home.dailyCare")}</p>
            <h2>{t("home.title")}</h2>
          </div>
          <span className="progress-copy">{t("home.progress", { count: takenCount, total: doses.length })}</span>
        </div>
        <div className="home-actions">
          <button onClick={onWalk}><span><Icon name="walk" size={19} /></span><div><strong>{t("home.walk")}</strong><small>{t("home.walkSub")}</small></div></button>
          <button onClick={onBloodPressure}><span><Icon name="heart" size={19} /></span><div><strong>{t("home.bp")}</strong><small>{t("home.bpSub")}</small></div></button>
        </div>
        <div className="med-list">
          {doses.map((medicine, index) => (
            <article className={`med-row ${taken[index] ? "is-taken" : ""}`} key={`${medicine.name}-${medicine.time}`}>
              <time>{medicine.time}</time>
              <span className="med-icon"><Icon name="pill" size={20} /></span>
              <div className="med-copy">
                <h3>{medicine.name}</h3>
                <p>{medicine.dose}</p>
              </div>
              <button className="taken-button" onClick={() => onTaken(index)}>
                {taken[index] ? <Icon name="check" size={17} /> : index === 1 ? t("home.taken") : t("home.takeNow")}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
