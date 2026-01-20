import { supabase } from '@/integrations/supabase/client';
import { createPayPalOrder } from './paypalService';
import { formatPhoneNumber } from './phoneFormatter';

export interface PaymentEmailConfig {
  amount: number;
  eventName: string;
  eventId: string;
  playerEmail: string;
  itemDescription?: string;
  dueDate?: string;
  includeProcessingFee?: boolean;
}

export interface PayPalLinkResult {
  approvalUrl: string;
  orderId: string;
  amountWithFee: number;
}

export async function createPayPalPaymentLink(
  config: PaymentEmailConfig
): Promise<PayPalLinkResult> {
  console.log('[PaymentEmailService] Creating PayPal payment link...');
  console.log('[PaymentEmailService] Amount:', config.amount);
  console.log('[PaymentEmailService] Event:', config.eventName);

  const { data: paypalConfig, error: configError } = await supabase
    .from('organization_settings')
    .select('paypal_client_id, paypal_client_secret, paypal_mode, paypal_processing_fee, paypal_transaction_fee')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (configError || !paypalConfig) {
    console.error('[PaymentEmailService] Failed to fetch PayPal config:', configError);
    throw new Error('Failed to load PayPal configuration');
  }

  if (!paypalConfig.paypal_client_id || !paypalConfig.paypal_client_secret) {
    throw new Error('PayPal credentials not configured');
  }

  let processingFee = Number(paypalConfig.paypal_processing_fee) || 3;
  const transactionFee = Number(paypalConfig.paypal_transaction_fee) || 0.30;
  
  if (processingFee > 1) {
    processingFee = processingFee / 100;
  }
  
  const baseAmount = config.amount;
  const amountWithFee = config.includeProcessingFee 
    ? ((baseAmount + transactionFee) / (1 - processingFee))
    : baseAmount;

  console.log('[PaymentEmailService] Base amount:', baseAmount.toFixed(2));
  console.log('[PaymentEmailService] Amount with fee:', amountWithFee.toFixed(2));
  console.log('[PaymentEmailService] Processing fee:', (processingFee * 100) + '%');
  console.log('[PaymentEmailService] Transaction fee:', '$' + transactionFee.toFixed(2));

  const paypalOrderResponse = await createPayPalOrder({
    amount: amountWithFee,
    eventName: config.eventName,
    eventId: config.eventId,
    playerEmail: config.playerEmail,
    paypalClientId: paypalConfig.paypal_client_id,
    paypalClientSecret: paypalConfig.paypal_client_secret,
    paypalMode: (paypalConfig.paypal_mode || 'sandbox') as 'sandbox' | 'live',
  });

  console.log('[PaymentEmailService] ✅ PayPal order created successfully');
  console.log('[PaymentEmailService] Order ID:', paypalOrderResponse.orderId);
  console.log('[PaymentEmailService] Approval URL:', paypalOrderResponse.approvalUrl);

  return {
    approvalUrl: paypalOrderResponse.approvalUrl,
    orderId: paypalOrderResponse.orderId,
    amountWithFee,
  };
}

export interface GeneratePaymentEmailHTMLConfig {
  playerName: string;
  eventName: string;
  eventVenue?: string;
  eventDate?: string;
  option1Name: string;
  option1Amount: number;
  option2Name: string;
  option2Amount: number;
  dueDate: string;
  itemDescription: string;
  zellePhone: string;
  paypalApprovalUrl1: string;
  paypalAmountWithFee1: number;
  paypalApprovalUrl2: string;
  paypalAmountWithFee2: number;
  guestCount?: number;
  organizationName?: string;
}

export function generatePaymentReminderHTML(config: GeneratePaymentEmailHTMLConfig): string {
  const zellePhone = formatPhoneNumber(config.zellePhone);
  const option1Value = config.option1Amount.toFixed(2);
  const option2Value = config.option2Amount.toFixed(2);
  const paypalAmount1Value = config.paypalAmountWithFee1.toFixed(2);
  const paypalAmount2Value = config.paypalAmountWithFee2.toFixed(2);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; }
    .header-icon { width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 32px; }
    .content { padding: 40px 20px; }
    .greeting { font-size: 16px; color: #333333; margin-bottom: 24px; line-height: 1.6; }
    .event-card { background-color: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .event-card h2 { color: #1B5E20; font-size: 22px; margin: 0 0 16px 0; font-weight: 700; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .detail-label { font-size: 14px; color: #666666; font-weight: 600; }
    .detail-value { font-size: 14px; color: #1a1a1a; font-weight: 600; text-align: right; }
    .amount-box { background-color: #ffffff; border: 2px solid #1B5E20; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .amount-label { font-size: 16px; color: #666666; margin-bottom: 8px; }
    .amount-value { font-size: 36px; font-weight: 700; color: #1B5E20; margin: 0; }
    .payment-methods { margin: 32px 0; }
    .section-title { font-size: 20px; font-weight: 700; color: #333333; margin-bottom: 20px; text-align: center; }
    .payment-option { background-color: #ffffff; border: 2px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .payment-option-header { display: flex; align-items: center; margin-bottom: 16px; justify-content: center; }
    .payment-icon { width: 48px; height: 48px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; color: #ffffff; font-size: 24px; }
    .payment-icon.zelle { background-color: #6B21A8; }
    .payment-icon.paypal { background-color: #0070BA; }
    .payment-name { font-size: 20px; font-weight: 700; color: #333333; }
    .payment-info { font-size: 16px; font-weight: 600; text-align: center; padding: 16px; background-color: #F8F9FA; border-radius: 8px; margin-top: 12px; }
    .payment-info.zelle { color: #6B21A8; }
    .zelle-option { display: flex; justify-content: space-between; padding: 12px 16px; background-color: #F3E8FF; border-radius: 8px; margin: 8px 0; }
    .zelle-option-name { font-size: 15px; color: #6B21A8; font-weight: 600; }
    .zelle-option-amount { font-size: 18px; color: #6B21A8; font-weight: 700; }
    .paypal-options { margin-top: 16px; }
    .paypal-option-box { background-color: #E3F2FD; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .paypal-option-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .paypal-option-name { font-size: 15px; color: #0070BA; font-weight: 600; }
    .paypal-option-amount { font-size: 20px; color: #0070BA; font-weight: 700; }
    .paypal-fee-note { font-size: 12px; color: #666666; text-align: center; margin-bottom: 8px; }
    .paypal-button { display: inline-block; background-color: #0070BA; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 700; text-align: center; width: 100%; box-sizing: border-box; transition: background-color 0.2s; }
    .paypal-button:hover { background-color: #005A9C; }
    .deadline-box { background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; border-radius: 8px; margin: 24px 0; }
    .deadline-text { color: #DC2626; font-size: 14px; font-weight: 600; margin: 0; }
    .footer { background-color: #f8f9fa; padding: 24px 20px; text-align: center; border-top: 1px solid #e0e0e0; }
    .footer-text { font-size: 14px; color: #333333; margin: 12px 0; font-weight: 600; }
    .disclaimer { font-size: 12px; color: #666666; font-style: italic; text-align: center; margin: 16px 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">💳</div>
      <h1>PAYMENT REMINDER</h1>
      ${config.organizationName ? `<p>${config.organizationName}</p>` : ''}
    </div>
    
    <div class="content">
      <p class="greeting">
        Hi ${config.playerName},<br><br>
        This is a friendly reminder for you to make a payment for something you registered for. See details below.
      </p>
      
      <div class="event-card">
        <h2>${config.eventName}</h2>
        ${config.eventVenue ? `
        <div class="detail-row">
          <span class="detail-label">Venue</span>
          <span class="detail-value">${config.eventVenue}</span>
        </div>
        ` : ''}
        ${config.eventDate ? `
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${config.eventDate}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Invoice For</span>
          <span class="detail-value">${config.itemDescription}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">${config.dueDate}</span>
        </div>
        ${config.guestCount && config.guestCount > 0 ? `
        <div class="detail-row">
          <span class="detail-label">Guests</span>
          <span class="detail-value">${config.guestCount} guest${config.guestCount > 1 ? 's' : ''}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="amount-box">
        <div class="amount-label">Payment Options</div>
        <div style="margin-top: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
            <span style="font-size: 16px; color: #333;">${config.option1Name}</span>
            <span style="font-size: 18px; font-weight: 700; color: #1B5E20;">${option1Value}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="font-size: 16px; color: #333;">${config.option2Name}</span>
            <span style="font-size: 18px; font-weight: 700; color: #1B5E20;">${option2Value}</span>
          </div>
        </div>
      </div>
      
      <div class="payment-methods">
        <h2 class="section-title">Payment Options</h2>
        
        <div class="payment-option">
          <div class="payment-option-header">
            <div class="payment-icon zelle">💸</div>
            <div class="payment-name">Zelle</div>
          </div>
          <p style="font-size: 14px; color: #666666; margin: 0 0 12px 0; text-align: center;">Send payment via Zelle to:</p>
          <div class="payment-info zelle">${zellePhone}</div>
          <div style="margin-top: 16px;">
            <div class="zelle-option">
              <span class="zelle-option-name">${config.option1Name}</span>
              <span class="zelle-option-amount">${option1Value}</span>
            </div>
            <div class="zelle-option">
              <span class="zelle-option-name">${config.option2Name}</span>
              <span class="zelle-option-amount">${option2Value}</span>
            </div>
          </div>
        </div>
        
        <div class="payment-option">
          <div class="payment-option-header">
            <div class="payment-icon paypal">🅿️</div>
            <div class="payment-name">PayPal</div>
          </div>
          <p style="font-size: 14px; color: #666666; margin: 0 0 16px 0; text-align: center;">Choose your option below (includes processing fee):</p>
          
          <div class="paypal-options">
            <div class="paypal-option-box">
              <div class="paypal-option-header">
                <span class="paypal-option-name">${config.option1Name}</span>
                <span class="paypal-option-amount">${paypalAmount1Value}</span>
              </div>
              <a href="${config.paypalApprovalUrl1}" class="paypal-button">PAY ${paypalAmount1Value} WITH PAYPAL</a>
            </div>
            
            <div class="paypal-option-box">
              <div class="paypal-option-header">
                <span class="paypal-option-name">${config.option2Name}</span>
                <span class="paypal-option-amount">${paypalAmount2Value}</span>
              </div>
              <a href="${config.paypalApprovalUrl2}" class="paypal-button">PAY ${paypalAmount2Value} WITH PAYPAL</a>
            </div>
          </div>
        </div>
      </div>
      
      <div class="deadline-box">
        <p class="deadline-text">⏰ Payment must be received by ${config.dueDate}.</p>
      </div>
      
      <p class="disclaimer">
        If you have already submitted your payment, please disregard this reminder.
      </p>
      
      <p class="footer-text" style="margin-top: 32px;">
        Thank you again for your support of ${config.organizationName || 'our organization'}.
      </p>
    </div>
    
    <div class="footer">
      <p style="font-size: 12px; color: #666666; margin: 4px 0;">This is an automated payment reminder</p>
    </div>
  </div>
</body>
</html>`;
}
