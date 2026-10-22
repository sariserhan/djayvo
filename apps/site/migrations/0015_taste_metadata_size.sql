-- Favorite metadata and Unicode lists share the existing private JSON profile.
ALTER TABLE taste_profiles DROP CONSTRAINT taste_profiles_profile_check;
ALTER TABLE taste_profiles ADD CONSTRAINT taste_profiles_profile_check
 CHECK(jsonb_typeof(profile)='object' AND octet_length(profile::text)<=65536);
