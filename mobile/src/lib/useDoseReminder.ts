import { useEffect, useRef } from "react";
import type { DerivedDose } from "../../../shared/contract";
import { DOSE_REMINDER } from "../config/reminders";
import { dosesDueForReminder, readGivenReminders, reminderKey, writeGivenReminders } from "./doseReminder";

/**
 * Every few seconds, compares the clock (`clockNow`: the running demo clock, or real time) with today's dose times and
 * calls `onRemind` once for each dose whose time has come and isn't taken (lib/doseReminder.ts).
 */
export function useDoseReminder(doses: readonly DerivedDose[], clockNow: () => string, onRemind: (due: DerivedDose[]) => void) {
  // Latest values without restarting the timer on every render.
  const latest = useRef({ doses, clockNow, onRemind });
  latest.current = { doses, clockNow, onRemind };
  useEffect(() => {
    const check = () => {
      const { doses: current, clockNow: now, onRemind: remind } = latest.current;
      const given = readGivenReminders();
      const due = dosesDueForReminder(current, Date.parse(now()), given);
      if (due.length === 0) return;
      due.forEach((dose) => given.add(reminderKey(dose)));
      writeGivenReminders(given);
      remind(due);
    };
    check();
    const timer = window.setInterval(check, DOSE_REMINDER.checkEveryMs);
    return () => window.clearInterval(timer);
  }, []);
}
