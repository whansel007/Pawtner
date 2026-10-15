import { useSyncExternalStore } from "react";

/**
 * Tiny path switch for the two apps in one bundle (`/` phone, `/care` web), without a router dependency.
 * navigateTo() uses history.pushState, so browser back/forward work; usePathname() re-renders on both.
 */

const NAVIGATE_EVENT = "pawtner:navigate";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

const getPathname = () => window.location.pathname;

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getPathname, getPathname);
}

/** New history entry (a click). */
export function navigateTo(path: string) {
  if (path === window.location.pathname) return;
  window.history.pushState(null, "", path);
  window.scrollTo(0, 0);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/** Replace the current entry (a redirect), so Back doesn't bounce into it again. */
export function replacePath(path: string) {
  if (path === window.location.pathname) return;
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}
