import { supabase } from '@/integrations/supabase/client';

export type MembershipLevel = 'full' | 'basic';
export type PaymentMethod = 'cash' | 'check' | 'zelle' | 'venmo' | 'paypal';

export interface MembershipPaymentData {
  memberId: string;
  memberName: string;
  membershipType: MembershipLevel;
  paymentMethod: PaymentMethod;
  email?: string;
  phone?: string;
  fullMembershipPrice: string;
  basicMembershipPrice: string;
}

const PAYPAL_FEE_PERCENT = 0.03;
const PAYPAL_FEE_FIXED = 0.30;

export function calculatePayPalAdjustedAmount(baseAmount: string): string {
  const amount = parseFloat(baseAmount) || 0;
  const fee = (amount * PAYPAL_FEE_PERCENT) + PAYPAL_FEE_FIXED;
  return (amount + fee).toFixed(2);
}

export function getDisplayAmount(
  membershipType: MembershipLevel,
  paymentMethod: PaymentMethod,
  fullMembershipPrice: string,
  basicMembershipPrice: string
): string {
  const baseAmount = membershipType === 'full' 
    ? (fullMembershipPrice || '0')
    : (basicMembershipPrice || '0');
  
  if (paymentMethod === 'paypal') {
    return calculatePayPalAdjustedAmount(baseAmount);
  }
  return baseAmount;
}

export async function addMembershipPaymentRecord(data: MembershipPaymentData): Promise<{ success: boolean; error?: string }> {
  const baseAmount = data.membershipType === 'full' 
    ? (data.fullMembershipPrice || '0')
    : (data.basicMembershipPrice || '0');
  
  const amount = data.paymentMethod === 'paypal' 
    ? calculatePayPalAdjustedAmount(baseAmount)
    : baseAmount;
  
  const memberId = String(data.memberId).trim();
  
  console.log('[MembershipHistoryService] ========================================');
  console.log('[MembershipHistoryService] Adding membership record...');
  console.log('[MembershipHistoryService] Member ID:', memberId);
  console.log('[MembershipHistoryService] Member Name:', data.memberName);
  console.log('[MembershipHistoryService] Membership Type:', data.membershipType);
  console.log('[MembershipHistoryService] Amount:', amount);
  console.log('[MembershipHistoryService] Payment Method:', data.paymentMethod);
  console.log('[MembershipHistoryService] ========================================');
  
  const insertData = {
    member_id: memberId,
    member_name: data.memberName,
    membership_type: data.membershipType,
    amount: amount,
    payment_method: data.paymentMethod,
    payment_status: 'completed',
    email: data.email || '',
    phone: data.phone || '',
    created_at: new Date().toISOString(),
  };
  
  console.log('[MembershipHistoryService] Insert data:', JSON.stringify(insertData, null, 2));
  
  try {
    const { data: responseData, error, status, statusText } = await supabase
      .from('membership_payments')
      .insert(insertData)
      .select();
    
    console.log('[MembershipHistoryService] Supabase response status:', status, statusText);
    console.log('[MembershipHistoryService] Supabase response data:', JSON.stringify(responseData, null, 2));
    
    if (error) {
      console.error('[MembershipHistoryService] ❌ Error inserting membership payment:');
      console.error('[MembershipHistoryService] Error message:', error.message);
      console.error('[MembershipHistoryService] Error details:', error.details);
      console.error('[MembershipHistoryService] Error hint:', error.hint);
      console.error('[MembershipHistoryService] Error code:', error.code);
      return { success: false, error: error.message };
    }
    
    if (!responseData || responseData.length === 0) {
      console.error('[MembershipHistoryService] ❌ Insert returned no data - record may not have been saved');
      return { success: false, error: 'Record may not have been saved' };
    }
    
    console.log('[MembershipHistoryService] ✅ Insert successful');
    console.log('[MembershipHistoryService] Inserted record ID:', responseData[0]?.id);
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('membership_payments')
      .select('*')
      .eq('member_id', memberId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false });
    
    console.log('[MembershipHistoryService] Verification query by member_id:', memberId);
    console.log('[MembershipHistoryService] Verification result count:', verifyData?.length || 0);
    
    if (verifyError) {
      console.error('[MembershipHistoryService] ❌ Verification query failed:', verifyError);
    } else if (!verifyData || verifyData.length === 0) {
      console.error('[MembershipHistoryService] ❌ Verification failed - no records found for member_id:', memberId);
    } else {
      console.log('[MembershipHistoryService] ✅ VERIFIED! Found', verifyData.length, 'record(s) for this member');
    }
    
    return { success: true };
  } catch (err) {
    console.error('[MembershipHistoryService] Exception:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
