import { GOOD_WEEK } from "../config/health.js";

/** "Good week" on the weekly summary, or no line (config/health.ts GOOD_WEEK). `streak` = the streak the phone shows. */
export function isGoodWeek({ streak, caringDays }: { streak: number; caringDays: number }): boolean {
  return streak >= GOOD_WEEK.streakDays || caringDays >= GOOD_WEEK.caringDays;
}
