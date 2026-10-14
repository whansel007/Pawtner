import { useTranslation } from "react-i18next";
import { CARE_NAV_ROUTES, type CareRoute } from "../routing";
import { initialOf } from "../lib/rules";
import { Brand } from "./Brand";
import { CareLink } from "./CareLink";

interface CareHeaderProps {
  route: CareRoute;
  viewerName: string;
  onNavigate: (route: CareRoute) => void;
  onLogOut: () => void;
}

export function CareHeader({ route, viewerName, onNavigate, onLogOut }: CareHeaderProps) {
  const { t } = useTranslation();
  const signedInAs = t("care.web.header.signedInAs", { name: viewerName });
  return (
    <header className="care-header">
      <div className="care-header__inner">
        <Brand onClick={() => onNavigate("week")} />
        <div className="care-header__actions">
          <p className="care-profile" title={signedInAs}>
            <span className="care-profile__initial" aria-hidden="true">{initialOf(viewerName)}</span>
            <span className="care-sr-only">{signedInAs}</span>
            <span className="care-profile__name" aria-hidden="true">{viewerName}</span>
          </p>
          <button className="care-ghost-button" type="button" onClick={onLogOut}>
            {t("care.web.header.logOut")}
          </button>
        </div>
        <nav className="care-nav" aria-label={t("care.web.nav.label")}>
          {CARE_NAV_ROUTES.map((item) => (
            <CareLink key={item} to={item} onNavigate={onNavigate} className="care-nav__item" current={route === item}>
              {t(`care.web.nav.${item}`)}
            </CareLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
