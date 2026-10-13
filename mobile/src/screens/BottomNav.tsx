import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { Screen } from "../types";

export function BottomNav({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) {
  const { t } = useTranslation();
  return (
    <nav className="bottom-nav" aria-label={t("nav.aria")}>
      <button className={screen === "home" ? "active" : ""} onClick={() => navigate("home")}><Icon name="home" /><span>{t("nav.home")}</span></button>
      <button className={["milestones", "customize"].includes(screen) ? "active" : ""} onClick={() => navigate("milestones")}><Icon name="star" /><span>{t("nav.milestones")}</span></button>
      <button className={["health", "screening", "summary"].includes(screen) ? "active" : ""} onClick={() => navigate("health")}><Icon name="stats" /><span>{t("nav.health")}</span></button>
    </nav>
  );
}
