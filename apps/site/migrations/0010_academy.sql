CREATE TABLE academy_purchases (
 receipt text PRIMARY KEY, owner_id text NOT NULL REFERENCES "user"(id),
 product_key text NOT NULL CHECK(product_key='academy-complete'), price_id text NOT NULL,
 payment_intent text NOT NULL UNIQUE, amount_cents integer NOT NULL CHECK(amount_cents=7999),
 currency text NOT NULL CHECK(currency='usd'), sandbox boolean NOT NULL CHECK(sandbox),
 refund_hold boolean NOT NULL DEFAULT false, dispute_hold boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academy_access ON academy_purchases(owner_id) WHERE NOT refund_hold AND NOT dispute_hold;
CREATE TABLE academy_purchase_holds (
 receipt text PRIMARY KEY, refund_hold boolean NOT NULL DEFAULT false, dispute_hold boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE academy_purchase_events (event_id text PRIMARY KEY,digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE academy_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 lesson_id text NOT NULL, version text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '2 hours', completed_at timestamptz
);
CREATE INDEX academy_progress ON academy_attempts(owner_id,lesson_id,version,completed_at);
CREATE TABLE academy_task_results (
 attempt_id uuid NOT NULL REFERENCES academy_attempts(id) ON DELETE CASCADE, task_id text NOT NULL,
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'), metrics jsonb NOT NULL CHECK(octet_length(metrics::text)<=2048),
 last_audio_time double precision NOT NULL CHECK(last_audio_time>=0), completed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(attempt_id,task_id)
);
CREATE TABLE academy_daily_usage (
 owner_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 day date NOT NULL DEFAULT current_date, attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 100)
);
