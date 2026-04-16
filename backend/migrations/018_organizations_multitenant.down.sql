DROP INDEX IF EXISTS idx_users_organization_id;
ALTER TABLE users DROP COLUMN IF EXISTS organization_id;

DROP INDEX IF EXISTS idx_venues_organization_id;
ALTER TABLE venues DROP COLUMN IF EXISTS organization_id;

DROP TRIGGER IF EXISTS set_updated_at_organizations ON organizations;
DROP TABLE IF EXISTS organizations;
