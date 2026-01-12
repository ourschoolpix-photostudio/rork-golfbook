-- ============================================================================
-- ADD OFFLINE PAYMENT METHODS TO MEMBERSHIP PAYMENTS
-- Extends payment_method constraint to include cash, check, and venmo
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE membership_payments 
DROP CONSTRAINT IF EXISTS membership_payments_payment_method_check;

-- Add the new constraint with all payment methods
ALTER TABLE membership_payments 
ADD CONSTRAINT membership_payments_payment_method_check 
CHECK (payment_method IN ('cash', 'check', 'zelle', 'venmo', 'paypal'));

-- Update comment for documentation
COMMENT ON TABLE membership_payments IS 'Tracks membership renewal payments via PayPal, Zelle, Venmo, Cash, or Check';
