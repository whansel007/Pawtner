import { useTranslation } from "react-i18next";
import { FullCard } from "../components/FullCard";
import type { HealthMetric } from "../../../shared/contract";
import type { BackAction } from "../lib/navigation";
import { formatLogDay, formatLogTime, groupReadingsByDay, logSecondLine } from "../lib/bpLog";
import { isWarningReading } from "../lib/decisions";
import "./BpLogScreen.css";

/**
 * Blood pressure log (Health → "Blood pressure log"): her readings of the last days, grouped by day ("Today",
 * "Yesterday", then "Mon 13 Oct"), newest first. Each reading: the numbers in bold, a small "Warning" label on a reading
 * that is a warning (lib/decisions.ts isWarningReading), the time, and ONE second line (lib/bpLog.ts logSecondLine):
 * "higher than your first reading" and/or her note as written. Every card reserves that line, so they line up.
 * Presentational: readings come from useBpLog (App.tsx).
 */
export function BpLogScreen({
  back,
  readings,
  loading,
  firstReading,
  now,
  timeZone,
}: {
  back: BackAction;
  readings: HealthMetric[];
  loading: boolean;
  /** Her first reading ever (every reading is compared with it), or null. */
  firstReading: HealthMetric | null;
  now: string;
  timeZone: string;
}) {
  const { t, i18n } = useTranslation();
  const days = groupReadingsByDay(readings, now, timeZone);
  const secondLine = (reading: HealthMetric) => {
    const { reasonKey, note, noteKey } = logSecondLine(reading, firstReading);
    return [reasonKey ? t(reasonKey) : null, note ?? (noteKey ? t(noteKey) : null)].filter(Boolean).join(" · ");
  };
  return (
    <FullCard back={back}>
      <h2>{t("bpLog.title")}</h2>
      {loading && <p className="bp-log__empty">{t("bpLog.loading")}</p>}
      {!loading && days.length === 0 && <p className="bp-log__empty">{t("bpLog.empty")}</p>}
      {days.map((day) => (
        <section className="bp-log__day" key={day.day} aria-label={day.when === "earlier" ? formatLogDay(day.day, i18n.language) : t(`bpLog.${day.when}`)}>
          <h3 className="bp-log__heading">{day.when === "earlier" ? formatLogDay(day.day, i18n.language) : t(`bpLog.${day.when}`)}</h3>
          <ul className="bp-log__list">
            {day.readings.map((reading) => (
              <li className="bp-log__item" key={reading.id}>
                <div className="bp-log__row">
                  <strong className="bp-log__reading">{`${reading.systolic} / ${reading.diastolic}`}</strong>
                  {isWarningReading(reading, firstReading) && <span className="bp-log__warning">{t("health.warning")}</span>}
                  <span className="bp-log__time">{formatLogTime(reading.recordedAt, i18n.language, timeZone)}</span>
                </div>
                <p className="bp-log__note">{secondLine(reading)}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </FullCard>
  );
}
