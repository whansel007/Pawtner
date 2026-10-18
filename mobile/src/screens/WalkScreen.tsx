import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { KCAL_PER_KM, STRIDE_METERS } from "../config/walk";
import type { BackAction } from "../lib/navigation";
import type { WalkStats } from "../types";
import { useSimulatedWalk } from "../lib/simulatedWalk";
import type { WalkCompletion } from "../lib/walkState";
import { elapsedSeconds, formatDuration, NOT_MEASURED } from "../lib/walkTimer";
import { useWalkTimer } from "../lib/useWalkTimer";

function formatKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

/** The last walk's result, kept on screen until another walk starts or the senior leaves. A real walk has no distance (null). */
interface FinishedWalk {
  durationSeconds: number;
  distanceMeters: number | null;
}

export function WalkScreen({
  back,
  walkStats,
  petName,
  walkStartedAt,
  clockNow,
  onWalkState,
  onDizzyChange,
}: {
  back: BackAction;
  walkStats: WalkStats;
  petName: string;
  /** When the current walk started (App's walk handler, on the app's clock); null when no walk runs. */
  walkStartedAt: string | null;
  /** The app's clock: the running demo clock, or real time. */
  clockNow: () => string;
  onWalkState: (walking: boolean, simulated?: WalkCompletion) => void;
  onDizzyChange?: (dizzy: boolean) => void;
}) {
  const { t } = useTranslation();
  const [walking, setWalking] = useState(false);
  const [finishedWalk, setFinishedWalk] = useState<FinishedWalk | null>(null);
  const {
    state: simState,
    start: startSim,
    finish: finishSim,
    started: simStarted,
    forceFinished,
  } = useSimulatedWalk();

  useEffect(() => {
    onDizzyChange?.(simState.dizzy);
  }, [simState.dizzy, onDizzyChange]);

  // Keep the latest parent callback without re-running effects when its identity changes.
  const onWalkStateRef = useRef(onWalkState);
  useEffect(() => {
    onWalkStateRef.current = onWalkState;
  }, [onWalkState]);

  // Report completion exactly once per simulated walk; re-arm when a new simulation starts.
  const completionReportedRef = useRef(false);
  const simDone = simState.finished || forceFinished;
  useEffect(() => {
    if (!simStarted) return;
    if (!simDone) {
      completionReportedRef.current = false;
      return;
    }
    if (completionReportedRef.current) return;
    completionReportedRef.current = true;
    setFinishedWalk({ durationSeconds: simState.durationSeconds, distanceMeters: simState.distanceMeters });
    onWalkStateRef.current(false, {
      distanceMeters: simState.distanceMeters,
      fastStretchOccurred: simState.fastStretchOccurred,
    });
  }, [simStarted, simDone, simState.durationSeconds, simState.distanceMeters, simState.fastStretchOccurred]);

  const isSimulating = simStarted && !simDone;
  const isActive = walking || isSimulating;
  const done = !isActive ? finishedWalk : null;
  // Start walk: a live timer from the walk's start; no step counter or GPS, so the other numbers show NOT_MEASURED.
  const walkSeconds = useWalkTimer(walking ? walkStartedAt : null, clockNow);
  const notMeasured = walking || (done !== null && done.distanceMeters === null);
  const toggleWalk = () => {
    const next = !walking;
    if (next) setFinishedWalk(null);
    else if (walkStartedAt) setFinishedWalk({ durationSeconds: elapsedSeconds(walkStartedAt, clockNow()), distanceMeters: null });
    setWalking(next);
    onWalkState(next);
  };

  // Derive demo step count and calories from simulated distance.
  const simSteps = isSimulating ? Math.max(0, Math.round(simState.distanceMeters / STRIDE_METERS)) : 0;
  const simCalories = isSimulating
    ? Math.max(0, Math.round((simState.distanceMeters / 1000) * KCAL_PER_KM))
    : 0;

  return (
    <FullCard back={back} className="walk-card">
      <p className="eyebrow green">{t("walk.eyebrow")}</p>
      <h2>{isActive ? t("walk.titleWalking") : done ? t("walk.titleDone") : t("walk.titleReady")}</h2>
      <div className={`walk-orb ${isActive ? "active" : ""} ${done ? "done" : ""}`}>
        <Icon name="walk" size={42} />
        <strong>
          {isSimulating
            ? formatDuration(simState.durationSeconds)
            : walking
              ? formatDuration(walkSeconds)
              : done
                ? formatDuration(done.durationSeconds)
                : "00:00"}
        </strong>
        <small>
          {isSimulating
            ? t("walk.km", { km: formatKm(simState.distanceMeters) })
            : notMeasured
              ? t("walk.km", { km: NOT_MEASURED })
              : done && done.distanceMeters !== null
                ? t("walk.km", { km: formatKm(done.distanceMeters) })
                : t("walk.startReady", { name: petName })}
        </small>
      </div>
      {done && done.distanceMeters !== null && (
        <p className="walk-done" role="status">{t("walk.doneMessage", { km: formatKm(done.distanceMeters), name: petName })}</p>
      )}
      <div className="walk-stats">
        <div><strong>{notMeasured ? NOT_MEASURED : isSimulating ? String(simSteps) : "0"}</strong><small>{t("common.steps")}</small></div>
        <div><strong>{notMeasured ? NOT_MEASURED : isSimulating ? String(simCalories) : "0"}</strong><small>{t("common.calories")}</small></div>
        <div><strong>{notMeasured ? NOT_MEASURED : isSimulating ? simState.speedKmh.toFixed(1) : "0.0"}</strong><small>{t("common.kmh")}</small></div>
      </div>
      {!isSimulating && (
        <button className={`primary-button ${walking ? "stop-button" : ""}`} onClick={toggleWalk}>
          {walking ? t("walk.finishWalk") : t("walk.startWalk")}
        </button>
      )}
      {isSimulating && (
        <button className="primary-button stop-button" onClick={() => finishSim()}>
          {t("walk.finishWalk")}
        </button>
      )}
      {!walking && !isSimulating && (
        <button className="primary-button" onClick={() => { setFinishedWalk(null); onWalkState(true); startSim(); }}>
          {t("walk.simulateWalk")}
        </button>
      )}
      {isSimulating && simState.dizzy && (
        <p className="walk-dizzy">{t("walk.dizzyMessage", { name: petName })}</p>
      )}
      <p className="walk-note">{walkStats.goal}</p>
      <p className="gentle-note">{t("walk.gentleNote", { name: petName })}</p>
    </FullCard>
  );
}
