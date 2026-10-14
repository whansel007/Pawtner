import { useTranslation } from "react-i18next";
import type { Persona } from "../data/types";
import { initialOf } from "../lib/rules";
import { CareLink } from "../components/CareLink";
import type { CareRoute } from "../routing";

const ROLE_KEY: Record<Persona["slot"], string> = {
  senior: "care.web.signIn.senior",
  checkIns: "care.web.signIn.checkIns",
  updatesOnly: "care.web.signIn.updatesOnly",
};

/** Demo persona picker (JagaOS-style): no passwords, no accounts. */
export function SignInPage({ personas, onChoose, onNavigate }: { personas: readonly Persona[]; onChoose: (persona: Persona) => void; onNavigate: (route: CareRoute) => void }) {
  const { t } = useTranslation();
  return (
    <div className="care-signin care-page-enter">
      <div className="care-signin__card care-stitched">
        <p className="care-eyebrow">{t("care.web.signIn.eyebrow")}</p>
        <h1>{t("care.web.signIn.title")}</h1>
        <p className="care-signin__demo">{t("care.web.signIn.demo")}</p>
        <ul className="care-personas" aria-label={t("care.web.signIn.listLabel")}>
          {personas.map((persona) => (
            <li key={persona.slot}>
              <button className="care-persona" type="button" onClick={() => onChoose(persona)}>
                <span className={`care-avatar care-avatar--${persona.slot}`} aria-hidden="true">{initialOf(persona.name)}</span>
                <span className="care-persona__text">
                  <strong>{persona.name}</strong>
                  <span>{t(ROLE_KEY[persona.slot], { name: persona.name })}</span>
                </span>
                <span className="care-persona__arrow" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
        <CareLink to="landing" onNavigate={onNavigate} className="care-text-link">
          {t("care.web.signIn.back")}
        </CareLink>
      </div>
    </div>
  );
}
