BEGIN;

-- Dates of the doctor's next and last visit (owner, 19 Oct: "we should remember two dates"; set in Settings > For demo
-- only). A possible side-effect note in a reading counts if it was written after the last visit day, until the end of
-- the next visit day (shared/nextVisit.ts). No next date = today. When a new next date is saved and the previous one
-- has passed, the previous one becomes the last visit.
-- Same "columns now, tables later" pattern as the sharing switch; read and written only through
-- api/repository.ts getNextVisit / setNextVisit. Plain Postgres: additive, two nullable columns, no default.
ALTER TABLE users ADD COLUMN IF NOT EXISTS next_doctor_visit date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_doctor_visit date;

COMMIT;
