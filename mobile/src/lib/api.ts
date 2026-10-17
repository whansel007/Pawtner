import type {
  AgentDecision,
  CaretakerSummaryResponse,
  CreateMedicationRequest,
  UpdateMedicationRequest,
  CreateScheduleRequest,
  DoseEventResponse,
  EscalationSettingsRequest,
  EscalationSettingsResponse,
  HealthMetricResponse,
  MedicationListResponse,
  MedicineExplanationResponse,
  MilestonesResponse,
  PillReferenceImageResponse,
  PillReferenceResponse,
  PillVerifyResponse,
  SouvenirResponse,
  TodayResponse,
  TreatResponse,
  WalkSessionResponse,
} from "../../../shared/contract";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}/api${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const payload = await response.json();
  if (!response.ok) throw new ApiRequestError(payload.error ?? `Request failed (${response.status})`, response.status);
  return payload as T;
}

export const api = {
  // T1 endpoints
  today: (now?: string) => request<TodayResponse>(`/today${now ? `?now=${encodeURIComponent(now)}` : ""}`),
  decide: (userId: string, now: string) => request<{ decision: AgentDecision }>("/agent/decide", { method: "POST", body: JSON.stringify({ userId, now }) }),
  /** Demo only: deletes today's dose taps, readings and decisions (from the start of `now`'s day), then decides at `now`. */
  resetDemoDay: (now: string) => request<TodayResponse>("/demo/reset-day", { method: "POST", body: JSON.stringify({ now }) }),
  caretakerSummary: (now?: string) => request<CaretakerSummaryResponse>(`/caretaker/summary${now ? `?now=${encodeURIComponent(now)}` : ""}`),
  escalationSettings: () => request<EscalationSettingsResponse>("/escalation-settings"),
  updateEscalationSettings: (data: EscalationSettingsRequest) => request<EscalationSettingsResponse>("/escalation-settings", { method: "PUT", body: JSON.stringify(data) }),
  doseEvent: (data: { scheduleId: string; scheduledFor: string; event: "taken"; occurredAt: string; proofPhotoUrl?: string | null }) => request<DoseEventResponse>("/dose-event", { method: "POST", body: JSON.stringify(data) }),
  healthMetric: (data: { systolic: number; diastolic: number; note?: string | null; recordedAt: string }) => request<HealthMetricResponse>("/health-metric", { method: "POST", body: JSON.stringify(data) }),
  walkSession: (data: { startedAt: string; finishedAt: string; distanceMeters: number; fastStretchOccurred: boolean }) => request<WalkSessionResponse>("/walk-session", { method: "POST", body: JSON.stringify(data) }),

  // T2-01: HSA product search
  searchProducts: (q: string) => request<{ query: string; products: { id: string; brandName: string; genericName: string | null; strength: string | null; dosageForm: string | null; routeOfAdministration: string | null; forensicClassification: string | null; activeIngredients: string | null; sourceAttribution: string }[] }>(`/products/search?q=${encodeURIComponent(q)}`),

  // T2-02/T2-06: Medication CRUD
  listMedications: () => request<MedicationListResponse>("/medications"),
  createMedication: (data: CreateMedicationRequest) => request<{ medication: MedicationListResponse["medications"][number] }>("/medications", { method: "POST", body: JSON.stringify(data) }),
  updateMedication: (id: string, data: UpdateMedicationRequest) => request<{ medication: MedicationListResponse["medications"][number] }>(`/medications/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  createSchedule: (data: CreateScheduleRequest) => request<{ schedule: { id: string; medicationId: string; scheduledTime: string; startsOn: string; endsOn: string | null } }>("/schedules", { method: "POST", body: JSON.stringify(data) }),

  // T2-03: Medicine explanation
  medicineExplanation: (name: string) => request<MedicineExplanationResponse>(`/medicine-explanation?name=${encodeURIComponent(name)}`),

  // T2-09: Souvenirs
  souvenirs: () => request<SouvenirResponse>("/souvenirs"),

  // T2-11: Caretaker treats
  latestTreat: () => request<TreatResponse | null>("/treats/latest"),
  sendTreat: (message?: string) => request<TreatResponse>("/treats", { method: "POST", body: JSON.stringify({ message }) }),
  markTreatSeen: (id: string) => request<{ ok: boolean }>(`/treats/${id}/seen`, { method: "POST" }),

  // T2-12: Milestones
  milestones: () => request<MilestonesResponse>("/milestones"),

  // T2-08: Pill photo recognition (demo only)
  // Set the SETTINGS-defined original/reference pill photo for a medicine.
  setPillReference: (medicationId: string, imageBase64: string, mimeType: string) =>
    request<PillReferenceResponse>("/pill-reference", { method: "POST", body: JSON.stringify({ medicationId, imageBase64, mimeType }) }),
  // Compare a check-in photo against the medicine's reference picture.
  // Read the saved original pill photo back (My medicines).
  getPillReference: (medicationId: string) => request<PillReferenceImageResponse>(`/pill-reference?medicationId=${encodeURIComponent(medicationId)}`),
  verifyPill: (medicationId: string, imageBase64: string, mimeType: string) =>
    request<PillVerifyResponse>("/pill-verify", { method: "POST", body: JSON.stringify({ medicationId, imageBase64, mimeType }) }),
  // Warms the vision model in the background; safe to ignore failures.
  warmupPill: () => request<{ ok: boolean; warmed: boolean }>("/pill-warmup", { method: "POST", body: "{}" }),
};
