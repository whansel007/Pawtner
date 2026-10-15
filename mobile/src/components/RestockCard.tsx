import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";
import type { RestockAlert } from "../types";
import type { RestockCardState } from "../lib/useRestockHelp";
import "./RestockCard.css";

/**
 * Compact "Restock soon" card for the senior (medicine name shown here only, never on /care).
 * Presentational: state and actions come from useRestockHelp.
 */
export function RestockCard({
  alert,
  caretakerName,
  state,
  busy,
  onAsk,
  onSelf,
}: {
  alert: RestockAlert;
  caretakerName: string;
  state: RestockCardState;
  busy: boolean;
  onAsk: () => void;
  onSelf: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="restock-card" aria-label={t("restock.label")}>
      <div className="restock-card__head">
        <span className="feature-icon"><Icon name="pill" /></span>
        <div>
          <small>{t("restock.label")}</small>
          <h3>{alert.name}</h3>
          <p>{t("restock.daysRemaining", { count: alert.daysRemaining })}</p>
        </div>
      </div>
      {state === "offer" && (
        <div className="restock-card__actions">
          <button type="button" className="restock-card__primary" onClick={onAsk} disabled={busy}>{t("restock.askHelp", { caretaker: caretakerName })}</button>
          <button type="button" className="restock-card__secondary" onClick={onSelf}>{t("restock.getItMyself")}</button>
        </div>
      )}
      {state === "asked" && <p className="restock-card__status" role="status">{t("restock.asked", { caretaker: caretakerName })}</p>}
      {state === "handled" && <p className="restock-card__status" role="status">{t("restock.handled", { caretaker: caretakerName })}</p>}
      {state === "self" && <p className="restock-card__status" role="status">{t("restock.self")}</p>}
    </section>
  );
}
