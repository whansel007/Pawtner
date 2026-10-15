import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import { api } from "../lib/api";
import type { CreateMedicationRequest } from "../../../shared/contract";

interface HsaProduct {
  id: string;
  brandName: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  routeOfAdministration: string | null;
  activeIngredients: string | null;
}

type Stage = "search" | "results" | "confirm";

/**
 * Extract text from a label photo using the browser's TextDetector (Shape Detection API)
 * where available, with a graceful fallback to the search screen.
 */
async function extractLabelText(file: File): Promise<string | null> {
  // Try the experimental TextDetector API (Chrome on some platforms)
  const TD = (window as unknown as { TextDetector?: new () => { detect: (img: ImageBitmap) => Promise<{ rawValue: string }[]> } }).TextDetector;
  if (!TD) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const detector = new TD();
    const results = await detector.detect(bitmap);
    bitmap.close?.();
    const text = results.map((r) => r.rawValue).join(" ").trim();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Extract the most likely medication name and strength from raw OCR text.
 * Looks for patterns like "Paracetamol 500mg" or "Amlodipine 5 mg".
 */
function parseLabelFields(text: string): { name: string; strength: string | null } {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  // Try to find a line that looks like a medication name + strength
  const medLine = lines.find((line) =>
    /\d+\s*(?:mg|mcg|g|ml|iu)\b/i.test(line) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(line),
  );
  if (medLine) {
    const strengthMatch = medLine.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b)/i);
    const strength = strengthMatch?.[1] ?? null;
    const name = medLine.replace(strengthMatch?.[0] ?? "", "").trim() || medLine;
    return { name: name.replace(/\s+/g, " "), strength };
  }
  // Fallback: use the first non-trivial line as the name
  const firstLine = lines.find((l) => l.length >= 3 && l.length <= 60) ?? lines[0] ?? "";
  const strengthMatch = firstLine.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b)/i);
  return {
    name: (strengthMatch ? firstLine.replace(strengthMatch[0], "") : firstLine).trim() || text.slice(0, 40),
    strength: strengthMatch?.[1] ?? null,
  };
}

export function PrescriptionScreen({
  back,
  onSaved,
  onExplain,
  petName,
}: {
  back: BackAction;
  /** Called after the medication is saved so the parent can continue the flow. */
  onSaved?: (medicationId?: string) => void;
  /** Optional explain path: save and jump to the explanation screen with this medicine's name. */
  onExplain?: (medicineName: string, medicationId?: string) => void;
  petName: string;
}) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("search");
  const [scanning, setScanning] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HsaProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showManual, setShowManual] = useState(false);

  // Confirmable fields
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [activeIngredients, setActiveIngredients] = useState("");
  const [genericName, setGenericName] = useState("");
  const [prescribedFor, setPrescribedFor] = useState("");
  const [daysOfSupply, setDaysOfSupply] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await api.searchProducts(query.trim());
      setResults(res.products);
      setStage("results");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const selectProduct = (p: HsaProduct) => {
    setName(p.brandName);
    setStrength(p.strength ?? "");
    setDosageForm(p.dosageForm ?? "");
    setActiveIngredients(p.activeIngredients ?? "");
    setGenericName(p.genericName ?? "");
    setStage("confirm");
  };

  const startManual = () => {
    setShowManual(true);
    setName("");
    setStrength("");
    setDosageForm("");
    setActiveIngredients("");
    setGenericName("");
    setPrescribedFor("");
    setDaysOfSupply("");
    setStage("confirm");
  };

  const onScanFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setScanning(true);
    setExtractedText(null);
    try {
      const text = await extractLabelText(file);
      if (text && text.trim().length >= 2) {
        const { name: parsedName, strength: parsedStrength } = parseLabelFields(text);
        setExtractedText(text);
        // Auto-search the HSA register with the extracted name
        const searchTerm = parsedName.slice(0, 50);
        setQuery(searchTerm);
        const res = await api.searchProducts(searchTerm);
        setResults(res.products);
        // Pre-fill fields from OCR in case no HSA match is selected
        setName(parsedName);
        setStrength(parsedStrength ?? "");
        setStage("results");
      }
    } catch {
      // Quiet fallback for optional scan — no error shown to the user
      console.warn("Label scan failed");
    } finally {
      setScanning(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError("");
    const payload: CreateMedicationRequest = {
      name: name.trim(),
      strength: strength.trim() || null,
      dosageForm: dosageForm.trim() || null,
      activeIngredients: activeIngredients.trim() || null,
      genericName: genericName.trim() || null,
      prescribedFor: prescribedFor.trim() || null,
      daysOfSupply: daysOfSupply ? Number(daysOfSupply) : null,
    };
    try {
      const res = await api.createMedication(payload);
      setSaving(false);
      onSaved?.(res.medication.id);
    } catch (err) {
      setSaving(false);
      setSaveError(err instanceof Error ? err.message : "Could not save");
    }
  };

  /**
   * Save then jump to the explanation screen instead of schedule.
   * Reuses the createMedication call so the medication id is available
   * when ExplanationScreen's Continue reaches ScheduleScreen.
   */
  const saveAndExplain = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError("");
    const payload: CreateMedicationRequest = {
      name: name.trim(),
      strength: strength.trim() || null,
      dosageForm: dosageForm.trim() || null,
      activeIngredients: activeIngredients.trim() || null,
      genericName: genericName.trim() || null,
      prescribedFor: prescribedFor.trim() || null,
      daysOfSupply: daysOfSupply ? Number(daysOfSupply) : null,
    };
    try {
      const res = await api.createMedication(payload);
      setSaving(false);
      onExplain?.(name.trim(), res.medication.id);
    } catch (err) {
      setSaving(false);
      setSaveError(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <FullCard back={back} className="scan-card">
      <p className="eyebrow green">{t("prescription.eyebrow")}</p>
      <h2>{stage === "confirm" ? "Confirm details" : "Search medicines"}</h2>
      <p className="supporting">
        {stage === "confirm"
          ? t("prescription.supportingFound", { name: petName })
          : "Search the HSA register by medicine name or active ingredient."}
      </p>

      {stage === "search" && (
        <>
          <div className="search-bar stack">
            <input
              type="text"
              placeholder="Search HSA register (e.g. paracetamol)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              aria-label="Search registered medicines"
            />
            <button className="primary-button" disabled={searching || query.trim().length < 2} onClick={runSearch}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
          {searchError && <p className="error-text">{searchError}</p>}
          <button className="secondary-button" style={{ marginTop: 12 }} onClick={startManual}>
            {t("prescription.enterManual")}
          </button>

          {/* Optional label scan — falls back quietly if TextDetector is unavailable */}
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onScanFile}
            style={{ display: "none" }}
          />
          <button className="text-button" onClick={() => scanInputRef.current?.click()}>
            {t("prescription.scanLabel")}
          </button>
          {scanning && <p className="supporting">{t("prescription.readingLabel")}</p>}
          {extractedText && (
            <div className="ocr-preview">
              <small>Text read from label:</small>
              <p>{extractedText.slice(0, 200)}</p>
            </div>
          )}
          <p className="hsa-credit">HSA Listing of Registered Therapeutic Products (Open Data Licence)</p>
        </>
      )}

      {stage === "results" && (
        <>
          <div className="search-bar">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              aria-label="Search registered medicines"
            />
            <button className="primary-button" disabled={searching} onClick={runSearch}>Search</button>
          </div>
          {results.length === 0 ? (
            <div className="no-results">
              <p>No registered products found for "{query}".</p>
              <button className="text-button" onClick={startManual}>Enter details manually</button>
            </div>
          ) : (
            <div className="hsa-results">
              {results.slice(0, 10).map((p) => (
                <button key={p.id} className="hsa-result-row" onClick={() => selectProduct(p)}>
                  <div>
                    <strong>{p.brandName}</strong>
                    <small>
                      {p.strength ?? "Strength not listed"}{p.dosageForm ? ` · ${p.dosageForm}` : ""}
                    </small>
                    {p.activeIngredients && <small>{p.activeIngredients}</small>}
                  </div>
                  <Icon name="chevron" />
                </button>
              ))}
              {results.length > 10 && <p>Showing 10 of {results.length} results.</p>}
            </div>
          )}
          <p className="hsa-credit">A catalog match does not confirm this medicine is correct for you. Always check the package and ask your pharmacist.</p>
        </>
      )}

      {stage === "confirm" && (
        <div className="prescription-result">
          <div className="field">
            <small>{t("prescription.medication")}</small>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-label="Medicine name" />
          </div>
          <div className="field-row">
            <div className="field">
              <small>{t("prescription.dosage")}</small>
              <input type="text" value={strength} onChange={(e) => setStrength(e.target.value)} aria-label="Strength" placeholder="e.g. 50 mg" />
            </div>
            <div className="field">
              <small>Dosage form</small>
              <input type="text" value={dosageForm} onChange={(e) => setDosageForm(e.target.value)} aria-label="Dosage form" placeholder="e.g. Tablet" />
            </div>
          </div>
          <div className="field">
            <small>Active ingredients</small>
            <input type="text" value={activeIngredients} onChange={(e) => setActiveIngredients(e.target.value)} aria-label="Active ingredients" />
          </div>
          <div className="field">
            <small>What did your doctor say it's for?</small>
            <input type="text" value={prescribedFor} onChange={(e) => setPrescribedFor(e.target.value)} aria-label="Prescribed for" placeholder="Your doctor's reason (optional)" />
            <small className="field-hint">This is your words only. Never filled automatically.</small>
          </div>
          <div className="field">
            <small>Days of supply (optional)</small>
            <input type="number" value={daysOfSupply} onChange={(e) => setDaysOfSupply(e.target.value)} aria-label="Days of supply" placeholder="e.g. 30" />
          </div>
          {saveError && <p className="error-text">{saveError}</p>}
          <button className="primary-button" disabled={!name.trim() || saving} onClick={save}>
            {saving ? "Saving…" : "Confirm and save"}
          </button>
          {onExplain && (
            <button className="text-button" disabled={!name.trim() || saving} onClick={saveAndExplain}>
              {t("prescription.explain")}
            </button>
          )}
          {!showManual && (
            <button className="text-button" onClick={() => setStage("results")}>Back to results</button>
          )}
        </div>
      )}
    </FullCard>
  );
}
