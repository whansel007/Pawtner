BEGIN;

ALTER TABLE sg_registered_products
  ADD COLUMN IF NOT EXISTS licence_no text,
  ADD COLUMN IF NOT EXISTS licenseholder text,
  ADD COLUMN IF NOT EXISTS approval_date date,
  ADD COLUMN IF NOT EXISTS forensic_classification text,
  ADD COLUMN IF NOT EXISTS atc_code text,
  ADD COLUMN IF NOT EXISTS dosage_form text,
  ADD COLUMN IF NOT EXISTS route_of_administration text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS country_of_manufacturer text,
  ADD COLUMN IF NOT EXISTS active_ingredients text,
  ADD COLUMN IF NOT EXISTS strength text;

CREATE UNIQUE INDEX IF NOT EXISTS sg_registered_products_licence_no_idx
  ON sg_registered_products(licence_no) WHERE licence_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS sg_registered_products_generic_idx
  ON sg_registered_products(lower(generic_name));

COMMIT;
