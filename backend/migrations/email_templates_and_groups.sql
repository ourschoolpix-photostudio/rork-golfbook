-- ============================================================================
-- EMAIL TEMPLATES AND MEMBER GROUPS
-- Store email templates and member groups for the email manager
-- Created: 2025-01-16
-- ============================================================================

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Member Groups Table
CREATE TABLE IF NOT EXISTS email_member_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  member_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_member_groups_created_at ON email_member_groups(created_at DESC);
