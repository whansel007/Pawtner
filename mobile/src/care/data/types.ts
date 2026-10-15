import type { CaretakerSummaryResponse, EscalationSettingsResponse, TodayResponse } from "../../../../shared/contract.js";

/** Everything the caretaker pages read, straight from the existing API responses. */
export interface CareData {
  today: TodayResponse;
  summary: CaretakerSummaryResponse;
  escalation: EscalationSettingsResponse;
}

export type CaretakerSlot = "checkIns" | "updatesOnly";
export type PersonaSlot = "senior" | CaretakerSlot;

export interface Caretaker {
  slot: CaretakerSlot;
  id: string;
  name: string;
  receivesCheckIns: boolean;
  /** True while this person comes from front-end mock data instead of the API. */
  isMockSlot: boolean;
}

export interface SeniorPersona {
  slot: "senior";
  id: string;
  name: string;
}

export type Persona = SeniorPersona | Caretaker;

export type CaringMoment = CaretakerSummaryResponse["caringMoments"][number];
export type DoctorQuestion = CaretakerSummaryResponse["doctorQuestions"][number];
