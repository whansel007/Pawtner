BEGIN;

-- The doctor's prior and future visit (owner, 19 Oct: "just do doctor's prior visit, then doctor's future visit in the
-- demo"; set in Settings > For demo only, each saved as given). A possible side-effect note in a reading counts if it
-- was written after the prior visit day, until the end of the future visit day (shared/nextVisit.ts). No future date =
-- that day. Same "columns now, tables later" pattern as the sharing switch; read and written only through
-- api/repository.ts getDoctorVisits / setDoctorVisits. Plain Postgres: additive, two nullable columns, no default.
ALTER TABLE users ADD COLUMN IF NOT EXISTS prior_doctor_visit date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS next_doctor_visit date;

COMMIT;
