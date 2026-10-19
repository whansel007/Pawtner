/**
 * Caretaker web routes (pure, no DOM), shared by main.tsx, CareApp and the unit tests.
 * `/` stays the senior phone app; everything under `/care` is the caretaker web app.
 */

export type CareRoute = "landing" | "signIn" | "week" | "alerts" | "settings" | "video";

/** Routes in the signed-in header nav, in display order. */
export const CARE_NAV_ROUTES = ["week", "alerts", "settings"] as const;
export type CareNavRoute = (typeof CARE_NAV_ROUTES)[number];

export const CARE_BASE_PATH = "/care";
export const PHONE_APP_PATH = "/";

export const CARE_PATHS: Record<CareRoute, string> = {
  landing: CARE_BASE_PATH,
  signIn: `${CARE_BASE_PATH}/sign-in`,
  week: `${CARE_BASE_PATH}/week`,
  alerts: `${CARE_BASE_PATH}/alerts`,
  settings: `${CARE_BASE_PATH}/settings`,
  /** The demo video, public (pages/VideoPage.tsx). */
  video: `${CARE_BASE_PATH}/video`,
};

/** Routes that need a demo persona; without one the visitor is sent to the picker. */
const SIGNED_IN_ROUTES: readonly CareRoute[] = CARE_NAV_ROUTES;

/** "/care/week/" → "/care/week"; keeps "/" as is. */
export function normalisePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function isCarePath(pathname: string): boolean {
  const path = normalisePath(pathname);
  return path === CARE_BASE_PATH || path.startsWith(`${CARE_BASE_PATH}/`);
}

/** Unknown paths under /care fall back to the landing page. */
export function routeFromPath(pathname: string): CareRoute {
  const path = normalisePath(pathname);
  const match = (Object.keys(CARE_PATHS) as CareRoute[]).find((route) => CARE_PATHS[route] === path);
  return match ?? "landing";
}

export function isSignedInRoute(route: CareRoute): boolean {
  return SIGNED_IN_ROUTES.includes(route);
}

/** The footer's page links: only once a persona is chosen (owner, 19 Oct); before that they'd bounce to the picker. */
export function footerNavRoutes(signedIn: boolean): readonly CareNavRoute[] {
  return signedIn ? CARE_NAV_ROUTES : [];
}

/** The route actually shown: signed-in pages redirect to the picker when nobody is signed in. */
export function guardRoute(route: CareRoute, signedIn: boolean): CareRoute {
  return isSignedInRoute(route) && !signedIn ? "signIn" : route;
}
