import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLinkEmail({
  to,
  workerName,
  magicLink,
  expiresAt,
  organizationName,
}: {
  to: string;
  workerName: string;
  magicLink: string;
  expiresAt: Date;
  organizationName?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
      to: [to],
      subject: "Your Worker Portal Login Link",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Worker Portal Access</h1>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${workerName},</p>

              <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
                ${organizationName ? `${organizationName} has granted you` : "You've been granted"} access to the Worker Portal. Click the button below to log in and start tracking your time.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Access Worker Portal
                </a>
              </div>

              <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #666;">
                  <strong>Note:</strong> This link will expire on ${expiresAt.toLocaleString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}.
                </p>
              </div>

              <p style="font-size: 13px; color: #999; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${magicLink}
              </p>

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

              <p style="font-size: 12px; color: #999; text-align: center;">
                If you didn't request this login link, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send magic link email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    return { success: false, error };
  }
}

// SMS sending function (using Twilio or similar)
export async function sendMagicLinkSMS({
  to,
  workerName,
  magicLink,
}: {
  to: string;
  workerName: string;
  magicLink: string;
}) {
  // TODO: Implement SMS sending via Twilio
  // For now, just log it
  console.log(
    `[SMS] Sending magic link to ${to} for ${workerName}: ${magicLink}`,
  );

  return {
    success: false,
    error:
      "SMS sending not yet implemented. Please use email or copy the link manually.",
  };
}
