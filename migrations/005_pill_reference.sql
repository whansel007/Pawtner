BEGIN;

-- T2-08 (revised): Pill comparison now anchors to a SETTINGS-defined "original" picture.
-- The senior (or caretaker) sets ONE reference photo per medicine in the medicine settings;
-- every check-in photo is compared against that reference. If no reference is set, the
-- check-in is rejected so the senior knows to set the original picture first.
--   pill_reference_image      base64 data URL of the original/reference pill photo (for display)
--   pill_reference_description vision model's description of the reference photo (used to compare)
--   pill_reference_set_at     when the reference was set
-- (The older pill_description / pill_described_at columns are left in place but no longer used.)
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS pill_reference_image text,
  ADD COLUMN IF NOT EXISTS pill_reference_description text,
  ADD COLUMN IF NOT EXISTS pill_reference_set_at timestamptz;

COMMIT;
