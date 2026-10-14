import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";
import type { DerivedDose } from "../../../shared/contract";
import { selectNextDose, countTaken, formatDoseTime } from "../lib/doses";
import "./NextDoseCard.css";

interface NextDoseCardProps {
  doses: DerivedDose[];
  petName: string;
  onTaken: (doseId: string) => void;
  onSeeAll: () => void;
  onWalk: () => void;
  onBloodPressure: () => void;
}

export function NextDoseCard({
  doses,
  petName,
  onTaken,
  onSeeAll,
  onWalk,
  onBloodPressure,
}: NextDoseCardProps) {
  const { t } = useTranslation();
  const takenCount = countTaken(doses);
  const total = doses.length;
  const nextDose = selectNextDose(doses);

  return (
    <section className="next-dose-card" aria-label={t("home.dailyCare")}>
      <div className="next-dose-card__header">
        <span className="next-dose-card__label">
          {nextDose && nextDose.status === "missed"
            ? t("home.stillToTake")
            : t("home.next")}
        </span>
        <span className="next-dose-card__progress">
          {t("home.progress", { count: takenCount, total })}
        </span>
      </div>

      {nextDose ? (
        <div className="next-dose-card__row" key={nextDose.id}>
          <time className="next-dose-card__time">
            {formatDoseTime(nextDose.scheduledAt)}
          </time>
          <div className="next-dose-card__info">
            <span className="next-dose-card__name">
              {nextDose.medicationName}
            </span>
            {nextDose.strength && (
              <span className="next-dose-card__strength">
                {nextDose.strength}
              </span>
            )}
          </div>
          <button
            className="next-dose-card__taken-btn"
            onClick={() => onTaken(nextDose.id)}
            aria-label={t("home.takenAria", { name: nextDose.medicationName })}
          >
            {t("home.taken")}
          </button>
        </div>
      ) : total === 0 ? (
        <p className="next-dose-card__empty">{t("home.noDoses")}</p>
      ) : (
        <p className="next-dose-card__empty">{t("home.allDone")}</p>
      )}

      <div className="next-dose-card__pills">
        <button className="next-dose-card__pill" onClick={onWalk}>
          <Icon name="walk" size={16} />
          <span>{t("home.walk", { name: petName })}</span>
        </button>
        <button className="next-dose-card__pill" onClick={onBloodPressure}>
          <Icon name="heart" size={16} />
          <span>{t("home.bp")}</span>
        </button>
      </div>

      <button
        className="next-dose-card__see-all"
        onClick={onSeeAll}
      >
        {t("home.seeAll")}
      </button>
    </section>
  );
}
