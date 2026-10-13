import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { ScreeningInfo } from "../types";

export function ScreeningScreen({
  onBack,
  screeningInfo,
}: {
  onBack: () => void;
  screeningInfo: ScreeningInfo;
}) {
  const { t } = useTranslation();
  return (
    <section className="content-card full-card">
      <button className="back-button" onClick={onBack}><Icon name="back" size={20} /> {t("screening.back")}</button>
      <p className="eyebrow green">{t("screening.eyebrow")}</p>
      <h2>{t("screening.title")}</h2>
      <p className="supporting">{t("screening.supporting")}</p>
      <div className="festival-card"><Icon name="star" size={42} /><h3>{screeningInfo.title}</h3><p>{screeningInfo.description}</p></div>
      <a className="primary-button" href={screeningInfo.url} target="_blank" rel="noreferrer">{t("screening.checkHealthHub")}</a>
      <button className="text-button" onClick={onBack}>{t("screening.remindLater")}</button>
    </section>
  );
}
