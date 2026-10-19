import { useTranslation } from "react-i18next";
import { FullCard } from "../components/FullCard";
import type { HealthMetric } from "../../../shared/contract";
import type { BackAction } from "../lib/navigation";
import { formatLogDay, formatLogTime, groupReadingsByDay } from "../lib/bpLog";
import { readingLineKey } from "../lib/decisions";
import "./BpLogScreen.css";

/**
 * Blood pressure log (Health → "Blood pressure log"): her readings of the last days, grouped by day ("Today",
 * "Yesterday", then "Mon 13 Oct"), newest first. Each reading: the time, the numbers in bold, the same status line as
 * the Blood Pressure card (lib/decisions.ts readingLineKey; never "Good job" on a warning) and her note in her own
 * words. Presentational: readings come from useBpLog (App.tsx).
 */
export function BpLogScreen({
  back,
  readings,
  loading,
  firstReading,
  now,
  timeZone,
  petName,
}: {
  back: BackAction;
  readings: HealthMetric[];
  loading: boolean;
  /** Her first reading ever (every reading is compared with it), or null. */
  firstReading: HealthMetric | null;
  now: string;
  timeZone: string;
  petName: string;
}) {
  const { t, i18n } = useTranslation();
  const days = groupReadingsByDay(readings, now, timeZone);
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
                  <span className="bp-log__time">{formatLogTime(reading.recordedAt, i18n.language, timeZone)}</span>
                </div>
                <p className="bp-log__status">{t(readingLineKey(reading, firstReading), { name: petName })}</p>
                {reading.note && <p className="bp-log__note">{reading.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </FullCard>
  );
}
