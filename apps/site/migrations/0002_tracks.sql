CREATE TABLE tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  strategy text NOT NULL CHECK (strategy IN ('hiphop', 'reggae', 'experimental', 'club')),
  duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 20000 AND 40000),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility = 'private'),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX tracks_owner_created ON tracks (owner_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
