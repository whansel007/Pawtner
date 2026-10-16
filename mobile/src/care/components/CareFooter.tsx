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
            {/* The demo video (config.ts DEMO_VIDEO_URL): a new tab, so this page stays put; "#" until the link exists. */}
            <a
              className="care-footer__link care-footer__video"
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={DEMO_VIDEO_URL === "#" ? (event) => event.preventDefault() : undefined}
            >
              <span aria-hidden="true">▶</span> {t("care.web.footer.video")}
            </a>
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