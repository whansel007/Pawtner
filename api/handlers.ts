import { ApiError, PawtnerRepository } from "./repository.js";
import type { AgentDecideRequest, DoseEventRequest, EscalationSettingsRequest, HealthMetricRequest, WalkSessionRequest } from "../shared/contract.js";

const json = (body: unknown, status = 200) => Response.json(body, { status });
async function body<T>(request: Request): Promise<T> {
  try { return await request.json() as T; } catch { throw new ApiError(400, "Request body must be valid JSON."); }
}
function validDate(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function requiredString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }

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
      if (request.method === "POST" && url.pathname === "/api/walk-session") {
        const data = await body<WalkSessionRequest>(request);
        if (!validDate(data.startedAt) || !validDate(data.finishedAt) || !Number.isFinite(data.distanceMeters) || data.distanceMeters < 0 || typeof data.fastStretchOccurred !== "boolean") throw new ApiError(400, "Invalid walk session.");
        if (Date.parse(data.finishedAt) < Date.parse(data.startedAt)) throw new ApiError(400, "Walk finish must be after its start.");
        return json(await repository.recordWalkSession(data), 201);
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
