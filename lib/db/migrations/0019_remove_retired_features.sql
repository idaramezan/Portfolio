DROP TABLE IF EXISTS gallery_elements CASCADE;
DROP TABLE IF EXISTS gallery_assets CASCADE;
DROP TABLE IF EXISTS gallery_scenes CASCADE;
DROP TABLE IF EXISTS gallery_settings CASCADE;

DROP TABLE IF EXISTS collector_experience_config CASCADE;
DROP TABLE IF EXISTS collector_video_media CASCADE;

DROP TABLE IF EXISTS international_original_requests CASCADE;
DROP SEQUENCE IF EXISTS original_request_number_seq;

UPDATE shop_settings
SET payload = payload - 'studioMailPackages' - 'mysteryMail',
    updated_at = NOW()
WHERE id = 'primary';
