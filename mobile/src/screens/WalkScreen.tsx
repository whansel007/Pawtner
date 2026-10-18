import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import { useSimulatedWalk } from "../lib/simulatedWalk";
import { simulationFor, type WalkCompletion } from "../lib/walkState";
import { elapsedSeconds, formatDuration } from "../lib/walkTimer";
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
  goalMinutes,
  simulateRequested,
  onSimulateStarted,
  petName,
  walkStartedAt,
  clockNow,
  onWalkState,
  onDizzyChange,
}: {
  back: BackAction;
  /** The walk goal's minutes (Settings): the goal line, and how long Simulate walk lasts in simulated time. */
  goalMinutes: number;
  /** Settings > For demo only > Simulate walk asked for a simulation: start it on opening, then onSimulateStarted. */
  simulateRequested: boolean;
  onSimulateStarted: () => void;
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
  const simulation = useMemo(() => simulationFor(goalMinutes), [goalMinutes]);
  const {
    state: simState,
    start: startSim,
    finish: finishSim,
    started: simStarted,
    forceFinished,
  } = useSimulatedWalk(simulation.points, simulation.playbackRate);

  useEffect(() => {
    onDizzyChange?.(simState.dizzy);
  }, [simState.dizzy, onDizzyChange]);

  // Keep the latest parent callback without re-running effects when its identity changes.
  const onWalkStateRef = useRef(onWalkState);
  useEffect(() => {
    onWalkStateRef.current = onWalkState;
  }, [onWalkState]);

  // Simulate walk lives on Settings > For demo only (owner, 18 Oct): it opens this screen and the simulation runs here.
  useEffect(() => {
    if (!simulateRequested) return;
    onSimulateStarted();
    setFinishedWalk(null);
    onWalkStateRef.current(true);
    startSim();
  }, [simulateRequested, onSimulateStarted, startSim]);

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
      durationSeconds: simState.durationSeconds,
    });
  }, [simStarted, simDone, simState.durationSeconds, simState.distanceMeters, simState.fastStretchOccurred]);

  const isSimulating = simStarted && !simDone;
  const isActive = walking || isSimulating;
  const done = !isActive ? finishedWalk : null;
  // Start walk: a live timer from the walk's start. No step counter or GPS, so a real walk (walking or finished) shows
  // only its time, no distance line. No steps / calories / speed for any walk (owner, 18 Oct).
  const walkSeconds = useWalkTimer(walking ? walkStartedAt : null, clockNow);
  const realWalk = walking || (done !== null && done.distanceMeters === null);
  const toggleWalk = () => {
    const next = !walking;
    if (next) setFinishedWalk(null);
    else if (walkStartedAt) setFinishedWalk({ durationSeconds: elapsedSeconds(walkStartedAt, clockNow()), distanceMeters: null });
    setWalking(next);
    onWalkState(next);
  };

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
        {!realWalk && (
          <small>
            {isSimulating
              ? t("walk.km", { km: formatKm(simState.distanceMeters) })
              : done && done.distanceMeters !== null
                ? t("walk.km", { km: formatKm(done.distanceMeters) })
                : t("walk.startReady", { name: petName })}
          </small>
        )}
      </div>
      {done && (
        <p className="walk-done" role="status">
          {done.distanceMeters !== null
            ? t("walk.doneMessage", { km: formatKm(done.distanceMeters), name: petName })
            : t("walk.doneMessageNoDistance", { name: petName })}
        </p>
      )}
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
      {isSimulating && simState.dizzy && (
        <p className="walk-dizzy">{t("walk.dizzyMessage", { name: petName })}</p>
      )}
      <p className="walk-note">{t("walk.heartGoal", { minutes: goalMinutes })}</p>
      <p className="gentle-note">{t("walk.gentleNote", { name: petName })}</p>
    </FullCard>
  );
}
