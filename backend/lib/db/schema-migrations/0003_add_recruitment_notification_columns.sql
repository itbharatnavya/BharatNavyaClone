-- Recruitment (RECRUITMENT.md): new_application / application_status notifications
-- need a few more flattened notifications.data columns than the ones that already
-- existed. lib/db/flat.js's notifications mapper was updated to read/write these in
-- the same change that added jobs/applications — this migration is the DDL half of
-- that change, split out because 0002_add_recruitment_tables.sql had already been
-- applied by the time this gap was caught (by
-- test/recruitment-store.integration.test.js exercising createNotification for real —
-- the fire-and-forget .catch(()=>{}) call sites would otherwise have silently
-- swallowed this failure forever, and no in-app notification would ever have arrived
-- for a new application or a status change).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data_job_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data_job_title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data_application_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data_candidate_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data_status TEXT;
