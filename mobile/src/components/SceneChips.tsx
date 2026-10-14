import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

/**
 * The chips row under the dog: "Today" on the left, the streak and the
 * caretaker treat on the right. Presentational only — the wrapper
 * (.home-layout__chips on Home, .scene-chips in landscape) decides the
 * positioning, so Home's dog ground line and the shared landscape row
 * stay in lockstep.
 */
export function SceneChips({
  streak,
  onToday,
  onStreak,
  onTreat,
}: {
  streak: number;
  onToday: () => void;
  onStreak: () => void;
  onTreat: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <button className="scene-chip" type="button" onClick={onToday}>
        <Icon name="calendar" size={19} />
        {t("common.today")}
      </button>
      <div className="scene-actions">
        <button className="scene-chip" type="button" onClick={onStreak}>
          {t("home.streakChip", { count: streak })}
        </button>
        <button
          className="scene-chip gift-chip"
          type="button"
          onClick={onTreat}
          aria-label={t("home.treatAria")}
        >
          <Icon name="gift" size={19} />
          <span className="badge-dot" />
        </button>
      </div>
    </>
  );
}
