BEGIN;

-- /care from any browser or device (owner, 18 Oct): four things Rose does on her phone were kept only in that browser's
-- localStorage, so the caretaker's /care saw them only in the same browser. They move to the database.
-- Owner's rule: "Columns only for current scope". So this adds COLUMNS ONLY to `users`, no new tables. The API treats each
-- refill request and each shared note as its own item (own id, timestamps, status, per-item endpoints), and every read and
-- write of these columns lives behind named methods in api/repository.ts, so real tables (and accounts) can replace them
-- later without changing the contract, the phone or /care. Additive only: no rows rewritten, no constraint changes.

-- Refill requests: [{ id, medicationId, daysLeft, requestedAt, status: 'pending' | 'handled', handledAt }].
ALTER TABLE users ADD COLUMN IF NOT EXISTS restock_requests jsonb NOT NULL DEFAULT '[]'::jsonb;
-- Notes Rose shares with her caretaker (never her private ones): [{ id (the phone's note id), text, updatedAt }].
ALTER TABLE users ADD COLUMN IF NOT EXISTS shared_visit_notes jsonb NOT NULL DEFAULT '[]'::jsonb;
-- "Share my blood pressure" (default on, as on the phone).
ALTER TABLE users ADD COLUMN IF NOT EXISTS share_blood_pressure boolean NOT NULL DEFAULT true;
-- The demo clock: the time it was set to, and when (server time) it was set; it runs forward from there. Null = real time.
ALTER TABLE users ADD COLUMN IF NOT EXISTS demo_clock_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS demo_clock_set_at timestamptz;

COMMIT;
