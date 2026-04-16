CREATE TABLE organizations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    slug                    VARCHAR(100) NOT NULL,
    stripe_customer_id      VARCHAR(255) NOT NULL DEFAULT '',
    stripe_subscription_id  VARCHAR(255) NOT NULL DEFAULT '',
    subscription_status     VARCHAR(32) NOT NULL DEFAULT 'inactive',
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_organizations_slug ON organizations (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_subscription_status ON organizations (subscription_status);

CREATE TRIGGER set_updated_at_organizations BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE venues ADD COLUMN organization_id UUID REFERENCES organizations(id);

INSERT INTO organizations (name, slug, subscription_status)
VALUES ('Legado', 'legado', 'active');

UPDATE venues v
SET organization_id = (SELECT id FROM organizations o WHERE o.slug = 'legado' LIMIT 1)
WHERE v.organization_id IS NULL;

ALTER TABLE venues ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX idx_venues_organization_id ON venues (organization_id);

ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);

CREATE INDEX idx_users_organization_id ON users (organization_id) WHERE organization_id IS NOT NULL;
