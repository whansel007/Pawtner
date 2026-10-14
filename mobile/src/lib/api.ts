import type { CaretakerSummaryResponse, DoseEventResponse, HealthMetricResponse, TodayResponse, WalkSessionResponse } from "../../../shared/contract";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
  return payload as T;
}
export const api = {
  today: () => request<TodayResponse>("/today"),
  caretakerSummary: () => request<CaretakerSummaryResponse>("/caretaker/summary"),
  doseEvent: (data: { scheduleId: string; scheduledFor: string; event: "taken"; occurredAt: string }) => request<DoseEventResponse>("/dose-event", { method: "POST", body: JSON.stringify(data) }),
  healthMetric: (data: { systolic: number; diastolic: number; note?: string | null; recordedAt: string }) => request<HealthMetricResponse>("/health-metric", { method: "POST", body: JSON.stringify(data) }),
  walkSession: (data: { startedAt: string; finishedAt: string; distanceMeters: number; fastStretchOccurred: boolean }) => request<WalkSessionResponse>("/walk-session", { method: "POST", body: JSON.stringify(data) }),
};
