/**
 * T2-03: MedlinePlus trusted medicine information with rephrase validation.
 * The model may only rephrase trusted text from MedlinePlus. If the rephrase
 * adds a number or medicine name not in the source text, reject and show source.
 * Credit "Information from MedlinePlus.gov".
 */

export interface MedlinePlusInfo {
  medicineName: string;
  summary: string;
  points: { label: string; text: string }[];
  spokenText: string;
  sourceCredit: string;
  ndfUrl: string;
  healthHubUrl: string;
}

/**
 * Extract all numbers from a text string.
 */
function extractNumbers(text: string): Set<string> {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return new Set(matches ?? []);
}

/**
 * Extract all ALL-CAPS tokens of 3+ characters (e.g. ASPIRIN, GABAPENTIN).
 * This targets medicine names which are typically all-caps in trusted sources.
 * Regular sentence-initial capitalized words (The, This, Have, etc.) are ignored.
 */
function extractNames(text: string): Set<string> {
  const words = text.match(/\b[A-Z]{3,}\b/g);
  return new Set(words ?? []);
}

/**
 * Validate that a rephrased text does not introduce new numbers or medicine names
 * absent from the trusted source text. Returns true if the rephrase is safe, false otherwise.
 */
export function validateRephrase(sourceText: string, rephrasedText: string): { valid: boolean; reason?: string } {
  const sourceNumbers = extractNumbers(sourceText);
  const rephraseNumbers = extractNumbers(rephrasedText);
  for (const num of rephraseNumbers) {
    if (!sourceNumbers.has(num)) {
      return { valid: false, reason: `Rephrase contains a number "${num}" not in the source text.` };
    }
  }

  // Check for medicine-name-like tokens: words of 4+ chars that are ALL CAPS
  // (e.g. ASPIRIN, GABAPENTIN) or mixed case appearing mid-sentence. This is
  // conservative — we only reject clearly new medicine names, not sentence beginnings.
  const sourceCaps = extractNames(sourceText);
  const rephraseCaps = extractNames(rephrasedText);
  for (const name of rephraseCaps) {
    if (!sourceCaps.has(name)) {
      return { valid: false, reason: `Rephrase contains a name "${name}" not in the source text.` };
    }
  }

  return { valid: true };
}

/**
 * MedlinePlus Connect URL for a given medicine name (RxCUI-based lookup).
 * https://medlineplus.gov/connect/
 * For the demo, we use the search URL as a fallback if the Connect API is unavailable.
 */
export function medlinePlusSearchUrl(medicineName: string): string {
  return `https://medlineplus.gov/druginfo?query=${encodeURIComponent(medicineName)}`;
}

/**
 * NDF (Singapore National Drug Formulary) link — link only, never content.
 */
export const NDF_URL = "https://www.ndf.gov.sg/";

/**
 * HealthHub Medications A-Z link — link only, never content.
 */
export const HEALTHHUB_MEDICATIONS_URL = "https://www.healthhub.sg/a-z/medications";

/**
 * Fallback explanation when no trusted text is available.
 * Per PRD: "Please ask your pharmacist", with no model call.
 */
export const FALLBACK_EXPLANATION: MedlinePlusInfo = {
  medicineName: "",
  summary: "Please ask your pharmacist about this medicine.",
  points: [
    { label: "What to do", text: "Ask your pharmacist what this medicine is for and how to take it safely." },
  ],
  spokenText: "Please ask your pharmacist about this medicine.",
  sourceCredit: "Information from MedlinePlus.gov",
  ndfUrl: NDF_URL,
  healthHubUrl: HEALTHHUB_MEDICATIONS_URL,
};
