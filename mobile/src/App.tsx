import { useCallback, useEffect, useRef, useState } from "react";
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
import { VisitNotesScreen } from "./screens/VisitNotesScreen";
import { useVisitNotes } from "./lib/useVisitNotes";
import { useShareBloodPressure } from "./lib/useSharing";
import { ScreeningScreen } from "./screens/ScreeningScreen";
import { CoverScreen } from "./screens/CoverScreen";
import { DedicationScreen } from "./screens/DedicationScreen";
import { BottomNav } from "./screens/BottomNav";
import { DesktopBackdrop, SceneBackdrop } from "./components/SceneBackdrop";
import { DogLayer } from "./components/DogLayer";
import { PetAccessory } from "./components/PetAccessory";
import { SceneChips } from "./components/SceneChips";
import { RestockCard } from "./components/RestockCard";
import { selectDogMood, firstReadingOf } from "../../shared/rules";
import type { AgentDecision, CaretakerSummaryResponse, DerivedDose, DoseEvent, HealthMetric, MedicationDetail, TodayResponse } from "../../shared/contract";
import { api } from "./lib/api";
import { requestDecision, buildAgentInputFromState } from "./lib/agent";
import { useNavigation } from "./lib/useNavigation";
import { useBark } from "./lib/useBark";
import { useDayPhase } from "./lib/useDayPhase";
import { useRestockHelp } from "./lib/useRestockHelp";
import { pickRestockAlerts } from "./lib/restockHelp";
import { resetDemoStorage } from "./lib/demoReset";
import { mergeHealthMetrics } from "./lib/healthReadings";
import { demoClockOnLoad, runningClock, saveDemoClock, searchWithout, type DemoClockAnchor } from "./lib/demoClock";
import { useHomeView } from "./lib/useHomeView";
import { useWalkGoal } from "./lib/useWalkGoal";
import { useDoseReminder } from "./lib/useDoseReminder";
import { shouldBarkFor } from "./lib/nudgeBark";
import { activityToastKey, bpToastKey, heartChange } from "./lib/heartToast";
import { countAfterTaking } from "./lib/doseCount";
import { RESTOCK_SOON_DAYS } from "./config/restock";
import { demoInstantToday, demoNowFromSearch, parseDemoTime, toDateTimeLocal } from "./lib/demoTime";
import { DEMO_CLOCK_PARAM, DEMO_RESET_PRESET, DEMO_TIME_PARAM, DEMO_TIME_PRESETS, type DemoTimePreset, type DemoUnlockKey } from "./config/demo";
import { demoHeartsTotal, demoStreak, demoTodayHearts, hasDemoTodayHearts, toggleDemoTick } from "./lib/demoUnlocks";
import { computeHeart, heartActivities, walkHeartTimes } from "../../shared/selectors";
import { SENIOR_TIMEZONE } from "./config/scene";
import type { World, Accessory, Screen } from "./types";
import type { WalkCompletion } from "./lib/walkState";
import { isUrgentDecision, routineDecision } from "./lib/decisions";
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
  heartsTotal as mockHeartsTotal,
} from "./mock";

let demoParamWarned = false;

/** `?time=HH:MM|morning|evening` → scene time (today in the senior's timezone). Read once, on load. Visual only. */
function initialSceneTime(): string | null {
  const { demoNow, rejected } = demoNowFromSearch(window.location.search, DEMO_TIME_PARAM, DEMO_TIME_PRESETS, new Date(), SENIOR_TIMEZONE);
  if (rejected !== null && !demoParamWarned) {
    demoParamWarned = true;
    console.warn(`Pawtner: ignoring ?${DEMO_TIME_PARAM}=${rejected} (use HH:MM in 24-hour time, or ${Object.keys(DEMO_TIME_PRESETS).join(" / ")}).`);
  }
  return demoNow;
}

/** `?clock=HH:MM|morning|evening` → agent clock (today in the senior's timezone), e.g. after "Reset to morning". Read once, on load. */
function initialAgentClock(): string | null {
  return demoNowFromSearch(window.location.search, DEMO_CLOCK_PARAM, DEMO_TIME_PRESETS, new Date(), SENIOR_TIMEZONE).demoNow;
}

/** Hearts from the local state (same rule as the API, shared/selectors.ts); used only until /api/today has answered. */
function localHeartCount(doses: DerivedDose[], bpLogged: boolean, walked: boolean): number {
  return computeHeart(heartActivities(doses, bpLogged, walked));
}

export default function App({ startScreen, onRestart }: { startScreen?: Screen; onRestart?: (screen: Screen) => void } = {}) {
  const { t } = useTranslation();
  // Screen plus a small history: drilled-down screens go "Back" to where they came from (lib/navigation.ts).
  const { screen, navigate, goHome, back } = useNavigation(startScreen ?? "cover");
  const [doseList, setDoseList] = useState<DerivedDose[]>(todayDoses);
  const [pendingDoseId, setPendingDoseId] = useState<string | null>(null);
  const [bpLogged, setBpLogged] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  // Today's readings from the last /api/today answer, so the next answer can replace them (lib/healthReadings.ts).
  const serverMetrics = useRef<HealthMetric[]>([]);
  const [latestDecision, setLatestDecision] = useState<AgentDecision | null>(null);
  const [world, setWorld] = useState<World>("garden");
  const [accessory, setAccessory] = useState<Accessory>("none");
  const [toast, setToast] = useState("");
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [careSummary, setCareSummary] = useState<CaretakerSummaryResponse | null>(null);
  const [walkStartedAt, setWalkStartedAt] = useState<string | null>(null);
  // Walk goal (Settings, this phone): minutes a walk needs for the walk heart. Simulate walk runs from the demo card.
  const [walkGoal, setWalkGoal] = useWalkGoal();
  const [simulateWalkRequested, setSimulateWalkRequested] = useState(false);
  const handleSimulateStarted = useCallback(() => setSimulateWalkRequested(false), []);
  const [dizzy, setDizzy] = useState(false);
  // One friendly notice per outage; the technical error goes to the console, never to the senior.
  const apiWarned = useRef(false);
  // Agent demo clock (Settings > "Current Time of Demo"): reads and writes happen at this instant. null = real time.
  // It runs forward from when it was set (lib/demoClock.ts), so it can reach a dose time and fire the reminder.
  const [demoClock, setDemoClock] = useState<DemoClockAnchor | null>(() => { const at = initialAgentClock(); return at ? { at, setAtMs: Date.now() } : null; });
  /** The demo clock's time right now, or null for real time. */
  const demoNow = (): string | null => runningClock(demoClock);
  /** The app's clock as an ISO string: the running demo clock, or real time (walk start/finish, the walk timer). */
  const clockNow = (): string => demoNow() ?? new Date().toISOString();
  const setDemoNow = (at: string | null) => { setDemoClock(at ? { at, setAtMs: Date.now() } : null); void api.setDemoClock({ at }).catch((error) => reportApiProblem(error)); };
  // Scene time (`?time=`, Settings > Demo time buttons): day/night look only. Hearts, mood and doses stay on the one
  // real state; switching morning ↔ evening must never re-read /api/today at another time.
  const [sceneTime, setSceneTime] = useState<string | null>(initialSceneTime);
  // True once /api/today has answered or failed: the dose-time reminder starts then.
  const [dosesLoaded, setDosesLoaded] = useState(false);
  const [demoClockValue, setDemoClockValue] = useState(() => toDateTimeLocal(new Date(demoNow() ?? Date.now())));
  const [agentBusy, setAgentBusy] = useState(false);
  // GET /api/medications (days of supply for restock help); null until loaded or while the API is offline.
  const [medications, setMedications] = useState<MedicationDetail[] | null>(null);
  const [savedMedicationId, setSavedMedicationId] = useState<string | undefined>(undefined);
  const [savedMedicationName, setSavedMedicationName] = useState<string>("");
  // Settings > Demo tick boxes ("7 days", "20 hearts", "40 hearts"): unlock as if reached. Not saved.
  const [demoUnlocks, setDemoUnlocks] = useState<ReadonlySet<DemoUnlockKey>>(() => new Set());
  // The Morning / Evening button that set the scene time (null: real time or a ?time= link).
  const [scenePreset, setScenePreset] = useState<DemoTimePreset | null>(null);
  // Bumped after each "Give Buddy a heart"; DogLayer then plays the joyful clip once on Home (if Buddy is joyful).
  // Buddy's celebrations (lib/celebration.ts, played by DogLayer): a heart earned by a walk or the day's last dose,
  // and a walk that didn't reach the day's goal yet ("Just a little bit more!").
  const [celebrateRequest, setCelebrateRequest] = useState(0);
  const [encourageRequest, setEncourageRequest] = useState(0);
  // Set when a trick card on Milestones is tapped; DogLayer performs the trick once per id.
  const [trickRequest, setTrickRequest] = useState<TrickRequest | null>(null);
  const { bark } = useBark();
  // Full-screen Buddy, both, or the full-screen form: dragging Home's card (config/homeView.ts), kept on this phone.
  const [homeView, setHomeView] = useHomeView();
  // A new dose nudge while the app is open: Buddy barks once (in-app stand-in for a phone notification).
  // The decision already there on first load counts as seen, so opening the app never barks.
  const seenDecisionId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (seenDecisionId.current === undefined) {
      if (today) seenDecisionId.current = today.latestDecision?.id ?? null;
      return;
    }
    if (!latestDecision || latestDecision.id === seenDecisionId.current) return;
    const barkNow = shouldBarkFor(latestDecision, seenDecisionId.current);
    seenDecisionId.current = latestDecision.id;
    if (barkNow) bark();
  }, [today, latestDecision, bark]);

  /** GET /api/today. `now`: undefined = the current demo clock; null = real time; a string = that instant. Returns the answer, or null on failure. */
  const refreshToday = async (now?: string | null): Promise<TodayResponse | null> => {
    try { return await loadToday(now); } finally { setDosesLoaded(true); }
  };
  const loadToday = async (now?: string | null): Promise<TodayResponse | null> => {
    const at = now === undefined ? demoNow() : now;
    try {
      const result = await api.today(at ?? undefined);
      setToday(result); setDoseList(result.doses); setBpLogged(result.bloodPressureLoggedToday); setLatestDecision(result.latestDecision);
      // The Health card's readings: today's from the server, plus any saved on this phone the server doesn't have yet.
      const previousServer = serverMetrics.current;
      serverMetrics.current = result.healthMetrics;
      setHealthMetrics((prev) => mergeHealthMetrics(result.healthMetrics, prev, previousServer));
      apiWarned.current = false;
      return result;
    }
    catch (error) { reportApiProblem(error); return null; }
  };
  useEffect(() => { void refreshToday(); }, []);
  // The demo clock lives on the server (any browser; /care reads it): on load a ?clock= link is written, else the server's clock is adopted (demoClockOnLoad).
  useEffect(() => { const plan = demoClockOnLoad(demoClock?.at ?? null); if (plan.action === "write") { void api.setDemoClock({ at: plan.at }).catch((error) => reportApiProblem(error)); window.history.replaceState(null, "", `${window.location.pathname}${searchWithout(window.location.search, DEMO_CLOCK_PARAM)}${window.location.hash}`); } else void api.demoClock().then((clock) => { if (clock.at) { setDemoClock({ at: clock.at, setAtMs: Date.now() }); setDemoClockValue(toDateTimeLocal(new Date(clock.at))); void refreshToday(clock.at); } }).catch((error) => console.warn("Demo clock: server clock unavailable", error)); }, []);
  useEffect(() => { saveDemoClock(demoClock); }, [demoClock]);
  useEffect(() => {
    if (screen === "summary") void api.caretakerSummary().then(setCareSummary).catch((error) => reportApiProblem(error));
    // On launch (Home's "See all" dot) and each time Reminders opens (a medicine may have been added).
    // Quiet on failure (console only, mock alert stays): the hosted list 500s until migration 005 runs.
    if (screen === "home" || screen === "reminders") void api.listMedications().then((result) => setMedications(result.medications)).catch((error) => console.warn("Restock: medicine list unavailable", error));
  }, [screen]);

  const pendingDose = doseList.find((item) => item.id === pendingDoseId);
  // Today's hearts: the API's, or a Settings "Today" demo tick (then Buddy's mood follows those hearts below).
  // One rule for the hearts shown, also used to tell whether a save gained a heart (lib/heartToast.ts).
  const shownHearts = (data: TodayResponse | null, doses: DerivedDose[], bp: boolean, walked = data?.activities.walk ?? false) =>
    demoTodayHearts(data?.dog.heart ?? localHeartCount(doses, bp, walked), demoUnlocks);
  const heartCount = shownHearts(today, doseList, bpLogged);
  // One number each for the whole phone app: the API's (or mock) value, raised by a Settings demo tick if one is on.
  const heartsTotal = demoHeartsTotal(today?.dog?.heartsTotal ?? mockHeartsTotal, demoUnlocks);
  const streak = demoStreak(today?.dog.streak ?? pet.streak, demoUnlocks);
  // selectDogMood needs the current time: a celebrate keeps the dog joyful only for DEMO_RULES.celebrateJoyfulMinutes.
  const mood = today && !hasDemoTodayHearts(demoUnlocks) ? today.dog.mood : selectDogMood(heartCount, latestDecision, demoNow() ?? new Date().toISOString());
  // T2-10: day/night follows the real clock, or the Settings demo clock when one is set.
  const phase = useDayPhase(sceneTime ?? demoNow());

  // Names come from data unchanged — no .toLowerCase().
  const dogName = today?.dog.name ?? pet.name;
  const caretakerName = careSummary?.caregiver?.name ?? caregiver.caretakerName;
  const livePet = { ...pet, name: dogName, heartCount, streak, careScore: careSummary?.careScore ?? pet.careScore, caringDays: careSummary?.caringDays ?? pet.caringDays };
  // /care pair label: build from data via the care.pairNames pattern, not a hardcoded string.
  // Live API names take priority; otherwise fall back to the mock data.
  const liveCaregiver = careSummary?.caregiver
    ? { ...caregiver, seniorName: careSummary.senior.name, caretakerName: careSummary.caregiver.name, names: t("care.pairNames", { senior: careSummary.senior.name, caretaker: careSummary.caregiver.name }) }
    : { ...caregiver, names: t("care.pairNames", { senior: caregiver.seniorName, caretaker: caregiver.caretakerName }) };
  // Restock help (demo only, lib/restockHelp.ts): the card lives on Reminders; "See all" on Home gets a dot while it waits.
  // Live days of supply when the API answered; the mock alert offline.
  const liveRestockAlerts = medications ? pickRestockAlerts(medications, RESTOCK_SOON_DAYS) : [restockAlert];
  const restock = useRestockHelp(liveRestockAlerts, (error) => reportApiProblem(error, true));
  // "For my next visit" notes (this phone only): Health row, their own screen, and the Weekly Summary.
  const visitNotes = useVisitNotes((error) => reportApiProblem(error, true));
  // Her first blood-pressure reading ever: the server's (today.firstBloodPressure) or, offline, the earliest local one.
  const firstReading = firstReadingOf([...(today?.firstBloodPressure ? [today.firstBloodPressure] : []), ...healthMetrics]);
  // "Share my blood pressure with {{caretaker}}" (Settings; /care follows it in the same browser).
  const [shareBloodPressure, setShareBloodPressure] = useShareBloodPressure((error) => reportApiProblem(error, true));

  const notify = (message: string, ms = 2400) => {
    setToast(message);
    window.setTimeout(() => setToast(""), ms);
  };

  // Dose-time reminder (config/reminders.ts): at each saved dose time, if it isn't taken, Buddy barks once and a toast
  // says it's time. Waits for the first /api/today answer (or its failure) so sample doses never trigger it.
  useDoseReminder(dosesLoaded ? doseList : [], () => demoNow() ?? new Date().toISOString(), (due) => {
    bark();
    notify(t("toast.doseTime", { medicine: due.map((dose) => dose.medicationName).join(", ") }), 6000);
  });

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
  async function handleLogBp(logged: HealthMetric) {
    const recordedAt = demoNow() ?? new Date().toISOString();
    // The local copy carries the same time the API gets, so it matches the server's row (first-reading check).
    const metric = { ...logged, recordedAt };
    setHealthMetrics((prev) => [...prev, metric]);
    const heartsBefore = heartCount;
    let after: TodayResponse | null = today;
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
      after = (await refreshToday()) ?? today;
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
    // Every warning gets the same gentle toast (owner, 18 Oct: one warning for every condition); otherwise the toast
    // says "full" only at max hearts and "gained" only when the shown hearts went up.
    notify(t(bpToastKey(heartChange(heartsBefore, shownHearts(after, doseList, true)), isUrgentDecision(decision)), { name: dogName }));
  }

  /**
   * Walk start/finish from WalkScreen. Start records the start time.
   * Finish posts one walk session (WalkScreen reports a simulated finish only once),
   * uses the decision in the response, then refreshToday() so the dog's mood comes from the server.
   * If the API call fails, a simulated walk falls back to requestDecision() so the dog still reacts offline.
   */
  async function handleWalkState(walking: boolean, simulated?: WalkCompletion) {
    if (walking) {
      setWalkStartedAt(clockNow());
      return;
    }
    if (!walkStartedAt && !simulated) return;
    // Same clock as doses and readings (the running demo clock, or real time), so the walk heart counts right away.
    const finishedAt = clockNow();
    // A simulated walk is saved with its simulated length (ending now), so it can reach the goal.
    const startedAt = simulated ? new Date(Date.parse(finishedAt) - simulated.durationSeconds * 1000).toISOString() : walkStartedAt ?? finishedAt;
    const goalMinutes = walkGoal.minutes;
    setWalkStartedAt(null);
    setDizzy(false);
    const heartsBefore = heartCount;
    let heartsAfter = heartsBefore;
    let refreshed: TodayResponse | null = null;
    const walkHeartBefore = today?.activities.walk ?? false;
    // The day's walk heart after this walk; null = unknown (not saved, or no fresh answer).
    let walkHeartAfter: boolean | null = null;
    try {
      const result = await api.walkSession({
        startedAt,
        finishedAt,
        // Whole meters (the column is an integer; a track stretched to the goal gives fractions).
        distanceMeters: Math.round(simulated?.distanceMeters ?? 0),
        fastStretchOccurred: simulated?.fastStretchOccurred ?? false,
        goalMinutes,
      });
      setLatestDecision(result.decision);
      refreshed = await refreshToday();
      heartsAfter = shownHearts(refreshed ?? today, doseList, bpLogged);
      if (refreshed) walkHeartAfter = refreshed.activities.walk;
      setCareSummary(await api.caretakerSummary());
    } catch (error) {
      reportApiProblem(error, true);
      if (simulated) {
        if (!refreshed) {
          const earnedAlone = walkHeartTimes([{ startedAt, finishedAt, goalMinutes }]).length > 0;
          heartsAfter = shownHearts(today, doseList, bpLogged, earnedAlone);
          walkHeartAfter = walkHeartBefore || earnedAlone;
        }
        const input = buildAgentInputFromState({
          now: finishedAt,
          userId: demoUser.id,
          dogId: demoDog.id,
          dogName,
          heart: heartCount,
          streak: today?.dog.streak ?? pet.streak,
          doses: doseList,
          healthMetrics,
          // Offline the phone only knows this walk, so only it counts toward the day's total.
          walkFinished: walkHeartTimes([{ startedAt, finishedAt, goalMinutes }]).length > 0,
        });
        setLatestDecision(await requestDecision(input));
      }
    }
    // Same rule as a dose (owner, 18 Oct): a toast only when the walk gained a heart.
    const toastKey = activityToastKey(heartChange(heartsBefore, heartsAfter));
    if (toastKey) notify(t(toastKey, { name: dogName }));
    // Buddy: celebrates the walk that earned the day's walk heart; after a shorter one, hearts and "Just a little bit more!".
    if (walkHeartAfter === true && !walkHeartBefore) setCelebrateRequest((n) => n + 1);
    else if (walkHeartAfter === false) setEncourageRequest((n) => n + 1);
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
    const occurredAt = demoNow() ?? new Date().toISOString();
    const doseEvent = { scheduleId: pendingDose.id, scheduledFor: pendingDose.scheduledAt, event: "taken" as const, occurredAt, proofPhotoUrl };
    const heartsBefore = heartCount;
    let heartsAfter = heartsBefore;
    const medicinesBefore = today?.activities.medicines ?? heartActivities(doseList, bpLogged, false).medicines;
    let medicinesAfter = medicinesBefore;
    try {
      const result = await api.doseEvent(doseEvent);
      setToday(result.today);
      setDoseList(result.today.doses);
      heartsAfter = shownHearts(result.today, result.today.doses, result.today.bloodPressureLoggedToday);
      medicinesAfter = result.today.activities.medicines;
    } catch (error) {
      // Background notice (once per outage), not "didn't save": the dose is shown as taken locally.
      reportApiProblem(error);
      const localDoses = doseList.map((d) => (d.id === pendingDose.id ? { ...d, status: "taken" as const, eventAt: occurredAt } : d));
      setDoseList(localDoses);
      heartsAfter = shownHearts(today, localDoses, bpLogged);
      medicinesAfter = heartActivities(localDoses, bpLogged, false).medicines;
      const localEvent: DoseEvent = { id: `local-${pendingDose.id}-${occurredAt}`, ...doseEvent };
      const input = buildAgentInputFromState({
        now: occurredAt,
        userId: demoUser.id,
        dogId: demoDog.id,
        dogName,
        heart: today?.dog.heart ?? localHeartCount(localDoses, bpLogged, today?.activities.walk ?? false),
        streak: today?.dog.streak ?? pet.streak,
        doses: localDoses,
        healthMetrics,
        latestDoseEvent: localEvent,
      });
      setLatestDecision(await requestDecision(input));
    }
    navigate("home");
    // Buddy celebrates the dose that completes the day's medicines (the medicine heart), not every dose.
    if (!medicinesBefore && medicinesAfter) setCelebrateRequest((n) => n + 1);
    // Only when a heart was really gained (owner, 18 Oct); otherwise no toast.
    const toastKey = activityToastKey(heartChange(heartsBefore, heartsAfter));
    if (toastKey) notify(t(toastKey, { name: dogName }));
  }

  const runAgentAtDemoTime = async () => {
    const parsed = new Date(demoClockValue);
    if (!Number.isFinite(parsed.getTime())) return;
    const now = parsed.toISOString();
    setAgentBusy(true);
    setSceneTime(null);
    setDemoNow(now);
    try {
      const current = await api.today(now);
      const result = await api.decide(current.user.id, now);
      setDemoNow(now);
      setDemoClockValue(toDateTimeLocal(parsed));
      await refreshToday(now);
      // Urgent answers (995, see a GP) show on Health; everything else on Home with the toast.
      navigate(isUrgentDecision(result.decision) ? "health" : "home");
      notify(result.decision.wording);
    } catch (error) {
      reportApiProblem(error, true);
    } finally {
      setAgentBusy(false);
    }
  };

  /**
   * Settings > For demo only > Reset to morning: the API deletes today's dose taps, readings and decisions and decides
   * at 9:00 (lib/api.ts resetDemoDay); this phone's demo choices are cleared; the app restarts in place (no page reload,
   * owner 18 Oct) on Settings, with the agent clock at 9:00 from the ?clock= link.
   * If the API is unreachable, the phone side still resets (the toast says the action failed).
   */
  const resetDemoToMorning = async () => {
    const morning = parseDemoTime(DEMO_TIME_PRESETS[DEMO_RESET_PRESET], DEMO_TIME_PRESETS);
    if (!morning) return;
    try { await api.resetDemoDay(demoInstantToday(morning, new Date(), SENIOR_TIMEZONE)); }
    catch (error) { reportApiProblem(error, true); }
    resetDemoStorage();
    window.history.replaceState(null, "", `${window.location.pathname}?${DEMO_CLOCK_PARAM}=${DEMO_RESET_PRESET}`);
    if (onRestart) onRestart("settings"); else window.location.reload();
  };

  /**
   * Settings > Demo quick buttons: jump the scene to a preset time today (senior's timezone), or back to real time (null).
   * Look only: no API call, no agent run, no change to hearts, mood or doses.
   */
  const setDemoTime = (preset: DemoTimePreset | null) => {
    const time = preset ? parseDemoTime(DEMO_TIME_PRESETS[preset], DEMO_TIME_PRESETS) : null;
    setSceneTime(time ? demoInstantToday(time, new Date(), SENIOR_TIMEZONE) : null);
    setScenePreset(time ? preset : null);
    navigate("home");
  };

  return (
    <>
    <DesktopBackdrop phase={phase} />
    <main className={`app-shell world-${world} ${screen === "home" ? `home-view-${homeView}` : ""}`}>
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
        encourageRequest={encourageRequest}
        trickRequest={trickRequest}
        heartCount={heartCount}
        streak={streak}
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
            view={homeView}
            onView={setHomeView}
          />
        )}
        {screen === "reminders" && (
          <RemindersScreen
            back={back}
            doses={doseList}
            now={demoNow() ?? new Date().toISOString()}
            restockCard={restock.cards.length ? <>{restock.cards.map((card) => <RestockCard key={card.alert.medicationId} alert={card.alert} caretakerName={caretakerName} state={card.state} busy={card.busy} onAsk={() => void restock.askForHelp(card.alert)} onSelf={() => restock.getItMyself(card.alert)} />)}</> : null}
          />
        )}
        {screen === "prescription" && <PrescriptionScreen back={back} onSaved={handleMedicationSaved} onExplain={handleExplainMedicine} petName={dogName} />}
        {screen === "explanation" && <ExplanationScreen back={back} onContinue={() => navigate("schedule")} medicineName={savedMedicationName} />}
        {screen === "schedule" && <ScheduleScreen back={back} onConfirm={handleScheduleConfirmed} petName={dogName} medicationId={savedMedicationId} />}
        {screen === "reference" && <ReferenceScreen back={back} onDone={handleReferenceDone} onSkip={handleReferenceDone} petName={dogName} medicationId={savedMedicationId} />}
        {screen === "proof" && <ProofScreen back={back} onVerified={handleDoseVerified} petName={dogName} medicationName={pendingDose?.medicationName} medicationId={pendingDose?.medicationId} takenCount={countAfterTaking(doseList, pendingDoseId ?? "")} />}
        {screen === "walk" && <WalkScreen back={back} goalMinutes={walkGoal.minutes} simulateRequested={simulateWalkRequested} onSimulateStarted={handleSimulateStarted} petName={dogName} walkStartedAt={walkStartedAt} clockNow={clockNow} onDizzyChange={setDizzy} onWalkState={(walking, simulated) => void handleWalkState(walking, simulated)} />}
        {screen === "milestones" && <MilestonesScreen back={back} onWalk={() => navigate("walk")} onCustomize={() => navigate("customize")} pet={livePet} petName={dogName} heartsTotal={heartsTotal} mood={mood} decision={routineDecision(latestDecision)} onTrick={(performance) => setTrickRequest((prev) => ({ id: (prev?.id ?? 0) + 1, performance }))} />}
        {screen === "health" && <HealthScreen back={back} bpLogged={bpLogged} healthMetrics={healthMetrics} latestDecision={latestDecision} onLogBp={handleLogBp} onScreening={() => navigate("screening")} onSummary={() => navigate("summary")} visitNoteLatest={visitNotes.latest?.text ?? null} onVisitNotes={() => navigate("visitNotes")} firstReading={firstReading} bloodPressureReading={bloodPressureReading} screeningInfo={screeningInfo} activityLink={activityLink} clinicTasks={clinicTasks} weekSummary={weekSummary} petName={dogName} />}
        {screen === "screening" && <ScreeningScreen back={back} screeningInfo={screeningInfo} petName={dogName} />}
        {screen === "summary" && <WeeklySummaryScreen back={back} weekSummary={{ ...(careSummary ? { ...weekSummary, caringDays: careSummary.caringDays, metrics: [{ ...weekSummary.metrics[0], value: `${careSummary.dosesTaken}/${careSummary.dosesDue}` }, { ...weekSummary.metrics[1], value: `${careSummary.walkCount}` }] } : weekSummary), doctorQuestion: visitNotes.latest?.text ?? t("visitNotes.empty") }} onVisitNotes={() => navigate("visitNotes")} warning={isUrgentDecision(latestDecision) ? latestDecision : null} />}
        {screen === "settings" && <SettingsScreen back={back} openMedicines={() => navigate("medicines")} addMedication={() => navigate("prescription")} openReminders={() => navigate("reminders")} caregiver={liveCaregiver} petName={dogName} demoClockValue={demoClockValue} onDemoClockChange={setDemoClockValue} onRunDemoClock={runAgentAtDemoTime} agentBusy={agentBusy} demoUnlocks={demoUnlocks} onToggleDemoUnlock={(key) => setDemoUnlocks((current) => toggleDemoTick(current, key))} activeTimePreset={scenePreset} onDemoTime={setDemoTime} onResetDemo={resetDemoToMorning} shareBloodPressure={shareBloodPressure} onShareBloodPressure={setShareBloodPressure} firstReading={firstReading} walkGoalKey={walkGoal.key} onWalkGoal={setWalkGoal} onSimulateWalk={() => { setSimulateWalkRequested(true); navigate("walk"); }} />}
        {screen === "medicines" && <MedicinesScreen back={back} petName={dogName} caretakerName={caretakerName} onMedicinesChanged={() => void refreshToday()} />}
        {screen === "visitNotes" && <VisitNotesScreen back={back} notes={visitNotes.notes} caretakerName={caretakerName} maxLength={visitNotes.maxLength} onAdd={visitNotes.add} onEdit={visitNotes.edit} onRemove={visitNotes.remove} />}
        {screen === "customize" && <CustomizeScreen back={back} onHome={goHome} world={world} setWorld={(nextWorld) => { setWorld(nextWorld); notify(t(`toast.worlds.${nextWorld}`, { name: dogName })); }} accessory={accessory} setAccessory={(nextAccessory) => { setAccessory(nextAccessory); notify(nextAccessory === "none" ? t("toast.accessoryNone", { name: dogName }) : t("toast.accessoryOn", { name: dogName, item: t(`accessory.${nextAccessory}`) })); }} worldOptions={worldOptions} accessoryOptions={accessoryOptions} petName={dogName} caretakerName={caretakerName} heartsTotal={heartsTotal} notify={notify} />}
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
