CREATE TABLE pro_purchases (
 receipt text PRIMARY KEY, owner_id text NOT NULL REFERENCES "user"(id),
 product_key text NOT NULL CHECK(product_key='jamloom-pro-v1'), price_id text NOT NULL,
 payment_intent text NOT NULL UNIQUE, amount_cents integer NOT NULL CHECK(amount_cents=4900),
 currency text NOT NULL CHECK(currency='usd'), sandbox boolean NOT NULL,
 refund_hold boolean NOT NULL DEFAULT false, dispute_hold boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pro_access ON pro_purchases(owner_id) WHERE NOT refund_hold AND NOT dispute_hold;
CREATE TABLE pro_purchase_holds (
 receipt text PRIMARY KEY, refund_hold boolean NOT NULL DEFAULT false, dispute_hold boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pro_purchase_events (event_id text PRIMARY KEY,digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),processed_at timestamptz NOT NULL DEFAULT now());
