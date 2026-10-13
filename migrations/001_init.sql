BEGIN;

CREATE TABLE users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Singapore',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE caregivers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_caregivers (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
  opted_in boolean NOT NULL DEFAULT false,
  threshold integer NOT NULL DEFAULT 2 CHECK (threshold >= 2),
  PRIMARY KEY (user_id, caregiver_id)
);

CREATE TABLE dogs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  heart smallint NOT NULL DEFAULT 2 CHECK (heart BETWEEN 0 AND 4),
  streak integer NOT NULL DEFAULT 0 CHECK (streak >= 0),
  mood text NOT NULL DEFAULT 'content' CHECK (mood IN ('joyful', 'content', 'sleepy', 'attentive'))
);

CREATE TABLE medications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  strength text,
  days_of_supply integer CHECK (days_of_supply IS NULL OR days_of_supply >= 0),
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE med_schedules (
  id uuid PRIMARY KEY,
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time time NOT NULL,
  starts_on date NOT NULL,
  ends_on date,
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE dose_events (
  id uuid PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES med_schedules(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('taken', 'skipped')),
  occurred_at timestamptz NOT NULL,
  proof_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dose_events_schedule_time_idx ON dose_events(schedule_id, occurred_at DESC);

CREATE TABLE health_metrics (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind = 'blood_pressure'),
  systolic integer NOT NULL CHECK (systolic > 0),
  diastolic integer NOT NULL CHECK (diastolic > 0),
  note text,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX health_metrics_user_time_idx ON health_metrics(user_id, recorded_at DESC);

CREATE TABLE walk_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  distance_meters integer NOT NULL CHECK (distance_meters >= 0),
  fast_stretch_occurred boolean NOT NULL DEFAULT false,
  CHECK (finished_at >= started_at)
);

CREATE TABLE souvenirs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  souvenir_key text NOT NULL,
  unlocked_at timestamptz NOT NULL,
  UNIQUE (user_id, souvenir_key)
);

CREATE TABLE agent_decisions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES med_schedules(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('nudge', 'celebrate', 'restock_reminder', 'doctor_question', 'see_gp_soon', 'emergency_995', 'stay_quiet')),
  rule_id text NOT NULL,
  mood text NOT NULL CHECK (mood IN ('joyful', 'content', 'sleepy', 'attentive')),
  observations jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasoning text NOT NULL,
  wording text NOT NULL,
  wording_source text NOT NULL CHECK (wording_source IN ('template', 'model')),
  caretaker_ping boolean NOT NULL DEFAULT false,
  refused boolean NOT NULL DEFAULT false,
  refusal_kind text CHECK (refusal_kind IS NULL OR refusal_kind IN ('double_dose', 'change_medication', 'reading_reassurance', 'diagnosis', 'pill_identification', 'interaction_advice')),
  created_at timestamptz NOT NULL
);
CREATE INDEX agent_decisions_user_time_idx ON agent_decisions(user_id, created_at DESC);
CREATE INDEX agent_decisions_schedule_idx ON agent_decisions(schedule_id, created_at DESC);

CREATE TABLE sg_registered_products (
  id uuid PRIMARY KEY,
  brand_name text NOT NULL,
  generic_name text,
  source_updated_at date,
  source_attribution text NOT NULL DEFAULT 'HSA Listing of Registered Therapeutic Products (Open Data Licence)'
);
CREATE INDEX sg_registered_products_brand_idx ON sg_registered_products(brand_name);

COMMIT;
