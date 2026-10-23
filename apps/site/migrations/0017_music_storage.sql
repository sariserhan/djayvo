ALTER TABLE track_assets ADD COLUMN product text NOT NULL DEFAULT 'dj-studio'
 CHECK(product IN ('music-dna','improvise','dj-studio','live-dj','academy'));
ALTER TABLE track_assets ADD COLUMN storage_key text;
ALTER TABLE dna_song_jobs ADD COLUMN audio_key text;
ALTER TABLE dna_song_jobs ADD COLUMN audio_sha256 text CHECK(audio_sha256 ~ '^[a-f0-9]{64}$');
ALTER TABLE dna_song_jobs ADD COLUMN audio_bytes integer CHECK(audio_bytes BETWEEN 44 AND 24000000);
ALTER TABLE dna_song_jobs ADD COLUMN song_plan jsonb;
ALTER TABLE dna_song_jobs ADD CONSTRAINT dna_audio_receipt_complete CHECK(
 (audio_key IS NULL AND audio_sha256 IS NULL AND audio_bytes IS NULL) OR
 (audio_key IS NOT NULL AND audio_sha256 IS NOT NULL AND audio_bytes IS NOT NULL));
