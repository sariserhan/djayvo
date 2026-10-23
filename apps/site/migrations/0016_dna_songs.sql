CREATE TABLE dna_song_jobs (
 id text PRIMARY KEY CHECK(id ~ '^[a-f0-9]{32}$'),
 owner_id text NOT NULL REFERENCES "user"(id),
 reservation_id uuid NOT NULL UNIQUE,
 profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object'),
 visibility text NOT NULL CHECK(visibility IN ('public','private')),
 public_consent_at timestamptz,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','completed','failed','cancelled')),
 cost_cap_micros bigint NOT NULL CHECK(cost_cap_micros>0),
 quoted_credits integer NOT NULL CHECK(quoted_credits>=0),
 title text, language text, direction text,
 started_at timestamptz, completed_at timestamptz, withdrawn_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(reservation_id,owner_id) REFERENCES generation_reservations(id,owner_id),
 CHECK((visibility='public')=(public_consent_at IS NOT NULL))
);
CREATE INDEX dna_owner_songs ON dna_song_jobs(owner_id,created_at DESC,id);
CREATE INDEX dna_public_songs ON dna_song_jobs(completed_at DESC,id)
 WHERE visibility='public' AND state='completed' AND withdrawn_at IS NULL;
