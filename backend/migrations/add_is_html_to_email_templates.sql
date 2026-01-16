-- ============================================================================
-- ADD IS_HTML COLUMN TO EMAIL TEMPLATES
-- Add support for HTML email templates
-- Created: 2025-01-16
-- ============================================================================

-- Add is_html column to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS is_html BOOLEAN DEFAULT false;
