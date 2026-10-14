BEGIN;

-- T2-05: prescribed_for is user/caretaker entered only, never model-filled.
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS prescribed_for text,
  ADD COLUMN IF NOT EXISTS dosage_form text,
  ADD COLUMN IF NOT EXISTS route_of_administration text,
  ADD COLUMN IF NOT EXISTS active_ingredients text,
  ADD COLUMN IF NOT EXISTS generic_name text;

-- T2-11: caretaker treats — a simple event the senior's Home can refresh.
CREATE TABLE IF NOT EXISTS treats (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES caregivers(id) ON DELETE SET NULL,
  message text NOT NULL DEFAULT 'A treat from your caretaker!',
  given_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS treats_user_idx ON treats(user_id, given_at DESC);

-- T2-09: souvenir unlock is derived from cumulative walk distance.
-- The souvenirs table already exists in 001_init.sql; no schema change needed.

COMMIT;
