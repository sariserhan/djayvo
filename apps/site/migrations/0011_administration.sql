ALTER TABLE "user" ADD COLUMN suspended boolean NOT NULL DEFAULT false;
ALTER TABLE generation_reservations ADD COLUMN credit_exempt boolean NOT NULL DEFAULT false;
CREATE TABLE site_settings (
 id integer PRIMARY KEY CHECK(id=1), revision integer NOT NULL DEFAULT 0,
 maintenance boolean NOT NULL DEFAULT false,
 maintenance_message text NOT NULL DEFAULT 'We are tuning things up. Please check back shortly.' CHECK(length(maintenance_message) BETWEEN 1 AND 500),
 banner text NOT NULL DEFAULT '' CHECK(length(banner)<=500),
 billing_mode text NOT NULL DEFAULT 'test' CHECK(billing_mode IN ('test','live')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO site_settings(id) VALUES(1);
CREATE TABLE admin_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id text NOT NULL REFERENCES "user"(id),
 action text NOT NULL, target text NOT NULL, details jsonb NOT NULL DEFAULT '{}' CHECK(octet_length(details::text)<=8192),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER admin_audit_no_mutation BEFORE UPDATE OR DELETE ON admin_audit
FOR EACH ROW EXECUTE FUNCTION jamloom_immutable_ledger();
CREATE TABLE support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('contact','support')),
 owner_id text REFERENCES "user"(id) ON DELETE SET NULL,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80), email text NOT NULL CHECK(length(email)<=254),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 120), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')), revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_inbox ON support_tickets(created_at DESC,id);
CREATE TABLE support_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES "user"(id), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE contact_rate_limits (
 key text PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(), count integer NOT NULL CHECK(count>0)
);
CREATE TABLE notification_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL UNIQUE,
 message jsonb NOT NULL CHECK(octet_length(message::text)<=32768),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, sent_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_pending ON notification_outbox(next_attempt_at) WHERE sent_at IS NULL;
-- Keep test and live Academy receipts distinguishable. Access is selected by server mode.
ALTER TABLE academy_purchases DROP CONSTRAINT academy_purchases_sandbox_check;
