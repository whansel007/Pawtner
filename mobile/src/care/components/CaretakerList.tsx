import { useTranslation } from "react-i18next";
import type { Caretaker } from "../data/types";
import { initialOf } from "../lib/rules";

/** Name, initial and "Gets check-ins" / "Updates only". No relationship field (dropped, docs/DECISIONS.md 2026-10-14). */
export function CaretakerList({ caretakers, viewerSlot }: { caretakers: readonly Caretaker[]; viewerSlot: Caretaker["slot"] }) {
  const { t } = useTranslation();
  return (
    <ul className="care-people">
      {caretakers.map((person) => (
        <li className="care-person" key={person.id}>
          <span className={`care-avatar care-avatar--${person.slot}`} aria-hidden="true">{initialOf(person.name)}</span>
          <p className="care-person__name">
            <strong>{person.name}</strong>
            {person.slot === viewerSlot && <span className="care-person__you">{t("care.web.alerts.you")}</span>}
          </p>
          <span className={`care-status ${person.receivesCheckIns ? "is-on" : ""}`}>
            <span className="care-status__dot" aria-hidden="true" />
            {t(person.receivesCheckIns ? "care.web.alerts.getsCheckIns" : "care.web.alerts.updatesOnly")}
          </span>
        </li>
      ))}
    </ul>
  );
}
