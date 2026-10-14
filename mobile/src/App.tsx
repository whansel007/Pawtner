import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./components/Icon";
import { TopZone } from "./screens/TopZone";
import { HomeScreen } from "./screens/HomeScreen";
import { CareScreen } from "./screens/CareScreen";
import { RemindersScreen } from "./screens/RemindersScreen";
import { PrescriptionScreen } from "./screens/PrescriptionScreen";
import { ExplanationScreen } from "./screens/ExplanationScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { ProofScreen } from "./screens/ProofScreen";
import { WalkScreen } from "./screens/WalkScreen";
import { MilestonesScreen } from "./screens/MilestonesScreen";
import { CustomizeScreen } from "./screens/CustomizeScreen";
import { HealthScreen } from "./screens/HealthScreen";
import { WeeklySummaryScreen } from "./screens/WeeklySummaryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ScreeningScreen } from "./screens/ScreeningScreen";
import { CoverScreen } from "./screens/CoverScreen";
import { DedicationScreen } from "./screens/DedicationScreen";
import { BottomNav } from "./screens/BottomNav";
import { DesktopBackdrop, SceneBackdrop } from "./components/SceneBackdrop";
import { DogLayer } from "./components/DogLayer";
import { DEFAULT_PHASE } from "./config/scene";
import { selectDogMood } from "../../shared/rules";
import { DEMO_RULES } from "../../shared/config";
import type { AgentDecision, CaretakerSummaryResponse, DerivedDose, EscalationSettingsResponse, HealthMetric, TodayResponse } from "../../shared/contract";
import { api } from "./lib/api";
import { requestDecision, buildAgentInputFromState } from "./lib/agent";
import type { Screen, World, Accessory } from "./types";
import type { WalkCompletion } from "./lib/simulatedWalk";
import {
  pet,
  doses,
  todayDoses,
  demoUser,
  demoDog,
  medication,
  medicationExplanation,
  nudgeSettings,
  weekSummary,
  bloodPressureReading,
  screeningInfo,
  activityLink,
  clinicTasks,
  caregiver,
  careActivity,
  restockAlert,
  currentWorld,
  tricks,
  souvenirs,
  worldOptions,
  accessoryOptions,
  walkStats,
} from "./mock";

function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>("cover");
  const [doseList, setDoseList] = useState<DerivedDose[]>(todayDoses);
  const [pendingDoseId, setPendingDoseId] = useState<string | null>(null);
  const [bpLogged, setBpLogged] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [latestDecision, setLatestDecision] = useState<AgentDecision | null>(null);
  const [world, setWorld] = useState<World>("garden");
  const [accessory, setAccessory] = useState<Accessory>("none");
  const [toast, setToast] = useState("");
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [careSummary, setCareSummary] = useState<CaretakerSummaryResponse | null>(null);
  const [walkStartedAt, setWalkStartedAt] = useState<string | null>(null);
  const [dizzy, setDizzy] = useState(false);
  // One friendly notice per outage; the technical error goes to the console, never to the senior.
  const apiWarned = useRef(false);
  const [demoNow, setDemoNow] = useState<string | null>(null);
  const [demoClockValue, setDemoClockValue] = useState(() => toDateTimeLocal(new Date()));
  const [agentBusy, setAgentBusy] = useState(false);
  const [escalationSettings, setEscalationSettings] = useState<EscalationSettingsResponse | null>(null);

  const refreshToday = async (now?: string) => {
    try { const result = await api.today(now ?? demoNow ?? undefined); setToday(result); setDoseList(result.doses); setBpLogged(result.bloodPressureLoggedToday); setLatestDecision(result.latestDecision); apiWarned.current = false; }
    catch (error) { reportApiProblem(error); }
  };
  useEffect(() => { void refreshToday(); }, []);
  useEffect(() => {
    if (screen === "care" || screen === "summary") void api.caretakerSummary().then(setCareSummary).catch((error) => reportApiProblem(error));
    if (screen === "settings") void api.escalationSettings().then(setEscalationSettings).catch((error) => reportApiProblem(error));
  }, [screen]);

  const takenCount = doseList.filter((d) => d.status === "taken").length;
  const heartCount = today?.dog.heart ?? Math.min(DEMO_RULES.heartMaximum, 1 + takenCount + (bpLogged ? 1 : 0));
  const mood = today ? today.dog.mood : selectDogMood(heartCount, latestDecision);
  const phase = DEFAULT_PHASE;

  // Names come from data unchanged — no .toLowerCase().
  const dogName = today?.dog.name ?? pet.name;
  const caretakerName = careSummary?.caregiver?.name ?? caregiver.caretakerName;
  const livePet = { ...pet, name: dogName, heartCount, streak: today?.dog.streak ?? pet.streak, careScore: careSummary?.careScore ?? pet.careScore, caringDays: careSummary?.caringDays ?? pet.caringDays };
  const liveCaregiver = careSummary?.caregiver ? { ...caregiver, caretakerName: careSummary.caregiver.name, names: `${careSummary.senior.name} + ${careSummary.caregiver.name}` } : caregiver;
  const liveCareActivity = careSummary ? { ...careActivity, dosesTaken: `${careSummary.dosesTaken} of ${careSummary.dosesDue}`, dosesTakenCount: careSummary.dosesTaken, dosesTotal: careSummary.dosesDue, walkDistance: `${(careSummary.walkDistanceMeters / 1000).toFixed(1)} km`, description: careSummary.caringMoments[0]?.message ?? "Care routine activity", timestamp: careSummary.latestActivityAt ? new Date(careSummary.latestActivityAt).toLocaleString() : "No recent activity" } : careActivity;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  /** Background loads warn once per outage; failed user actions always say so. */
  const reportApiProblem = (error: unknown, userAction = false) => {
    console.warn("Pawtner API:", error);
    if (userAction) { notify(t("toast.apiActionFailed")); return; }
    if (apiWarned.current) return;
    apiWarned.current = true;
    notify(t("toast.apiOffline"));
  };

  /**
   * BP form submit: posts to the API with systolic, diastolic, note, recordedAt.
   * Uses the decision in the response for the result card and the calm no-toast rule,
   * then refreshToday() so mood comes from the server.
   * If the API call fails (no server), falls back to requestDecision() in lib/agent.ts
   * so the beat still works offline, and shows the one-time offline notice.
   */
  async function handleLogBp(metric: HealthMetric) {
    setHealthMetrics((prev) => [...prev, metric]);
    const recordedAt = demoNow ?? new Date().toISOString();
    let decision: AgentDecision;
    try {
      const result = await api.healthMetric({
        systolic: metric.systolic,
        diastolic: metric.diastolic,
        note: metric.note,
        recordedAt,
      });
      decision = result.decision;
      setLatestDecision(decision);
      await refreshToday();
    } catch {
      // Offline fallback: call the rules engine directly so the beat still works.
      const updatedMetrics = [...healthMetrics, metric];
      const input = buildAgentInputFromState({
        now: recordedAt,
        userId: demoUser.id,
        dogId: demoDog.id,
        dogName: dogName,
        heart: heartCount,
        streak: today?.dog.streak ?? pet.streak,
        doses: doseList,
        healthMetrics: updatedMetrics,
      });
      decision = await requestDecision(input);
      setLatestDecision(decision);
      reportApiProblem("health-metric request failed");
    }
    setBpLogged(true);
    // Emergency and see-GP moments stay calm: no playful toast.
    if (decision.decision !== "emergency_995" && decision.decision !== "see_gp_soon") {
      notify(t("toast.bpLogged", { name: dogName }));
    }
  }

  /**
   * Walk start/finish from WalkScreen. Start records the start time.
   * Finish posts one walk session (WalkScreen reports a simulated finish only once).
   * If the API call fails, a simulated walk falls back to requestDecision() so the dog still reacts offline.
   */
  async function handleWalkState(walking: boolean, simulated?: WalkCompletion) {
    if (walking) {
      setWalkStartedAt(new Date().toISOString());
      return;
    }
    if (!walkStartedAt && !simulated) return;
    const startedAt = walkStartedAt ?? new Date().toISOString();
    const finishedAt = new Date().toISOString();
    setWalkStartedAt(null);
    setDizzy(false);
    try {
      await api.walkSession({
        startedAt,
        finishedAt,
        distanceMeters: simulated?.distanceMeters ?? 0,
        fastStretchOccurred: simulated?.fastStretchOccurred ?? false,
      });
      setCareSummary(await api.caretakerSummary());
    } catch (error) {
      reportApiProblem(error, true);
      if (simulated) {
        const input = buildAgentInputFromState({
          now: finishedAt,
          userId: demoUser.id,
          dogId: demoDog.id,
          dogName,
          heart: heartCount,
          streak: today?.dog.streak ?? pet.streak,
          doses: doseList,
          healthMetrics,
          walkFinished: true,
        });
        setLatestDecision(await requestDecision(input));
      }
    }
  }

  const runAgentAtDemoTime = async () => {
    const parsed = new Date(demoClockValue);
    if (!Number.isFinite(parsed.getTime())) return;
    const now = parsed.toISOString();
    setAgentBusy(true);
    setDemoNow(now);
    try {
      const current = await api.today(now);
      const result = await api.decide(current.user.id, now);
      setDemoNow(now);
      setDemoClockValue(toDateTimeLocal(parsed));
      await refreshToday(now);
      setScreen("home");
      notify(result.decision.wording);
    } catch (error) {
      reportApiProblem(error, true);
    } finally {
      setAgentBusy(false);
    }
  };

  return (
    <>
    <DesktopBackdrop phase={phase} />
    <main className={`app-shell world-${world}`}>
      {screen === "cover" && <CoverScreen onContinue={() => setScreen("dedication")} />}
      {screen === "dedication" && <DedicationScreen onContinue={() => setScreen("home")} />}
      {screen !== "cover" && screen !== "dedication" && (
        <>
      <SceneBackdrop phase={phase} />
      <div className="scene-shade" />
      <DogLayer
        screen={screen}
        mood={mood}
        dogName={dogName}
        dizzy={dizzy}
        accessory={accessory !== "none" && <span className={`pet-accessory accessory-${accessory}`} aria-label={t("toast.petAccessoryAria", { name: dogName, item: accessory })}><i /><i /></span>}
      />
      <TopZone onSettings={() => setScreen("settings")} pet={livePet} />
      <div className={`screen-stage screen-${screen}`}>
        {screen === "home" && (
          <HomeScreen
            todayDoses={doseList}
            pet={livePet}
            onTakenDose={(doseId) => {
              setPendingDoseId(doseId);
              setScreen("proof");
            }}
            onReminders={() => setScreen("reminders")}
            onTreat={() => notify(t("toast.treatWaiting", { name: dogName, caretaker: caretakerName }))}
            onWalk={() => setScreen("walk")}
            onBloodPressure={() => setScreen("health")}
            decision={latestDecision}
          />
        )}
        {screen === "care" && <CareScreen goHome={() => setScreen("home")} sendTreat={() => notify(t("toast.treatSent", { name: dogName }))} pet={livePet} caregiver={liveCaregiver} careActivity={liveCareActivity} restockAlert={restockAlert} />}
        {screen === "reminders" && <RemindersScreen goHome={() => setScreen("home")} doses={doses} />}
        {screen === "prescription" && <PrescriptionScreen goHome={() => setScreen("home")} onExplain={() => setScreen("explanation")} medication={medication} petName={dogName} />}
        {screen === "explanation" && <ExplanationScreen onBack={() => setScreen("prescription")} onContinue={() => setScreen("schedule")} medicationExplanation={medicationExplanation} />}
        {screen === "schedule" && <ScheduleScreen onBack={() => setScreen("explanation")} onConfirm={() => { setScreen("home"); notify(t("toast.nudgeSet", { name: dogName })); }} nudgeSettings={nudgeSettings} petName={dogName} />}
        {screen === "proof" && <ProofScreen onBack={() => setScreen("home")} onVerified={async () => { const dose = doseList.find((item) => item.id === pendingDoseId); if (!dose) return; try { const result = await api.doseEvent({ scheduleId: dose.id, scheduledFor: dose.scheduledAt, event: "taken", occurredAt: demoNow ?? new Date().toISOString() }); setToday(result.today); setDoseList(result.today.doses); setScreen("home"); notify(t("toast.heartGained", { name: dogName })); } catch (error) { reportApiProblem(error, true); } }} medication={medication} petName={dogName} />}
        {screen === "walk" && <WalkScreen goHome={() => setScreen("home")} walkStats={walkStats} petName={dogName} onDizzyChange={setDizzy} onWalkState={(walking, simulated) => void handleWalkState(walking, simulated)} />}
        {screen === "milestones" && <MilestonesScreen goHome={() => setScreen("home")} onWalk={() => setScreen("walk")} onCustomize={() => setScreen("customize")} pet={pet} currentWorld={currentWorld} tricks={tricks} souvenirs={souvenirs} petName={dogName} />}
        {screen === "health" && <HealthScreen goHome={() => setScreen("home")} bpLogged={bpLogged} healthMetrics={healthMetrics} latestDecision={latestDecision} onLogBp={handleLogBp} onScreening={() => setScreen("screening")} onSummary={() => setScreen("summary")} bloodPressureReading={bloodPressureReading} screeningInfo={screeningInfo} activityLink={activityLink} clinicTasks={clinicTasks} weekSummary={weekSummary} petName={dogName} />}
        {screen === "screening" && <ScreeningScreen onBack={() => setScreen("health")} screeningInfo={screeningInfo} petName={dogName} />}
        {screen === "summary" && <WeeklySummaryScreen onBack={() => setScreen("health")} weekSummary={careSummary ? { ...weekSummary, caringDays: careSummary.caringDays, metrics: [{ ...weekSummary.metrics[0], value: `${careSummary.dosesTaken}/${careSummary.dosesDue}` }, { ...weekSummary.metrics[1], value: `${careSummary.walkCount}` }], doctorQuestion: careSummary.doctorQuestions[0]?.note ?? weekSummary.doctorQuestion } : weekSummary} />}
        {screen === "settings" && <SettingsScreen goHome={() => setScreen("home")} addMedication={() => setScreen("prescription")} openCaretaker={() => setScreen("care")} openReminders={() => setScreen("reminders")} caregiver={caregiver} petName={dogName} demoClockValue={demoClockValue} onDemoClockChange={setDemoClockValue} onRunDemoClock={runAgentAtDemoTime} agentBusy={agentBusy} escalationSettings={escalationSettings} onSaveEscalationSettings={async (settings) => { try { setEscalationSettings(await api.updateEscalationSettings(settings)); notify("Check-in settings saved."); } catch (error) { reportApiProblem(error, true); } }} />}
        {screen === "customize" && <CustomizeScreen onBack={() => setScreen("milestones")} world={world} setWorld={(nextWorld) => { setWorld(nextWorld); notify(nextWorld === "flat" ? t("toast.worldFlat", { name: dogName }) : nextWorld === "garden" ? t("toast.worldGarden", { name: dogName }) : t("toast.worldKampung", { name: dogName })); }} accessory={accessory} setAccessory={(nextAccessory) => { setAccessory(nextAccessory); notify(nextAccessory === "none" ? t("toast.accessoryNone", { name: dogName }) : t("toast.accessoryOn", { name: dogName, item: nextAccessory })); }} worldOptions={worldOptions} accessoryOptions={accessoryOptions} petName={dogName} />}
      </div>
      <div className="bottom-dock" aria-hidden="true" />
      <BottomNav screen={screen} navigate={setScreen} />
      <span className="woof-bubble">woof!</span>
      <button className="add-button companion-button" onClick={() => notify(t("toast.hello", { name: dogName }))} aria-label={t("toast.hello", { name: dogName })}><Icon name="paw" size={29} /></button>
      {toast && <div className="toast">{toast}</div>}
        </>
      )}
    </main>
    </>
  );
}
