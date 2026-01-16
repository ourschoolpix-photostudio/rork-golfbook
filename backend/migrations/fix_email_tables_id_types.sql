-- ============================================================================
-- FIX EMAIL TABLES ID TYPES
-- Change UUID columns to TEXT to support custom ID format
-- Created: 2025-01-16
-- ============================================================================

-- Drop existing tables and recreate with correct types
DROP TABLE IF EXISTS email_member_groups;
DROP TABLE IF EXISTS email_templates;

-- Email Templates Table
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Member Groups Table
CREATE TABLE email_member_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  member_ids TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_email_templates_created_at ON email_templates(created_at DESC);
CREATE INDEX idx_email_member_groups_created_at ON email_member_groups(created_at DESC);
