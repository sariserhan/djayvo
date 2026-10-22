-- Preserve existing assets while accepting the bounded custom-duration renderer.
ALTER TABLE tracks DROP CONSTRAINT tracks_duration_ms_check;
ALTER TABLE tracks ADD CONSTRAINT tracks_duration_ms_check CHECK (duration_ms BETWEEN 15000 AND 60000);
ALTER TABLE track_assets DROP CONSTRAINT track_assets_bytes_check;
ALTER TABLE track_assets ADD CONSTRAINT track_assets_bytes_check CHECK (bytes BETWEEN 2880044 AND 11520044);
