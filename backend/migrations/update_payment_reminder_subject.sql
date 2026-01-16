-- ============================================================================
-- UPDATE PAYMENT REMINDER TEMPLATE SUBJECT
-- Update the subject line of Payment Reminder templates to be more friendly
-- Created: 2025-01-16
-- ============================================================================

-- Update any existing Payment Reminder templates with the old subject line
UPDATE email_templates
SET 
  subject = 'DMVVGA Payment Reminder',
  updated_at = NOW()
WHERE 
  name = 'Payment Reminder' 
  AND subject = 'Payment Reminder: Your Outstanding Balance';
