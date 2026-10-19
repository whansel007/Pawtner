BEGIN;

-- Date of the doctor's next visit (owner, 19 Oct; set in Settings > For demo only). A possible side-effect note in a
-- reading counts from when it is written until the end of that day (shared/nextVisit.ts). No date = today.
-- Same "columns now, tables later" pattern as the sharing switch; read and written only through
-- api/repository.ts getNextVisit / setNextVisit. Plain Postgres: additive, one nullable column, no default.
ALTER TABLE users ADD COLUMN IF NOT EXISTS next_doctor_visit date;

COMMIT;
