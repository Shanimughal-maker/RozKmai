import emailjs from '@emailjs/browser';
import { ENV } from './constants';
import { WithdrawalRequest } from '../types';

export async function sendWithdrawalAdminNotification(withdrawal: WithdrawalRequest): Promise<{ success: boolean; error?: string }> {
  // Check if required credentials are provided
  if (!ENV.EMAILJS_SERVICE_ID || !ENV.EMAILJS_TEMPLATE_ID || !ENV.EMAILJS_PUBLIC_KEY) {
    console.info(
      '[EmailJS] Skipping live email notification: VITE_EMAILJS_TEMPLATE_ID or VITE_EMAILJS_PUBLIC_KEY is not configured yet in Environment Variables.',
      {
        adminEmail: ENV.ADMIN_EMAIL,
        withdrawal,
      }
    );
    return { success: true }; // Don't block withdrawal submission
  }

  try {
    const templateParams = {
      to_email: ENV.ADMIN_EMAIL,
      user_email: withdrawal.userEmail,
      user_name: withdrawal.userName,
      amount: withdrawal.amount.toFixed(2),
      payment_method: withdrawal.method,
      account_details: withdrawal.accountDetails,
      withdrawal_id: withdrawal.id,
      request_date: new Date(withdrawal.createdAt).toLocaleString(),
    };

    const response = await emailjs.send(
      ENV.EMAILJS_SERVICE_ID,
      ENV.EMAILJS_TEMPLATE_ID,
      templateParams,
      ENV.EMAILJS_PUBLIC_KEY
    );

    console.info('[EmailJS] Admin withdrawal notification sent successfully:', response.status);
    return { success: true };
  } catch (error: any) {
    console.warn('[EmailJS] Failed to send email notification:', error);
    return { success: false, error: error?.text || error?.message || 'Email delivery failed' };
  }
}
