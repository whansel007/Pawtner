import { useTranslation } from "react-i18next";
import { CARE_NAV_ROUTES, type CareRoute } from "../routing";
import { Brand } from "./Brand";
import { CareLink } from "./CareLink";

export function CareFooter({ onNavigate }: { onNavigate: (route: CareRoute) => void }) {
  const { t } = useTranslation();
  return (
    <footer className="care-footer">
      <div className="care-footer__inner">
        <div>
          <Brand onClick={() => onNavigate("landing")} />
          <p className="care-footer__text">{t("care.web.footer.tagline")}</p>
        </div>
        <div>
          <p className="care-footer__eyebrow">{t("care.web.footer.noteEyebrow")}</p>
          <p className="care-footer__text">{t("care.web.footer.note")}</p>
        </div>
        <nav className="care-footer__nav" aria-label={t("care.web.nav.footerLabel")}>
          {CARE_NAV_ROUTES.map((item) => (
            <CareLink key={item} to={item} onNavigate={onNavigate} className="care-footer__link">
              {t(`care.web.nav.${item}`)}
            </CareLink>
          ))}
        </nav>
      </div>
      <div className="care-footer__bottom">
        <p>{t("care.web.footer.bottom")}</p>
        <p>{t("care.web.footer.demo")}</p>
      </div>
    </footer>
  );
}
