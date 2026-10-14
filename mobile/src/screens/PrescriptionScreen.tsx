import { useState } from "react";
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

type Stage = "search" | "results" | "confirm" | "done";

export function PrescriptionScreen({
  back,
  onHome,
  onExplain,
  onSaved,
  petName,
}: {
  back: BackAction;
  /** "Home" action on the saved state (a finish action, not the back button). */
  onHome: () => void;
  onExplain?: (medicineName: string) => void;
  onSaved?: (medicationId?: string) => void;
  petName: string;
}) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("search");
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
      setStage("done");
      onSaved?.(res.medication.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FullCard back={back} className="scan-card">
      <p className="eyebrow green">{t("prescription.eyebrow")}</p>
      <h2>{stage === "done" ? "Medicine added" : stage === "confirm" ? "Confirm details" : t("prescription.titleScan")}</h2>
      <p className="supporting">
        {stage === "done"
          ? `${name} is on ${petName}'s schedule.`
          : stage === "confirm"
          ? t("prescription.supportingFound", { name: petName })
          : t("prescription.supportingScan")}
      </p>

      {stage === "search" && (
        <>
          <div className="search-bar">
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
          <button className="text-button" onClick={startManual}>{t("prescription.enterManual")}</button>
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
          {!showManual && (
            <button className="text-button" onClick={() => setStage("results")}>Back to results</button>
          )}
        </div>
      )}

      {stage === "done" && (
        <div className="prescription-result">
          <span className="feature-icon sage"><Icon name="check" /></span>
          <div className="field"><small>{t("prescription.medication")}</small><strong>{name}</strong></div>
          {strength && <div className="field"><small>{t("prescription.dosage")}</small><strong>{strength}</strong></div>}
          {prescribedFor && <div className="field"><small>Your doctor said it's for</small><strong>{prescribedFor}</strong></div>}
          <button className="primary-button" onClick={() => onExplain?.(name)}>Explain this medicine</button>
          <button className="text-button" onClick={onHome}>{t("common.home")}</button>
        </div>
      )}
    </FullCard>
  );
}
