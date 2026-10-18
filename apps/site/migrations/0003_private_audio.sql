ALTER TABLE tracks DROP CONSTRAINT tracks_strategy_check;
ALTER TABLE tracks ADD CONSTRAINT tracks_strategy_check CHECK
  (strategy IN ('hiphop','reggae','experimental','club','funk','call_response','hybrid'));

-- RESTRICT keeps object cleanup records alive if account deletion is added later.
CREATE TABLE track_assets (
  track_id uuid PRIMARY KEY REFERENCES tracks(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  bytes integer NOT NULL CHECK (bytes BETWEEN 3840044 AND 7680044),
  state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading','ready','deleting','deleted')),
  consent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  staging_cleaned boolean NOT NULL DEFAULT false,
  UNIQUE (owner_id, request_id)
);
CREATE INDEX track_assets_cleanup ON track_assets(expires_at) WHERE state <> 'deleted';
CREATE INDEX track_assets_created ON track_assets(created_at);
