ALTER TABLE dna_song_jobs DROP CONSTRAINT dna_song_jobs_audio_bytes_check;
ALTER TABLE dna_song_jobs ADD CONSTRAINT dna_song_jobs_audio_bytes_check
 CHECK(audio_bytes BETWEEN 44 AND 26880044);
