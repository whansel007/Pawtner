import { ApiError, PawtnerRepository } from "./repository.js";
import { BP_LOG_DAYS } from "../shared/config.js";
import { isCalendarDate } from "../shared/nextVisit.js";
import type { AgentDecideRequest, CreateMedicationRequest, DemoResetDayRequest, CreateScheduleRequest, DoseEventRequest, EscalationSettingsRequest, HealthMetricRequest, PillReferenceRequest, PillVerifyRequest, UpdateMedicationRequest, WalkSessionRequest, CreateRestockRequest, SharedNoteRequest, SharingSettings, DemoClockState, NextVisitState } from "../shared/contract.js";

const json = (body: unknown, status = 200) => Response.json(body, { status });
async function body<T>(request: Request): Promise<T> {
  try { return await request.json() as T; } catch { throw new ApiError(400, "Request body must be valid JSON."); }
}
function validDate(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function requiredString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
/** An item id in a path (uuid or the phone's note id): letters, digits and dashes only. */
function itemId(value: string, label: string): string {
  if (!/^[A-Za-z0-9-]{1,100}$/.test(value)) throw new ApiError(400, `${label} id is invalid.`);
  return value;
}

export function createApiHandler(repository: PawtnerRepository) {
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      const now = url.searchParams.get("now") ?? new Date().toISOString();
      if (!validDate(now)) throw new ApiError(400, "now must be an ISO date.");
      if (request.method === "GET" && url.pathname === "/api/products/search") {
        const query = url.searchParams.get("q") ?? "";
        if (query.length > 120) throw new ApiError(400, "q must be at most 120 characters.");
        return json(await repository.searchRegisteredProducts(query));
      }
      if (request.method === "GET" && url.pathname === "/api/today") return json(await repository.getToday(now));
      if (request.method === "GET" && url.pathname === "/api/health-metrics") {
        const days = Number(url.searchParams.get("days") ?? BP_LOG_DAYS);
        if (!Number.isInteger(days) || days < 1 || days > 366) throw new ApiError(400, "days must be a whole number from 1 to 366.");
        return json(await repository.listHealthMetrics(days, now));
      }
      if (request.method === "GET" && url.pathname === "/api/caretaker/summary") return json(await repository.getCaretakerSummary(now));
      if (request.method === "GET" && url.pathname === "/api/escalation-settings") return json(await repository.getEscalationSettings());
      if (request.method === "PUT" && url.pathname === "/api/escalation-settings") {
        const data = await body<EscalationSettingsRequest>(request);
        if (typeof data.optedIn !== "boolean" || !Number.isInteger(data.threshold)) throw new ApiError(400, "optedIn and an integer threshold are required.");
        return json(await repository.updateEscalationSettings(data));
      }
      if (request.method === "POST" && url.pathname === "/api/dose-event") {
        const data = await body<DoseEventRequest>(request);
        if (!requiredString(data.scheduleId) || !validDate(data.scheduledFor) || !validDate(data.occurredAt) || !["taken", "skipped"].includes(data.event)) throw new ApiError(400, "Invalid dose event.");
        return json(await repository.recordDoseEvent(data), 201);
      }
      if (request.method === "POST" && url.pathname === "/api/health-metric") {
        const data = await body<HealthMetricRequest>(request);
        if (!Number.isInteger(data.systolic) || !Number.isInteger(data.diastolic) || data.systolic <= 0 || data.diastolic <= 0 || !validDate(data.recordedAt)) throw new ApiError(400, "Invalid blood pressure reading.");
        return json(await repository.recordHealthMetric(data), 201);
      }
      if (request.method === "POST" && url.pathname === "/api/agent/decide") {
        const data = await body<AgentDecideRequest>(request);
        if (!requiredString(data.userId) || !validDate(data.now)) throw new ApiError(400, "userId and ISO now are required.");
        return json({ decision: await repository.decideNow(data.userId, data.now) });
      }
      if (request.method === "POST" && url.pathname === "/api/demo/reset-day") {
        const data = await body<DemoResetDayRequest>(request);
        if (!validDate(data.now)) throw new ApiError(400, "ISO now is required.");
        return json(await repository.resetDemoDay(data.now));
      }
      if (request.method === "POST" && url.pathname === "/api/walk-session") {
        const data = await body<WalkSessionRequest>(request);
        if (!validDate(data.startedAt) || !validDate(data.finishedAt) || !Number.isFinite(data.distanceMeters) || data.distanceMeters < 0 || typeof data.fastStretchOccurred !== "boolean") throw new ApiError(400, "Invalid walk session.");
        if (Date.parse(data.finishedAt) < Date.parse(data.startedAt)) throw new ApiError(400, "Walk finish must be after its start.");
        if (data.goalMinutes !== undefined && data.goalMinutes !== null && !(Number.isInteger(data.goalMinutes) && data.goalMinutes >= 1 && data.goalMinutes <= 600)) {
          throw new ApiError(400, "goalMinutes must be a whole number from 1 to 600.");
        }
        return json(await repository.recordWalkSession(data), 201);
      }
      // ── /care from any browser (migration 008) ──
      if (request.method === "GET" && url.pathname === "/api/restock-requests") return json(await repository.listRestockRequests(now));
      if (request.method === "POST" && url.pathname === "/api/restock-requests") {
        const data = await body<CreateRestockRequest>(request);
        if (!requiredString(data.medicationId) || !Number.isInteger(data.daysLeft) || data.daysLeft < 0 || !validDate(data.requestedAt)) {
          throw new ApiError(400, "medicationId, a whole number daysLeft (0 or more) and an ISO requestedAt are required.");
        }
        return json(await repository.createRestockRequest(data), 201);
      }
      const handledMatch = request.method === "POST" ? url.pathname.match(/^\/api\/restock-requests\/([^/]+)\/handled$/) : null;
      if (handledMatch) return json(await repository.markRestockRequestHandled(itemId(handledMatch[1]!, "Refill request")));
      if (url.pathname.startsWith("/api/shared-notes/") && (request.method === "PUT" || request.method === "DELETE")) {
        const id = itemId(url.pathname.slice("/api/shared-notes/".length), "Note");
        if (request.method === "DELETE") return json(await repository.deleteSharedNote(id));
        const data = await body<SharedNoteRequest>(request);
        if (typeof data.text !== "string" || !validDate(data.updatedAt)) throw new ApiError(400, "text and an ISO updatedAt are required.");
        return json(await repository.upsertSharedNote(id, data));
      }
      if (request.method === "GET" && url.pathname === "/api/next-visit") return json(await repository.getNextVisit());
      if (request.method === "PUT" && url.pathname === "/api/next-visit") {
        const data = await body<NextVisitState>(request);
        if (data.date !== null && !isCalendarDate(data.date)) throw new ApiError(400, "date must be a YYYY-MM-DD calendar date or null.");
        return json(await repository.setNextVisit(data.date, now));
      }
      if (request.method === "GET" && url.pathname === "/api/sharing") return json(await repository.getSharing());
      if (request.method === "PUT" && url.pathname === "/api/sharing") {
        const data = await body<SharingSettings>(request);
        if (typeof data.shareBloodPressure !== "boolean") throw new ApiError(400, "shareBloodPressure must be true or false.");
        return json(await repository.updateSharing(data));
      }
      if (request.method === "GET" && url.pathname === "/api/demo-clock") return json(await repository.getDemoClock());
      if (request.method === "PUT" && url.pathname === "/api/demo-clock") {
        const data = await body<DemoClockState>(request);
        if (data.at !== null && !validDate(data.at)) throw new ApiError(400, "at must be an ISO date or null.");
        return json(await repository.setDemoClock({ at: data.at }));
      }
      // ── T2-02/T2-06: Medication CRUD ──
      if (request.method === "GET" && url.pathname === "/api/medications") return json(await repository.listMedications());
      if (request.method === "POST" && url.pathname === "/api/medications") {
        const data = await body<CreateMedicationRequest>(request);
        if (!requiredString(data.name)) throw new ApiError(400, "name is required.");
        return json(await repository.createMedication(data), 201);
      }
      if (request.method === "PUT" && url.pathname.startsWith("/api/medications/")) {
        const medicationId = url.pathname.slice("/api/medications/".length);
        if (!requiredString(medicationId)) throw new ApiError(400, "Medication id is required.");
        const data = await body<UpdateMedicationRequest>(request);
        if ("active" in data && typeof data.active !== "boolean") throw new ApiError(400, "active must be true or false.");
        return json(await repository.updateMedication(medicationId, data));
      }
      // ── T2-06: Schedule creation ──
      if (request.method === "POST" && url.pathname === "/api/schedules") {
        const data = await body<CreateScheduleRequest>(request);
        if (!requiredString(data.medicationId) || !requiredString(data.scheduledTime) || !requiredString(data.startsOn)) throw new ApiError(400, "medicationId, scheduledTime and startsOn are required.");
        return json(await repository.createSchedule(data), 201);
      }
      // ── T2-03: Medicine explanation ──
      if (request.method === "GET" && url.pathname === "/api/medicine-explanation") {
        const name = url.searchParams.get("name") ?? "";
        if (!requiredString(name)) throw new ApiError(400, "name query parameter is required.");
        return json(await repository.getMedicineExplanation(name));
      }
      // ── T2-09: Souvenirs ──
      if (request.method === "GET" && url.pathname === "/api/souvenirs") return json(await repository.getSouvenirs());
      // ── T2-11: Caretaker treats ──
      if (request.method === "GET" && url.pathname === "/api/treats/latest") return json(await repository.getLatestTreat());
      if (request.method === "POST" && url.pathname === "/api/treats") {
        const data = await body<{ message?: string }>(request).catch(() => ({}) as { message?: string });
        return json(await repository.sendTreat(data.message), 201);
      }
      if (request.method === "POST" && url.pathname.startsWith("/api/treats/") && url.pathname.endsWith("/seen")) {
        const treatId = url.pathname.slice("/api/treats/".length, -"/seen".length);
        if (!requiredString(treatId)) throw new ApiError(400, "Treat id is required.");
        await repository.markTreatSeen(treatId);
        return json({ ok: true });
      }
      // ── T2-12: Milestones derived from data ──
      if (request.method === "GET" && url.pathname === "/api/milestones") return json(await repository.getMilestones(now));
      // ── T2-08: Pill photo recognition (demo only) ──
      // Set the SETTINGS-defined original picture for a medicine (one-time, in medicine settings).
      // Read the saved original picture back (My medicines shows it).
      if (request.method === "GET" && url.pathname === "/api/pill-reference") {
        const medicationId = url.searchParams.get("medicationId") ?? "";
        if (!requiredString(medicationId)) throw new ApiError(400, "medicationId is required.");
        return json(await repository.getPillReference(medicationId));
      }
      if (request.method === "POST" && url.pathname === "/api/pill-reference") {
        const data = await body<PillReferenceRequest>(request);
        if (!requiredString(data.medicationId) || !requiredString(data.imageBase64) || !requiredString(data.mimeType)) throw new ApiError(400, "medicationId, imageBase64 and mimeType are required.");
        return json(await repository.setPillReference(data), 201);
      }
      // Compare a check-in photo against the medicine's reference picture.
      if (request.method === "POST" && url.pathname === "/api/pill-verify") {
        const data = await body<PillVerifyRequest>(request);
        if (!requiredString(data.medicationId) || !requiredString(data.imageBase64) || !requiredString(data.mimeType)) throw new ApiError(400, "medicationId, imageBase64 and mimeType are required.");
        return json(await repository.verifyPill(data));
      }
      // ── T2-08: Warm the vision model (no DB write) so the first real check is fast. ──
      if (request.method === "POST" && url.pathname === "/api/pill-warmup") {
        const warmed = await repository.warmupPillVision();
        return json({ ok: true, warmed });
      }
      return json({ error: "Route not found." }, 404);
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status);
      if (typeof error === "object" && error !== null && "code" in error && error.code === "42P01") {
        return json({ error: "Database schema is not initialized. Run the migration and fictional seed commands." }, 503);
      }
      console.error("API request failed", error instanceof Error ? error.message : "unknown error");
      return json({ error: "Internal server error." }, 500);
    }
  };
}
