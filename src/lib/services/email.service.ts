import { BrevoClient } from "@getbrevo/brevo";

export const emailService = {
  async sendOTP(to: string, otp: string, type: "LOGIN" | "RESET_PASSWORD") {
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@taskflow.app";
    const senderName = process.env.BREVO_SENDER_NAME || "TaskFlow";

    if (!brevoApiKey) {
      console.warn(`[MOCK EMAIL] BREVO_API_KEY is missing. OTP for ${to}: ${otp} (${type})`);
      return;
    }

    const brevo = new BrevoClient({ apiKey: brevoApiKey });
    
    const subject = type === "LOGIN" 
      ? `Mã xác minh đăng nhập TaskFlow: ${otp}`
      : `Mã đặt lại mật khẩu TaskFlow: ${otp}`;

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6366f1;">TaskFlow Security</h2>
        <p>Chào bạn,</p>
        <p>Bạn vừa yêu cầu mã xác minh cho dịch vụ ${type === "LOGIN" ? "đăng nhập" : "đặt lại mật khẩu"}.</p>
        <div style="background: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #18181b;">${otp}</span>
        </div>
        <p style="color: #52525b; font-size: 14px;">Mã này có hiệu lực trong 5 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">© 2026 TaskFlow. All rights reserved.</p>
      </div>
    `;

    try {
      console.log(`[EMAIL] Attempting to send ${type} OTP to ${to} using sender ${senderEmail}...`);
      
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject,
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        htmlContent,
      });
      
      console.log(`[EMAIL] Successfully sent OTP to ${to}. MessageId: ${response.messageId}`);
    } catch (error: any) {
      console.error(`[EMAIL ERROR] Failed to send OTP to ${to}:`, {
        message: error.message,
        response: error.response?.body || error.response,
        stack: error.stack
      });
      
      // Re-throw to be handled by the API route
      throw error;
    }
  },
};
