BEGIN;

-- T2-08: Pill photo recognition (demo only).
-- Stores the LLM-generated visual description of the medication photo
-- so a subsequent photo can be compared against it.
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS pill_description text,
  ADD COLUMN IF NOT EXISTS pill_described_at timestamptz;

COMMIT;
