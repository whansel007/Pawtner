import { useEffect, useRef, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { navigateTo, replacePath, usePathname } from "../lib/pathname";
import { CARE_GARDEN_IMAGE } from "./config";
import { CARE_PATHS, guardRoute, isSignedInRoute, PHONE_APP_PATH, routeFromPath, type CareRoute } from "./routing";
import { buildCaretakers, buildPersonas, findCaretaker } from "./data/personas";
import type { Persona } from "./data/types";
import { useCareData } from "./hooks/useCareData";
import { useCaretakerSlot } from "./hooks/useCaretakerSlot";
import { Brand } from "./components/Brand";
import { CareFooter } from "./components/CareFooter";
import { CareHeader } from "./components/CareHeader";
import { CareNotice } from "./components/CareNotice";
import { AlertsPage } from "./pages/AlertsPage";
import { LandingPage } from "./pages/LandingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SignInPage } from "./pages/SignInPage";
import { WeekPage } from "./pages/WeekPage";
import "./care.css";

/** The garden art path lives in config; CSS reads it as a custom property. */
const ROOT_STYLE = { "--care-garden-image": `url(${CARE_GARDEN_IMAGE})` } as CSSProperties;

const PAGE_TITLE_KEY: Record<CareRoute, string> = {
  landing: "care.web.landing.title",
  signIn: "care.web.signIn.title",
  week: "care.web.nav.week",
  alerts: "care.web.nav.alerts",
  settings: "care.web.nav.settings",
};

/**
 * Caretaker web app at /care (PRD §10). Owns the route, the demo persona and the data;
 * pages are presentational and get everything as props.
 */
export default function CareApp() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { slot, signIn, signOut } = useCaretakerSlot();
  const { data, offline, saveStatus, pendingThreshold, saveThreshold } = useCareData();
  const mainRef = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);

  const requested = routeFromPath(pathname);
  const route = guardRoute(requested, slot !== null);

  // Signed-in pages without a persona redirect to the picker (replace, so Back doesn't loop).
  useEffect(() => {
    if (route !== requested) replacePath(CARE_PATHS[route]);
  }, [route, requested]);

  // Title per page; focus moves to the new page's content after in-app navigation (not on first load).
  useEffect(() => {
    document.title = t("care.web.pageTitle", { page: t(PAGE_TITLE_KEY[route]) });
    if (firstRoute.current) { firstRoute.current = false; return; }
    mainRef.current?.focus({ preventScroll: true });
  }, [route, t]);
  useEffect(() => () => { document.title = t("care.web.brand"); }, [t]);

  const go = (next: CareRoute) => navigateTo(CARE_PATHS[next]);
  const logOut = () => { signOut(); go("landing"); };
  const choosePersona = (persona: Persona) => {
    if (persona.slot === "senior") { navigateTo(PHONE_APP_PATH); return; }
    signIn(persona.slot);
    go("week");
  };

  if (!data) {
    return (
      <div className="care-root care-root--loading" style={ROOT_STYLE}>
        <p role="status">{t("care.web.loading")}</p>
      </div>
    );
  }

  const caretakers = buildCaretakers(data.summary);
  const viewer = findCaretaker(caretakers, slot);
  const signedInPage = isSignedInRoute(route) && viewer !== null;

  return (
    <div className="care-root" style={ROOT_STYLE}>
      {signedInPage ? (
        <CareHeader route={route} viewerName={viewer.name} onNavigate={go} onLogOut={logOut} />
      ) : (
        <header className="care-header care-header--public">
          <div className="care-header__inner">
            <Brand onClick={() => go("landing")} />
            {route === "landing" && !viewer && (
              <button className="care-ghost-button" type="button" onClick={() => go("signIn")}>
                {t("care.web.landing.signIn")}
              </button>
            )}
          </div>
        </header>
      )}

      {offline && (
        <div className="care-offline">
          <CareNotice tone="warm" live>{t("care.web.notice.offline")}</CareNotice>
        </div>
      )}

      <main className="care-main" id="care-main" ref={mainRef} tabIndex={-1} key={route}>
        {route === "landing" && (
          <LandingPage
            seniorName={data.summary.senior.name}
            dogName={data.today.dog.name}
            dogMood={data.today.dog.mood}
            signedIn={viewer !== null}
            onStart={() => go(viewer ? "week" : "signIn")}
          />
        )}
        {route === "signIn" && <SignInPage personas={buildPersonas(data.summary)} onChoose={choosePersona} onNavigate={go} />}
        {signedInPage && route === "week" && <WeekPage data={data} viewer={viewer} />}
        {signedInPage && route === "alerts" && (
          <AlertsPage
            data={data}
            caretakers={caretakers}
            viewer={viewer}
            offline={offline}
            saveStatus={saveStatus}
            pendingThreshold={pendingThreshold}
            onSaveThreshold={(threshold) => void saveThreshold(threshold)}
          />
        )}
        {signedInPage && route === "settings" && <SettingsPage data={data} viewer={viewer} />}
      </main>

      <CareFooter onNavigate={go} />
    </div>
  );
}
