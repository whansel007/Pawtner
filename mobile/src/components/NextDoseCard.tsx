import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";
import type { DerivedDose } from "../../../shared/contract";
import { selectNextDose, countTaken, formatDoseTime } from "../lib/doses";
import { formatStrength } from "../lib/strength";
import "./NextDoseCard.css";

interface NextDoseCardProps {
  doses: DerivedDose[];
  petName: string;
  onTaken: (doseId: string) => void;
  onSeeAll: () => void;
  /** Small dot on "See all" while something new waits on Reminders. */
  seeAllBadge?: boolean;
  onWalk: () => void;
  onBloodPressure: () => void;
  /** Full-screen form: every dose of today in time order (the list scrolls inside the card), not just the next one. */
  showAll?: boolean;
}

export function NextDoseCard({
  doses,
  petName,
  onTaken,
  onSeeAll,
  seeAllBadge = false,
  onWalk,
  onBloodPressure,
  showAll = false,
}: NextDoseCardProps) {
  const { t } = useTranslation();
  const takenCount = countTaken(doses);
  const total = doses.length;
  const nextDose = selectNextDose(doses);
  const byTime = [...doses].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const doseRow = (dose: DerivedDose) => (
    <div className={`next-dose-card__row ${dose.status === "taken" ? "is-taken" : ""}`} key={dose.id}>
      <time className="next-dose-card__time">
        {formatDoseTime(dose.scheduledAt)}
      </time>
      <div className="next-dose-card__info">
        <span className="next-dose-card__name">
          {dose.medicationName}
        </span>
        {dose.strength && (
          <span className="next-dose-card__strength">
            {formatStrength(dose.strength)}
          </span>
        )}
      </div>
      {dose.status === "taken" ? (
        <span className="next-dose-card__done">{t("reminders.statusDone")}</span>
      ) : (
        <button
          className="next-dose-card__taken-btn"
          onClick={() => onTaken(dose.id)}
          aria-label={t("home.takenAria", { name: dose.medicationName })}
        >
          {t("home.taken")}
        </button>
      )}
    </div>
  );

  return (
    <section className="next-dose-card" aria-label={t("home.dailyCare")}>
      <div className="next-dose-card__header">
        <span className="next-dose-card__label">
          {showAll
            ? t("home.title")
            : nextDose && nextDose.status === "missed"
              ? t("home.stillToTake")
              : t("home.next")}
        </span>
        <span className="next-dose-card__progress">
          {t("home.progress", { count: takenCount, total })}
        </span>
      </div>

      {showAll && total > 0 ? (
        <div className="next-dose-card__list">{byTime.map(doseRow)}</div>
      ) : nextDose ? (
        doseRow(nextDose)
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
        aria-label={seeAllBadge ? t("home.seeAllNew") : undefined}
      >
        {t("home.seeAll")}
        {seeAllBadge && <span className="next-dose-card__see-all-dot" aria-hidden="true" />}
      </button>
    </section>
  );
}
