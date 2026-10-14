import { decide } from "../../../shared/rules";
import { buildAgentInput } from "../../../shared/selectors";
import type { AgentDecision, AgentInput, DerivedDose, HealthMetric } from "../../../shared/contract";

/**
 * Request an agent decision for the current app state.
 * Today this calls the shared rules engine directly (mock).
 * TODO(T1-07): POST /agent/decide
 */
export async function requestDecision(input: AgentInput): Promise<AgentDecision> {
  return decide(buildAgentInput(input));
}

/**
 * Build an AgentInput from the app's current state.
 * No names or IDs are hardcoded — they all come from mock data.
 */
export function buildAgentInputFromState(params: {
  now: string;
  userId: string;
  dogId: string;
  dogName: string;
  heart: number;
  streak: number;
  doses: DerivedDose[];
  healthMetrics: HealthMetric[];
  daysOfSupplyByMedicationId?: Record<string, number | null>;
  consecutiveMissedDoses?: number;
}): AgentInput {
  return {
    now: params.now,
    userId: params.userId,
    dog: {
      id: params.dogId,
      name: params.dogName,
      heart: params.heart,
      streak: params.streak,
    },
    doses: params.doses,
    latestDoseEvent: null,
    healthMetrics: params.healthMetrics,
    daysOfSupplyByMedicationId: params.daysOfSupplyByMedicationId ?? {},
    consecutiveMissedDoses: params.consecutiveMissedDoses ?? 0,
    caretaker: null,
  };
}
