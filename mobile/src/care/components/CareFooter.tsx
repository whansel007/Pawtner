import { useTranslation } from "react-i18next";
import { CARE_NAV_ROUTES, type CareRoute } from "../routing";
import { DEMO_VIDEO_URL } from "../config";
import { Brand } from "./Brand";
import { CareLink } from "./CareLink";

export function CareFooter({ onNavigate }: { onNavigate: (route: CareRoute) => void }) {
  const { t } = useTranslation();
  return (
    <footer className="care-footer">
      <div className="care-footer__panel">
        <div className="care-footer__inner">
          <div>
            <Brand onClick={() => onNavigate("landing")} />
            <p className="care-footer__text">{t("care.web.footer.tagline")}</p>
            {/* The demo video, played on our own page /care/video (the address stays Pawtner's). Hidden until a link is set. */}
            {DEMO_VIDEO_URL !== "#" && (
              <CareLink to="video" onNavigate={onNavigate} className="care-footer__link care-footer__video">
                <span aria-hidden="true">▶</span> {t("care.web.footer.video")}
              </CareLink>
            )}
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
          <p>{t("care.web.footer.demo")}</p>
        </div>
      </div>
    </footer>
  );
}