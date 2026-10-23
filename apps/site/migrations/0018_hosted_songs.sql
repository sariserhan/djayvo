ALTER TABLE credit_lots DROP CONSTRAINT credit_lots_provider_check;
ALTER TABLE provider_webhook_events ADD COLUMN handled boolean NOT NULL DEFAULT true;
ALTER TABLE credit_lots ADD CONSTRAINT credit_lots_provider_check CHECK(provider IN ('stripe_test','stripe_live','apple_sandbox'));
ALTER TABLE dna_song_jobs ADD COLUMN product text NOT NULL DEFAULT 'music-dna' CHECK(product IN ('music-dna','improvise'));
ALTER TABLE dna_song_jobs ADD COLUMN billing_live boolean NOT NULL DEFAULT false;
CREATE TABLE song_uploads (
 id text PRIMARY KEY CHECK(id ~ '^[a-f0-9]{32}$'), owner_id text NOT NULL REFERENCES "user"(id),
 object_key text NOT NULL UNIQUE, bytes integer NOT NULL CHECK(bytes BETWEEN 44 AND 10000044),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 day'
);
CREATE TABLE cloud_song_runs (
 id text PRIMARY KEY REFERENCES dna_song_jobs(id),
 rate_micros integer NOT NULL CHECK(rate_micros BETWEEN 1 AND 1000), fixed_cost_micros integer NOT NULL CHECK(fixed_cost_micros>=0),
 endpoint text NOT NULL, provider_id text UNIQUE, payload jsonb NOT NULL,
 source_id text UNIQUE REFERENCES song_uploads(id), output_key text NOT NULL UNIQUE,
 phase text NOT NULL DEFAULT 'queued', cancel_requested boolean NOT NULL DEFAULT false,
 submitted_at timestamptz, deadline timestamptz NOT NULL,
 lease_until timestamptz, lease_token uuid,
 provider_status text, provider_receipt jsonb,
 execution_ms bigint, delay_ms bigint, estimated_cost_micros bigint,
 cleanup_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cloud_song_work ON cloud_song_runs(updated_at) WHERE cleanup_at IS NULL;
CREATE TABLE song_feedback (
 owner_id text NOT NULL REFERENCES "user"(id), song_id text NOT NULL REFERENCES dna_song_jobs(id),
 feedback jsonb NOT NULL CHECK(jsonb_typeof(feedback)='object'),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id,song_id)
);
