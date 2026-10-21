CREATE TABLE generation_rentals (
 reservation_id uuid PRIMARY KEY REFERENCES generation_jobs(reservation_id),
 account_id bigint NOT NULL CHECK(account_id>0),
 label text NOT NULL UNIQUE CHECK(label='jamloom-job-' || reservation_id::text),
 instance_id bigint CHECK(instance_id>0),
 prepared_at timestamptz NOT NULL DEFAULT now(),
 destroy_requested_at timestamptz, destroy_confirmed_at timestamptz,
 final_cost_micros bigint CHECK(final_cost_micros>=0),
 cost_evidence_sha256 text CHECK(cost_evidence_sha256 ~ '^[0-9a-f]{64}$'),
 UNIQUE(account_id,instance_id),
 CHECK(destroy_confirmed_at IS NULL OR instance_id IS NOT NULL),
 CHECK((final_cost_micros IS NULL)=(cost_evidence_sha256 IS NULL))
);
