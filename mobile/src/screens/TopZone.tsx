import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { Pet } from "../types";

export function TopZone({ onSettings, pet }: { onSettings: () => void; pet: Pet }) {
  const { t } = useTranslation();
  return (
    <header className="top-zone">
      <div>
        <p className="dog-name">{pet.name}</p>
        <div className="hearts" aria-label={t("topZone.heartsAria", { count: pet.heartCount })}>
          {[0, 1, 2, 3].map((heart) => <span className={heart < pet.heartCount ? "" : "heart-empty"} key={heart}>{heart < pet.heartCount ? "♥" : "♡"}</span>)}
        </div>
      </div>
      <button className="glass-button" onClick={onSettings} aria-label={t("topZone.settingsAria")}>
        <Icon name="gear" />
      </button>
    </header>
  );
}
