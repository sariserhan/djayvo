CREATE SEQUENCE taste_profile_revision AS integer;
CREATE TABLE taste_profiles (
 owner_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object' AND octet_length(profile::text)<=16384),
 revision integer NOT NULL DEFAULT nextval('taste_profile_revision') CHECK(revision>0), updated_at timestamptz NOT NULL DEFAULT now()
);
