import type { HealthMetric } from "../../../shared/contract";
import type { BackAction } from "../lib/navigation";
import { useBpLog } from "../lib/useBpLog";
import { BpLogScreen } from "./BpLogScreen";

/** Loads the blood-pressure log once per opening (useBpLog) and hands it to the presentational BpLogScreen. */
export function BpLogContainer({ back, now, timeZone, fallback, firstReading, petName, onOffline }: {
  back: BackAction;
  now: string;
  timeZone: string;
  /** The readings the phone already has (today's), shown when the API can't be reached. */
  fallback: HealthMetric[];
  firstReading: HealthMetric | null;
  petName: string;
  onOffline: (error: unknown) => void;
}) {
  const log = useBpLog(now, fallback, onOffline);
  return <BpLogScreen back={back} readings={log.readings} loading={log.status === "loading"} firstReading={firstReading} now={now} timeZone={timeZone} petName={petName} />;
}
