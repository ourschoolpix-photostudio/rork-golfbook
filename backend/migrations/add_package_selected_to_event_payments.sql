-- Add package_selected column to event_payments table
ALTER TABLE event_payments
ADD COLUMN IF NOT EXISTS package_selected INTEGER CHECK (package_selected IN (1, 2, 3));

-- Add index for package_selected queries
CREATE INDEX IF NOT EXISTS idx_event_payments_package_selected ON event_payments(package_selected);
