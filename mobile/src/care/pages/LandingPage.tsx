import { useTranslation } from "react-i18next";
import { Icon } from "../../components/Icon";
import { CARE_GARDEN_IMAGE } from "../config";

interface LandingPageProps {
  signedIn: boolean;
  onStart: () => void;
}

const FEATURES = [
  { key: "Week", icon: "calendar", tone: "moss" },
  { key: "Family", icon: "users", tone: "rose" },
  { key: "Calm", icon: "heart", tone: "sun" },
] as const;

export function LandingPage({ signedIn, onStart }: LandingPageProps) {
  const { t } = useTranslation();
  return (
    <div className="care-page-enter">
      <section className="care-hero" aria-labelledby="care-hero-title">
        <img className="care-hero__scene" src={CARE_GARDEN_IMAGE} alt={t("care.web.landing.gardenAlt")} />
        <div className="care-hero__copy">
          <p className="care-eyebrow care-eyebrow--light">{t("care.web.landing.eyebrow")}</p>
          <h1 id="care-hero-title">{t("care.web.landing.title")}</h1>
          <p className="care-hero__intro">{t("care.web.landing.intro")}</p>
          <button className="care-primary-button care-stitched" type="button" onClick={onStart}>
            {t(signedIn ? "care.web.landing.open" : "care.web.landing.signIn")}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="care-support" aria-label={t("care.web.landing.featuresLabel")}>
        <ul className="care-features">
          {FEATURES.map((feature) => (
            <li className="care-feature care-stitched" key={feature.key}>
              <span className={`care-token care-token--${feature.tone}`} aria-hidden="true">
                <Icon name={feature.icon} size={24} />
              </span>
              <h2>{t(`care.web.landing.feature${feature.key}Title`)}</h2>
              <p>{t(`care.web.landing.feature${feature.key}Body`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}