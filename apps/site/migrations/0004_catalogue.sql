CREATE TABLE catalogue_submissions (
  track_id uuid PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  artist text NOT NULL CHECK(char_length(artist) BETWEEN 1 AND 80),
  description text NOT NULL CHECK(char_length(description) BETWEEN 1 AND 500),
  mood text NOT NULL CHECK(mood IN ('energetic','chill','playful','dark','uplifting')),
  state text NOT NULL DEFAULT 'submitted' CHECK(state IN ('submitted','approved','rejected','withdrawn')),
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  consent_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id text REFERENCES "user"(id) ON DELETE SET NULL,
  review_note text CHECK(char_length(review_note) BETWEEN 1 AND 500)
);
CREATE INDEX catalogue_state ON catalogue_submissions(state,track_id);
CREATE TABLE catalogue_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  revision uuid NOT NULL,
  reviewer_id text REFERENCES "user"(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK(decision IN ('approved','rejected')),
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalogue_reports (
  track_id uuid NOT NULL REFERENCES catalogue_submissions(track_id) ON DELETE CASCADE,
  reporter_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK(char_length(reason) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  PRIMARY KEY(track_id,reporter_id)
);
CREATE TABLE playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX playlists_owner ON playlists(owner_id,created_at,id);
CREATE TABLE playlist_items (
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(playlist_id,track_id)
);
