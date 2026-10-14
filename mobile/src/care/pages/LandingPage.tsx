import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../../shared/contract";
import { Icon } from "../../components/Icon";
import { CareDog } from "../components/CareDog";
import { CARE_GARDEN_IMAGE } from "../config";

interface LandingPageProps {
  seniorName: string;
  dogName: string;
  dogMood: DogMood;
  signedIn: boolean;
  onStart: () => void;
}

const FEATURES = [
  { key: "Week", icon: "calendar", tone: "moss" },
  { key: "Family", icon: "users", tone: "rose" },
  { key: "Calm", icon: "heart", tone: "sun" },
] as const;

export function LandingPage({ seniorName, dogName, dogMood, signedIn, onStart }: LandingPageProps) {
  const { t } = useTranslation();
  return (
    <div className="care-page-enter">
      <section className="care-hero" aria-labelledby="care-hero-title">
        <img className="care-hero__scene" src={CARE_GARDEN_IMAGE} alt={t("care.web.landing.gardenAlt")} />
        <div className="care-hero__copy">
          <CareDog name={dogName} mood={dogMood} />
          <p className="care-eyebrow care-eyebrow--light">{t("care.web.landing.eyebrow")}</p>
          <h1 id="care-hero-title">{t("care.web.landing.title")}</h1>
          <p className="care-hero__intro">{t("care.web.landing.intro", { senior: seniorName, dog: dogName })}</p>
          <button className="care-primary-button care-stitched" type="button" onClick={onStart}>
            {t(signedIn ? "care.web.landing.open" : "care.web.landing.signIn")}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="care-support" aria-labelledby="care-support-title">
        <p className="care-eyebrow">{t("care.web.landing.supportEyebrow")}</p>
        <h2 id="care-support-title">{t("care.web.landing.supportTitle")}</h2>
        <p className="care-support__intro">{t("care.web.landing.supportIntro")}</p>
        <ul className="care-features">
          {FEATURES.map((feature) => (
            <li className="care-feature care-stitched" key={feature.key}>
              <span className={`care-token care-token--${feature.tone}`} aria-hidden="true">
                <Icon name={feature.icon} size={24} />
              </span>
              <h3>{t(`care.web.landing.feature${feature.key}Title`)}</h3>
              <p>{t(`care.web.landing.feature${feature.key}Body`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
