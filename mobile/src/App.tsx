import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./components/Icon";
import { TopZone } from "./screens/TopZone";
import { HomeScreen } from "./screens/HomeScreen";
import { RemindersScreen } from "./screens/RemindersScreen";
import { PrescriptionScreen } from "./screens/PrescriptionScreen";
import { ExplanationScreen } from "./screens/ExplanationScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { ReferenceScreen } from "./screens/ReferenceScreen";
import { ProofScreen } from "./screens/ProofScreen";
import { WalkScreen } from "./screens/WalkScreen";
import { MilestonesScreen } from "./screens/MilestonesScreen";
import { CustomizeScreen } from "./screens/CustomizeScreen";
import { HealthScreen } from "./screens/HealthScreen";
import { WeeklySummaryScreen } from "./screens/WeeklySummaryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { MedicinesScreen } from "./screens/MedicinesScreen";
import { ScreeningScreen } from "./screens/ScreeningScreen";
import { CoverScreen } from "./screens/CoverScreen";
import { DedicationScreen } from "./screens/DedicationScreen";
import { BottomNav } from "./screens/BottomNav";
import { DesktopBackdrop, SceneBackdrop } from "./components/SceneBackdrop";
import { DogLayer } from "./components/DogLayer";
import { PetAccessory } from "./components/PetAccessory";
import { SceneChips } from "./components/SceneChips";
import { RestockCard } from "./components/RestockCard";
import { selectDogMood } from "../../shared/rules";
import { DEMO_RULES } from "../../shared/config";
import type { AgentDecision, CaretakerSummaryResponse, DerivedDose, DoseEvent, EscalationSettingsResponse, HealthMetric, TodayResponse } from "../../shared/contract";
import { api } from "./lib/api";
import { requestDecision, buildAgentInputFromState } from "./lib/agent";
import { useNavigation } from "./lib/useNavigation";
import { useBark } from "./lib/useBark";
import { useDayPhase } from "./lib/useDayPhase";
import { useRestockHelp } from "./lib/useRestockHelp";
import { demoInstantToday, demoNowFromSearch, parseDemoTime, toDateTimeLocal } from "./lib/demoTime";
import { DEMO_TIME_PARAM, DEMO_TIME_PRESETS, type DemoTimePreset } from "./config/demo";
import { SENIOR_TIMEZONE } from "./config/scene";
import type { World, Accessory } from "./types";
import type { WalkCompletion } from "./lib/walkState";
import { homeDecision, routineDecision } from "./lib/decisions";
import type { TrickRequest } from "./lib/tricks";
import {
  pet,
  todayDoses,
  demoUser,
  demoDog,
  weekSummary,
  bloodPressureReading,
  screeningInfo,
  activityLink,
  clinicTasks,
  caregiver,
  restockAlert,
  worldOptions,
  accessoryOptions,
  walkStats,
  heartsTotal as mockHeartsTotal,
} from "./mock";

let demoParamWarned = false;

/** `?time=HH:MM|morning|evening` → demo clock instant (today in the senior's timezone). Read once, on load. */
function initialDemoNow(): string | null {
  const { demoNow, rejected } = demoNowFromSearch(window.location.search, DEMO_TIME_PARAM, DEMO_TIME_PRESETS, new Date(), SENIOR_TIMEZONE);
  if (rejected !== null && !demoParamWarned) {
    demoParamWarned = true;
    console.warn(`Pawtner: ignoring ?${DEMO_TIME_PARAM}=${rejected} (use HH:MM in 24-hour time, or ${Object.keys(DEMO_TIME_PRESETS).join(" / ")}).`);
  }
  return demoNow;
}

/** Heart count from the local dose list; used only until /api/today has answered. */
function localHeartCount(doses: DerivedDose[], bpLogged: boolean): number {
  return Math.min(DEMO_RULES.heartMaximum, 1 + doses.filter((d) => d.status === "taken").length + (bpLogged ? 1 : 0));
}

export default function App() {
  const { t } = useTranslation();
  // Screen plus a small history: drilled-down screens go "Back" to where they came from (lib/navigation.ts).
  const { screen, navigate, goHome, back } = useNavigation("cover");
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
  // Demo clock: null = real time. `?time=` sets it on load (no agent run, no writes); see config/demo.ts.
  const [demoNow, setDemoNow] = useState<string | null>(initialDemoNow);
  const [demoClockValue, setDemoClockValue] = useState(() => toDateTimeLocal(demoNow ? new Date(demoNow) : new Date()));
  const [agentBusy, setAgentBusy] = useState(false);
  const [escalationSettings, setEscalationSettings] = useState<EscalationSettingsResponse | null>(null);
  const [savedMedicationId, setSavedMedicationId] = useState<string | undefined>(undefined);
  const [savedMedicationName, setSavedMedicationName] = useState<string>("");
  const [demoUnlockAll, setDemoUnlockAll] = useState(false);
  // Bumped after each "Give Buddy a heart"; DogLayer then plays the joyful clip once on Home (if Buddy is joyful).
  const [celebrateRequest, setCelebrateRequest] = useState(0);
  // Set when a trick card on Milestones is tapped; DogLayer performs the trick once per id.
  const [trickRequest, setTrickRequest] = useState<TrickRequest | null>(null);
  const { bark } = useBark();

  /** GET /api/today. `now`: undefined = the current demo clock; null = real time; a string = that instant. */
  const refreshToday = async (now?: string | null) => {
    const at = now === undefined ? demoNow : now;
    try { const result = await api.today(at ?? undefined); setToday(result); setDoseList(result.doses); setBpLogged(result.bloodPressureLoggedToday); setLatestDecision(result.latestDecision); apiWarned.current = false; }
    catch (error) { reportApiProblem(error); }
  };
  useEffect(() => { void refreshToday(); }, []);
  useEffect(() => {
    if (screen === "summary") void api.caretakerSummary().then(setCareSummary).catch((error) => reportApiProblem(error));
    if (screen === "settings") void api.escalationSettings().then(setEscalationSettings).catch((error) => reportApiProblem(error));
  }, [screen]);

  const pendingDose = doseList.find((item) => item.id === pendingDoseId);
  const heartCount = today?.dog.heart ?? localHeartCount(doseList, bpLogged);
  // P1 is adding heartsTotal to the API response; keep this lookup in one place.
  const heartsTotal = today?.dog?.heartsTotal ?? mockHeartsTotal;
  // selectDogMood needs the current time: a celebrate keeps the dog joyful only for DEMO_RULES.celebrateJoyfulMinutes.
  const mood = today ? today.dog.mood : selectDogMood(heartCount, latestDecision, demoNow ?? new Date().toISOString());
  // T2-10: day/night follows the real clock, or the Settings demo clock when one is set.
  const phase = useDayPhase(demoNow);

  // Names come from data unchanged — no .toLowerCase().
  const dogName = today?.dog.name ?? pet.name;
  const caretakerName = careSummary?.caregiver?.name ?? caregiver.caretakerName;
  const livePet = { ...pet, name: dogName, heartCount, streak: today?.dog.streak ?? pet.streak, careScore: careSummary?.careScore ?? pet.careScore, caringDays: careSummary?.caringDays ?? pet.caringDays };
  // /care pair label: build from data via the care.pairNames pattern, not a hardcoded string.
  // Live API names take priority; otherwise fall back to the mock data.
  const liveCaregiver = careSummary?.caregiver
    ? { ...caregiver, seniorName: careSummary.senior.name, caretakerName: careSummary.caregiver.name, names: t("care.pairNames", { senior: careSummary.senior.name, caretaker: careSummary.caregiver.name }) }
    : { ...caregiver, names: t("care.pairNames", { senior: caregiver.seniorName, caretaker: caregiver.caretakerName }) };
  // Restock help (demo only, lib/restockHelp.ts): the card lives on Reminders; "See all" on Home gets a dot while it waits.
  const restock = useRestockHelp(restockAlert);

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
   * Finish posts one walk session (WalkScreen reports a simulated finish only once),
   * uses the decision in the response, then refreshToday() so the dog's mood comes from the server.
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
      const result = await api.walkSession({
        startedAt,
        finishedAt,
        distanceMeters: simulated?.distanceMeters ?? 0,
        fastStretchOccurred: simulated?.fastStretchOccurred ?? false,
      });
      setLatestDecision(result.decision);
      await refreshToday();
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

  /**
   * Gift chip: show the latest treat's message (written on /care, e.g. "Jamie sent Buddy a treat!") and mark it seen.
   * No treat yet, or no API: the friendly "a treat from {{caretaker}} is waiting" line, so the beat never stalls.
   */
  async function handleTreatChip() {
    try {
      const treat = await api.latestTreat();
      if (treat) {
        notify(treat.message);
        if (!treat.seen) void api.markTreatSeen(treat.id).catch((error) => console.warn("Pawtner API:", error));
        return;
      }
    } catch (error) {
      console.warn("Pawtner API:", error);
    }
    notify(t("toast.treatWaiting", { name: dogName, caretaker: caretakerName }));
  }

  /** Prescription "Explain this medicine": remember the name (and the saved id, if any), then drill into the explanation. */
  function handleExplainMedicine(medicineName: string, medicationId?: string) {
    setSavedMedicationName(medicineName);
    if (medicationId) setSavedMedicationId(medicationId);
    navigate("explanation");
  }

  /** A medication was saved: keep its id, refresh today's doses, then continue to schedule. */
  function handleMedicationSaved(medicationId?: string) {
    setSavedMedicationId(medicationId);
    void refreshToday();
    navigate("schedule");
  }

  /** Schedule confirmed: continue to the reference photo step, or home if there is no medication id. */
  function handleScheduleConfirmed() {
    if (savedMedicationId) {
      navigate("reference");
    } else {
      navigate("home");
      notify(t("toast.nudgeSet", { name: dogName }));
      void refreshToday();
    }
  }

  /** Reference photo done (or skipped): back Home with a nudge toast, then refresh so new doses appear. */
  function handleReferenceDone() {
    navigate("home");
    notify(t("toast.nudgeSet", { name: dogName }));
    void refreshToday();
  }

  /**
   * Proof verified: record the pending dose as taken, then return Home with a heart.
   * If the API call fails (no server), marks the dose taken locally and asks requestDecision()
   * in lib/agent.ts for a celebrate decision, so the beat still works offline.
   * The local change is not saved: the next successful /api/today replaces it.
   */
  async function handleDoseVerified(proofPhotoUrl: string | null) {
    if (!pendingDose) return;
    const occurredAt = demoNow ?? new Date().toISOString();
    const doseEvent = { scheduleId: pendingDose.id, scheduledFor: pendingDose.scheduledAt, event: "taken" as const, occurredAt, proofPhotoUrl };
    try {
      const result = await api.doseEvent(doseEvent);
      setToday(result.today);
      setDoseList(result.today.doses);
    } catch (error) {
      // Background notice (once per outage), not "didn't save": the dose is shown as taken locally.
      reportApiProblem(error);
      const localDoses = doseList.map((d) => (d.id === pendingDose.id ? { ...d, status: "taken" as const, eventAt: occurredAt } : d));
      setDoseList(localDoses);
      const localEvent: DoseEvent = { id: `local-${pendingDose.id}-${occurredAt}`, ...doseEvent };
      const input = buildAgentInputFromState({
        now: occurredAt,
        userId: demoUser.id,
        dogId: demoDog.id,
        dogName,
        heart: today?.dog.heart ?? localHeartCount(localDoses, bpLogged),
        streak: today?.dog.streak ?? pet.streak,
        doses: localDoses,
        healthMetrics,
        latestDoseEvent: localEvent,
      });
      setLatestDecision(await requestDecision(input));
    }
    navigate("home");
    setCelebrateRequest((n) => n + 1);
    notify(t("toast.heartGained", { name: dogName }));
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
      navigate("home");
      notify(result.decision.wording);
    } catch (error) {
      reportApiProblem(error, true);
    } finally {
      setAgentBusy(false);
    }
  };

  /**
   * Settings > Demo quick buttons: jump the scene to a preset time today (senior's timezone), or back to real time (null).
   * Only reads (GET /api/today); unlike runAgentAtDemoTime it never runs the agent or writes a decision.
   */
  const setDemoTime = (preset: DemoTimePreset | null) => {
    const time = preset ? parseDemoTime(DEMO_TIME_PRESETS[preset], DEMO_TIME_PRESETS) : null;
    const now = time ? demoInstantToday(time, new Date(), SENIOR_TIMEZONE) : null;
    setDemoNow(now);
    setDemoClockValue(toDateTimeLocal(now ? new Date(now) : new Date()));
    void refreshToday(now);
    navigate("home");
  };

  return (
    <>
    <DesktopBackdrop phase={phase} />
    <main className={`app-shell world-${world}`}>
      {screen === "cover" && <CoverScreen onContinue={() => navigate("dedication")} />}
      {screen === "dedication" && <DedicationScreen onContinue={() => navigate("home")} />}
      {screen !== "cover" && screen !== "dedication" && (
        <>
      <SceneBackdrop phase={phase} />
      <div className="scene-shade" />
      <DogLayer
        screen={screen}
        mood={mood}
        dogName={dogName}
        dizzy={dizzy}
        accessory={<PetAccessory accessory={accessory} dogName={dogName} />}
        celebrateRequest={celebrateRequest}
        trickRequest={trickRequest}
      />
      <TopZone onSettings={() => navigate("settings")} onHome={goHome} pet={livePet} />
      <div className="scene-chips">
        <SceneChips
          streak={livePet.streak}
          onToday={() => navigate("reminders")}
          onStreak={() => navigate("milestones")}
          onTreat={() => void handleTreatChip()}
        />
      </div>
      <div className={`screen-stage screen-${screen}`}>
        {screen === "home" && (
          <HomeScreen
            todayDoses={doseList}
            pet={livePet}
            onTakenDose={(doseId) => {
              setPendingDoseId(doseId);
              navigate("proof");
            }}
            onReminders={() => navigate("reminders")}
            onTreat={() => void handleTreatChip()}
            seeAllBadge={restock.needsAttention}
            onWalk={() => navigate("walk")}
            onBloodPressure={() => navigate("health")}
            onStreak={() => navigate("milestones")}
            decision={homeDecision(latestDecision)}
          />
        )}
        {screen === "reminders" && (
          <RemindersScreen
            back={back}
            doses={doseList}
            restockCard={restock.visible ? <RestockCard alert={restockAlert} caretakerName={caretakerName} state={restock.state} busy={restock.busy} onAsk={() => void restock.askForHelp()} onSelf={restock.getItMyself} onAcknowledge={restock.acknowledgeHandled} /> : null}
          />
        )}
        {screen === "prescription" && <PrescriptionScreen back={back} onSaved={handleMedicationSaved} onExplain={handleExplainMedicine} petName={dogName} />}
        {screen === "explanation" && <ExplanationScreen back={back} onContinue={() => navigate("schedule")} medicineName={savedMedicationName} />}
        {screen === "schedule" && <ScheduleScreen back={back} onConfirm={handleScheduleConfirmed} petName={dogName} medicationId={savedMedicationId} />}
        {screen === "reference" && <ReferenceScreen back={back} onDone={handleReferenceDone} onSkip={handleReferenceDone} petName={dogName} medicationId={savedMedicationId} />}
        {screen === "proof" && <ProofScreen back={back} onVerified={handleDoseVerified} petName={dogName} medicationName={pendingDose?.medicationName} medicationId={pendingDose?.medicationId} />}
        {screen === "walk" && <WalkScreen back={back} walkStats={walkStats} petName={dogName} onDizzyChange={setDizzy} onWalkState={(walking, simulated) => void handleWalkState(walking, simulated)} />}
        {screen === "milestones" && <MilestonesScreen back={back} onWalk={() => navigate("walk")} onCustomize={() => navigate("customize")} pet={livePet} petName={dogName} heartsTotal={heartsTotal} mood={mood} decision={routineDecision(latestDecision)} onTrick={(performance) => setTrickRequest((prev) => ({ id: (prev?.id ?? 0) + 1, performance }))} />}
        {screen === "health" && <HealthScreen back={back} bpLogged={bpLogged} healthMetrics={healthMetrics} latestDecision={latestDecision} onLogBp={handleLogBp} onScreening={() => navigate("screening")} onSummary={() => navigate("summary")} bloodPressureReading={bloodPressureReading} screeningInfo={screeningInfo} activityLink={activityLink} clinicTasks={clinicTasks} weekSummary={weekSummary} petName={dogName} />}
        {screen === "screening" && <ScreeningScreen back={back} screeningInfo={screeningInfo} petName={dogName} />}
        {screen === "summary" && <WeeklySummaryScreen back={back} weekSummary={careSummary ? { ...weekSummary, caringDays: careSummary.caringDays, metrics: [{ ...weekSummary.metrics[0], value: `${careSummary.dosesTaken}/${careSummary.dosesDue}` }, { ...weekSummary.metrics[1], value: `${careSummary.walkCount}` }], doctorQuestion: careSummary.doctorQuestions[0]?.note ?? weekSummary.doctorQuestion } : weekSummary} />}
        {screen === "settings" && <SettingsScreen back={back} openMedicines={() => navigate("medicines")} addMedication={() => navigate("prescription")} openReminders={() => navigate("reminders")} caregiver={liveCaregiver} petName={dogName} demoClockValue={demoClockValue} onDemoClockChange={setDemoClockValue} onRunDemoClock={runAgentAtDemoTime} agentBusy={agentBusy} escalationSettings={escalationSettings} onSaveEscalationSettings={async (settings) => { try { setEscalationSettings(await api.updateEscalationSettings(settings)); notify("Check-in settings saved."); } catch (error) { reportApiProblem(error, true); } }} demoUnlockAll={demoUnlockAll} onToggleDemoUnlockAll={() => setDemoUnlockAll((v) => !v)} demoTimeActive={demoNow !== null} onDemoTime={setDemoTime} />}
        {screen === "medicines" && <MedicinesScreen back={back} petName={dogName} />}
        {screen === "customize" && <CustomizeScreen back={back} onHome={goHome} world={world} setWorld={(nextWorld) => { setWorld(nextWorld); notify(nextWorld === "flat" ? t("toast.worldFlat", { name: dogName }) : nextWorld === "garden" ? t("toast.worldGarden", { name: dogName }) : t("toast.worldKampung", { name: dogName })); }} accessory={accessory} setAccessory={(nextAccessory) => { setAccessory(nextAccessory); notify(nextAccessory === "none" ? t("toast.accessoryNone", { name: dogName }) : t("toast.accessoryOn", { name: dogName, item: t(`accessory.${nextAccessory}`) })); }} worldOptions={worldOptions} accessoryOptions={accessoryOptions} petName={dogName} caretakerName={caretakerName} heartsTotal={heartsTotal} demoUnlockAll={demoUnlockAll} notify={notify} />}
      </div>
      <div className="bottom-dock" aria-hidden="true" />
      <BottomNav screen={screen} navigate={navigate} />
      <span className="woof-bubble">woof!</span>
      <button className="add-button companion-button" onClick={() => { bark(); notify(t("toast.hello", { name: dogName })); }} aria-label={t("toast.hello", { name: dogName })}><Icon name="paw" size={29} /></button>
      {toast && <div className="toast">{toast}</div>}
        </>
      )}
    </main>
    </>
  );
}
