import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { Pet } from "../types";

export function TopZone({ onSettings, onHome, pet }: { onSettings: () => void; onHome: () => void; pet: Pet }) {
  const { t } = useTranslation();
  return (
    <header className="top-zone">
      {/* Name and hearts are one button back to Home; the hearts' count stays available as its description. */}
      <button type="button" className="top-zone__home" onClick={onHome} aria-label={t("topZone.homeAria", { name: pet.name })} aria-describedby="top-zone-hearts">
        <span className="dog-name">{pet.name}</span>
        {/* "today" says the four hearts are a daily count (they start again each day). */}
        <span className="hearts-row">
          <span className="hearts" id="top-zone-hearts" role="img" aria-label={t("topZone.heartsAria", { count: pet.heartCount })}>
            {[0, 1, 2, 3].map((heart) => <span className={heart < pet.heartCount ? "" : "heart-empty"} key={heart}>{heart < pet.heartCount ? "♥" : "♡"}</span>)}
          </span>
          <span className="hearts-today" aria-hidden="true">{t("topZone.heartsToday")}</span>
        </span>
      </button>
      <button type="button" className="glass-button" onClick={onSettings} aria-label={t("topZone.settingsAria")}>
        <Icon name="gear" />
      </button>
    </header>
  );
}
