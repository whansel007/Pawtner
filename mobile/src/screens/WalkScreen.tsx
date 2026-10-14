import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { WalkStats } from "../types";
import { useSimulatedWalk } from "../lib/simulatedWalk";
import type { WalkCompletion } from "../lib/simulatedWalk";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WalkScreen({
  goHome,
  walkStats,
  petName,
  onWalkState,
  onDizzyChange,
}: {
  goHome: () => void;
  walkStats: WalkStats;
  petName: string;
  onWalkState: (walking: boolean, simulated?: WalkCompletion) => void;
  onDizzyChange?: (dizzy: boolean) => void;
}) {
  const { t } = useTranslation();
  const [walking, setWalking] = useState(false);
  const { state: simState, start: startSim, started: simStarted } = useSimulatedWalk();

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
  useEffect(() => {
    if (!simStarted) return;
    if (!simState.finished) {
      completionReportedRef.current = false;
      return;
    }
    if (completionReportedRef.current) return;
    completionReportedRef.current = true;
    onWalkStateRef.current(false, {
      distanceMeters: simState.distanceMeters,
      fastStretchOccurred: simState.fastStretchOccurred,
    });
  }, [simStarted, simState.finished, simState.distanceMeters, simState.fastStretchOccurred]);

  const isSimulating = simStarted && !simState.finished;
  const isActive = walking || isSimulating;

  return (
    <section className="content-card full-card walk-card">
      <button className="back-button" onClick={goHome}><Icon name="back" size={20} /> {t("common.home")}</button>
      <p className="eyebrow green">{t("walk.eyebrow")}</p>
      <h2>{isActive ? t("walk.titleWalking") : t("walk.titleReady")}</h2>
      <div className={`walk-orb ${isActive ? "active" : ""}`}>
        <Icon name="walk" size={42} />
        <strong>
          {isSimulating
            ? formatDuration(simState.durationSeconds)
            : walking
              ? walkStats.duration
              : "00:00"}
        </strong>
        <small>
          {isSimulating
            ? `${(simState.distanceMeters / 1000).toFixed(2)} km`
            : walking
              ? walkStats.distance
              : t("walk.startReady", { name: petName })}
        </small>
      </div>
      <div className="walk-stats">
        <div><strong>{walking ? walkStats.steps : "0"}</strong><small>{t("common.steps")}</small></div>
        <div><strong>{walking ? walkStats.calories : "0"}</strong><small>{t("common.calories")}</small></div>
        <div><strong>{isSimulating ? simState.speedKmh.toFixed(1) : walking ? walkStats.speed : "0.0"}</strong><small>{t("common.kmh")}</small></div>
      </div>
      {!isSimulating && (
        <button className={`primary-button ${walking ? "stop-button" : ""}`} onClick={() => { const next = !walking; setWalking(next); onWalkState(next); }}>
          {walking ? t("walk.finishWalk") : t("walk.startWalk")}
        </button>
      )}
      {!walking && !isSimulating && (
        <button className="primary-button" onClick={() => { onWalkState(true); startSim(); }}>
          {t("walk.simulateWalk")}
        </button>
      )}
      {isSimulating && simState.dizzy && (
        <p className="walk-dizzy">{t("walk.dizzyMessage", { name: petName })}</p>
      )}
      <p className="walk-note">{walkStats.goal}</p>
      <p className="gentle-note">{t("walk.gentleNote", { name: petName })}</p>
    </section>
  );
}
