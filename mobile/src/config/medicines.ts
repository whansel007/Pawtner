/**
 * My medicines settings. Text lives in en.json under "medicines".
 */

/**
 * "Stop this medicine": taps on "Yes, stop it" are silently ignored for this long after the confirm panel opens,
 * so a double tap on "Stop this medicine" can never stop it, wherever the panel's buttons end up after scrolling.
 */
export const STOP_CONFIRM_GUARD_MS = 1000;
