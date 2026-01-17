-- Add Lift Clean and Place alert template
INSERT INTO alert_templates (id, name, title, message, priority, created_at)
VALUES (
  'template-6',
  'Lift Clean and Place',
  'Lift, Clean and Place in Effect',
  'Due to weather conditions, we are playing Lift, Clean and Place in the fairway. You may lift your ball, clean it, and place it within one club-length of its original position, no closer to the hole.',
  'critical',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
