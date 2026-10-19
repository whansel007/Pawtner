import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { ScreeningInfo } from "../types";

export function ScreeningScreen({
  back,
  screeningInfo,
}: {
  back: BackAction;
  screeningInfo: ScreeningInfo;
}) {
  const { t } = useTranslation();
  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("screening.eyebrow")}</p>
      <h2>{t("screening.title")}</h2>
      <div className="festival-card"><Icon name="star" size={42} /><h3>{screeningInfo.title}</h3><p>{screeningInfo.description}</p></div>
      <a className="primary-button" href={screeningInfo.url} target="_blank" rel="noreferrer">{t("screening.checkHealthHub")}</a>
    </FullCard>
  );
}
