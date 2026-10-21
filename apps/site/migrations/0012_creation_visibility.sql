-- Existing saves remain private; publication intent applies only to new requests.
ALTER TABLE track_assets ADD COLUMN publication jsonb CHECK (publication IS NULL OR jsonb_typeof(publication)='object');
CREATE INDEX catalogue_recent ON catalogue_submissions(reviewed_at DESC,track_id) WHERE state='approved';
ALTER TABLE generation_reservations ADD COLUMN visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('public','private'));
ALTER TABLE generation_reservations ADD COLUMN privacy_surcharge_bps integer NOT NULL DEFAULT 0 CHECK(privacy_surcharge_bps IN (0,2500));
ALTER TABLE credit_allocations ADD COLUMN privacy_credits integer NOT NULL DEFAULT 0 CHECK(privacy_credits>=0 AND privacy_credits<=credits);
