/**
 * PROVISIONAL: drafted from PRD.md before the Figma screen exports are available.
 * Confirm every screen field against docs/design/ before treating this contract as final.
 */

export type DoseStatus = "upcoming" | "due" | "taken" | "skipped" | "missed";

export type DogMood = "joyful" | "content" | "sleepy" | "attentive";

export type DecisionKind =
  | "nudge"
  | "celebrate"
  | "restock_reminder"
  | "doctor_question"
  | "see_gp_soon"
  | "emergency_995"
  | "stay_quiet";

export type RefusalKind =
  | "double_dose"
  | "change_medication"
  | "reading_reassurance"
  | "diagnosis"
  | "pill_identification"
  | "interaction_advice";

export interface DoseSchedule {
  id: string;
  medicationId: string;
  medicationName: string;
  strength: string | null;
  scheduledAt: string;
}

export interface DoseEvent {
  id: string;
  scheduleId: string;
  scheduledFor: string;
  event: "taken" | "skipped";
  occurredAt: string;
  proofPhotoUrl?: string | null;
}

export interface DerivedDose extends DoseSchedule {
  status: DoseStatus;
  eventAt: string | null;
  /** Number of nudges already sent for this scheduled dose. */
  nudgeCount: number;
  lastNudgeAt: string | null;
}

export interface HealthMetric {
  id: string;
  kind: "blood_pressure";
  systolic: number;
  diastolic: number;
  note: string | null;
  recordedAt: string;
}

export interface AgentInput {
  now: string;
  userId: string;
  dog: { id: string; name: string; heart: number; streak: number };
  doses: DerivedDose[];
  latestDoseEvent?: DoseEvent | null;
  healthMetrics: HealthMetric[];
  daysOfSupplyByMedicationId: Record<string, number | null>;
  consecutiveMissedDoses: number;
  caretaker: {
    optedIn: boolean;
    threshold: number;
  } | null;
  walkFinished?: boolean;
  streakMilestoneReached?: boolean;
}

export interface AgentDecision {
  id: string;
  decision: DecisionKind;
  ruleId: string;
  mood: DogMood;
  observations: Record<string, string | number | boolean | null>;
  reasoning: string;
  wording: string;
  wordingSource: "template" | "model";
  caretakerPing: boolean;
  refused: boolean;
  refusalKind?: RefusalKind;
  scheduleId?: string;
  scheduledFor?: string;
  createdAt: string;
}

export interface AgentRefusal {
  kind: RefusalKind;
  refused: true;
  message: string;
  decision: AgentDecision;
}

export interface TodayResponse {
  user: { id: string; name: string };
  dog: { id: string; name: string; mood: DogMood; heart: number; streak: number };
  doses: DerivedDose[];
  latestDecision: AgentDecision | null;
}

export interface DoseEventRequest {
  scheduleId: string;
  scheduledFor: string;
  event: "taken" | "skipped";
  occurredAt: string;
  proofPhotoUrl?: string | null;
}

export interface DoseEventResponse {
  event: DoseEvent;
  today: TodayResponse;
  decision: AgentDecision;
}

export interface HealthMetricRequest {
  systolic: number;
  diastolic: number;
  note?: string | null;
  recordedAt: string;
}

export interface HealthMetricResponse {
  metric: HealthMetric;
  decision: AgentDecision;
}

export interface AgentDecideRequest {
  userId: string;
  now: string;
}

export interface AgentDecideResponse {
  decision: AgentDecision;
}

export interface CaretakerSummaryResponse {
  period: { start: string; end: string };
  dosesTaken: number;
  dosesDue: number;
  caringMoments: Array<{ id: string; kind: "celebration" | "check_in"; message: string; occurredAt: string }>;
  doctorQuestions: Array<{ note: string; occurredAt: string }>;
}

export interface EscalationSettingsRequest {
  optedIn: boolean;
  threshold: number;
}

export interface EscalationSettingsResponse {
  optedIn: boolean;
  threshold: number;
}

export interface WalkSessionRequest {
  startedAt: string;
  finishedAt: string;
  distanceMeters: number;
  fastStretchOccurred: boolean;
}

export interface WalkSessionResponse {
  id: string;
  startedAt: string;
  finishedAt: string;
  distanceMeters: number;
  decision: AgentDecision;
  souvenirId: string | null;
}
