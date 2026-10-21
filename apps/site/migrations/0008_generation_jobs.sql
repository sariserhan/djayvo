CREATE TABLE generation_jobs (
 reservation_id uuid PRIMARY KEY, owner_id text NOT NULL,
 input_sha256 text NOT NULL CHECK(input_sha256 ~ '^[0-9a-f]{64}$'),
 plan_sha256 text NOT NULL CHECK(plan_sha256 ~ '^[0-9a-f]{64}$'),
 budget jsonb NOT NULL CHECK(jsonb_typeof(budget)='object'),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','stopping','completed','failed','cancelled')),
 worker_id text, lease_token uuid, lease_until timestamptz, deadline timestamptz,
 started_at timestamptz, stop_confirmed_at timestamptz, settled_at timestamptz,
 cancel_requested boolean NOT NULL DEFAULT false,
 actual_cost_micros bigint CHECK(actual_cost_micros>=0), output_sha256 text CHECK(output_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(reservation_id,owner_id) REFERENCES generation_reservations(id,owner_id),
 CHECK(state NOT IN ('completed','failed','cancelled') OR (stop_confirmed_at IS NOT NULL AND actual_cost_micros IS NOT NULL)),
 CHECK(state!='completed' OR output_sha256 IS NOT NULL)
);
CREATE INDEX generation_ready ON generation_jobs(created_at) WHERE state='queued';
CREATE INDEX generation_watchdog ON generation_jobs(lease_until) WHERE state IN ('running','stopping');
