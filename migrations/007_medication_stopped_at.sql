BEGIN;

-- The senior can stop a medicine from her phone (Settings > My medicines). Stopping is soft: `active` turns false and
-- nothing is erased, so past doses stay in her history. `stopped_at` records when, so the caretakers' /care page can say
-- "A medicine is stopped." for that week (never the medicine's name). Null = never stopped, or started again.
-- Additive only: one nullable column, no default, no rows rewritten, no constraint changes.
ALTER TABLE medications ADD COLUMN IF NOT EXISTS stopped_at timestamptz;

COMMIT;
