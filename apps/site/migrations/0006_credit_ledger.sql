-- New commercial tables only. No production migration is run during build.
CREATE TABLE credit_wallets (
 owner_id text PRIMARY KEY REFERENCES "user"(id), frozen boolean NOT NULL DEFAULT false,
 app_account_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()
);
-- Persist out-of-order refunds/disputes even when their purchase has not arrived.
CREATE TABLE purchase_holds (
 provider text NOT NULL, receipt text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,receipt)
);
CREATE TABLE credit_lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL REFERENCES credit_wallets(owner_id),
 provider text NOT NULL CHECK(provider IN ('stripe_test','apple_sandbox')),
 receipt text NOT NULL, credits integer NOT NULL CHECK(credits>0),
 net_micros bigint NOT NULL CHECK(net_micros>=credits), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,receipt), UNIQUE(id,owner_id)
);
CREATE TABLE generation_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL REFERENCES credit_wallets(owner_id),
 request_key text NOT NULL, fingerprint text NOT NULL,
 status text NOT NULL CHECK(status IN ('reserved','running','completed','failed','cancelled')),
 cost_cap_micros bigint NOT NULL CHECK(cost_cap_micros>0),
 actual_cost_micros bigint CHECK(actual_cost_micros>=0 AND actual_cost_micros<=cost_cap_micros),
 margin_bps integer NOT NULL CHECK(margin_bps BETWEEN 3000 AND 9000),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,request_key), UNIQUE(id,owner_id)
);
CREATE TABLE credit_allocations (
 reservation_id uuid NOT NULL, lot_id uuid NOT NULL, owner_id text NOT NULL,
 credits integer NOT NULL CHECK(credits>0), net_per_credit bigint NOT NULL CHECK(net_per_credit>0),
 PRIMARY KEY(reservation_id,lot_id),
 FOREIGN KEY(reservation_id,owner_id) REFERENCES generation_reservations(id,owner_id),
 FOREIGN KEY(lot_id,owner_id) REFERENCES credit_lots(id,owner_id)
);
CREATE TABLE wallet_ledger_entries (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id text NOT NULL,
 lot_id uuid NOT NULL, reservation_id uuid, kind text NOT NULL CHECK(kind IN ('grant','reserve','capture','release','refund')),
 available_delta integer NOT NULL, reserved_delta integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(lot_id,owner_id) REFERENCES credit_lots(id,owner_id),
 FOREIGN KEY(reservation_id,owner_id) REFERENCES generation_reservations(id,owner_id),
 CHECK ((kind='grant' AND available_delta>0 AND reserved_delta=0 AND reservation_id IS NULL) OR
 (kind='reserve' AND available_delta<0 AND reserved_delta=-available_delta AND reservation_id IS NOT NULL) OR
 (kind='release' AND available_delta>0 AND reserved_delta=-available_delta AND reservation_id IS NOT NULL) OR
 (kind='capture' AND available_delta=0 AND reserved_delta<0 AND reservation_id IS NOT NULL) OR
 (kind='refund' AND available_delta<=0 AND reserved_delta=0 AND reservation_id IS NULL))
);
CREATE INDEX wallet_owner ON wallet_ledger_entries(owner_id,lot_id);
CREATE FUNCTION jamloom_immutable_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Wallet ledger is append-only'; END $$;
CREATE TRIGGER wallet_no_mutation BEFORE UPDATE OR DELETE ON wallet_ledger_entries
FOR EACH ROW EXECUTE FUNCTION jamloom_immutable_ledger();
CREATE TABLE provider_webhook_events (
 provider text NOT NULL, event_id text NOT NULL, digest text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(provider,event_id)
);
