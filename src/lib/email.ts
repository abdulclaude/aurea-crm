/**
 * Email Service
 * Handles sending emails via Resend
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
  replyTo?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions) {
  if (!resend) {
    console.warn("Resend not configured. Email not sent:", {
      to: options.to,
      subject: options.subject,
    });
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  try {
    const fromEmail = options.from || process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com";
    const fromName = options.fromName || "Aurea CRM";
    const from = `${fromName} <${fromEmail}>`;

    const data = await resend.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
      })),
      replyTo: options.replyTo,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Send invoice reminder email with PDF attachment
 */
export async function sendInvoiceReminder(params: {
  to: string;
  subject: string;
  message: string;
  invoiceNumber: string;
  pdfBuffer?: Buffer;
  paymentLink?: string;
}) {
  const { to, subject, message, invoiceNumber, pdfBuffer, paymentLink } = params;

  // Convert message to HTML with proper formatting
  const htmlMessage = message
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return "<br>";
      if (paymentLink && line.includes(paymentLink)) {
        return `<p><a href="${paymentLink}" style="color: #3b82f6; text-decoration: underline;">${paymentLink}</a></p>`;
      }
      return `<p>${line}</p>`;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #1f2937;">Payment Reminder</h1>
    <p style="margin: 0; color: #6b7280;">Invoice: <strong>${invoiceNumber}</strong></p>
  </div>

  <div style="margin-bottom: 24px;">
    ${htmlMessage}
  </div>

  ${
    paymentLink
      ? `
  <div style="text-align: center; margin: 32px 0;">
    <a href="${paymentLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">View & Pay Invoice</a>
  </div>
  `
      : ""
  }

  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
    <p>This is an automated reminder for invoice ${invoiceNumber}. If you have any questions, please reply to this email.</p>
  </div>
</body>
</html>
  `;

  const attachments = pdfBuffer
    ? [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ]
    : undefined;

  // Get domain from RESEND_FROM_EMAIL
  const baseDomain = process.env.RESEND_FROM_EMAIL?.split("@")[1] || "yourdomain.com";

  return sendEmail({
    to,
    from: `invoices@${baseDomain}`,
    fromName: "Invoices",
    subject,
    html,
    text: message,
    attachments,
  });
}

/**
 * Send invoice to client
 */
export async function sendInvoiceEmail(params: {
  to: string;
  invoiceNumber: string;
  contactName: string;
  total: string;
  currency: string;
  dueDate: Date;
  pdfBuffer: Buffer;
  paymentLink: string;
  businessName?: string;
}) {
  const { to, invoiceNumber, contactName, total, currency, dueDate, pdfBuffer, paymentLink, businessName } =
    params;

  const subject = `Invoice ${invoiceNumber} from ${businessName || 'Your Business'}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px; padding: 32px; margin-bottom: 24px; color: white;">
    <h1 style="margin: 0 0 8px 0; font-size: 28px;">New Invoice</h1>
    <p style="margin: 0; opacity: 0.9; font-size: 18px;">Invoice ${invoiceNumber}</p>
  </div>

  <div style="margin-bottom: 24px;">
    <p style="font-size: 16px;">Dear ${contactName},</p>
    <p>Thank you for your business! Please find attached invoice ${invoiceNumber}.</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Amount Due</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 18px; color: #3b82f6;">${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
          }).format(parseFloat(total))}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Due Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${dueDate.toLocaleDateString(
            "en-US",
            {
              month: "long",
              day: "numeric",
              year: "numeric",
            }
          )}</td>
        </tr>
      </table>
    </div>

    <p>You can view and pay this invoice online using the button below:</p>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${paymentLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View & Pay Invoice</a>
  </div>

  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
    <p>Questions? Please reply to this email or contact us at your convenience.</p>
    <p>Invoice ${invoiceNumber} • Sent via Aurea CRM</p>
  </div>
</body>
</html>
  `;

  // Get domain from RESEND_FROM_EMAIL
  const baseDomain = process.env.RESEND_FROM_EMAIL?.split("@")[1] || "yourdomain.com";

  return sendEmail({
    to,
    from: `invoices@${baseDomain}`,
    fromName: "Invoices",
    subject,
    html,
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(params: {
  to: string;
  invoiceNumber: string;
  contactName: string;
  amountPaid: string;
  currency: string;
  paidAt: Date;
  paymentMethod?: string;
}) {
  const { to, invoiceNumber, contactName, amountPaid, currency, paidAt, paymentMethod = "Stripe" } = params;

  const subject = `Payment Received - Invoice ${invoiceNumber}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 32px; margin-bottom: 24px; color: white; text-align: center;">
    <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
    <h1 style="margin: 0 0 8px 0; font-size: 28px;">Payment Received!</h1>
    <p style="margin: 0; opacity: 0.9; font-size: 16px;">Thank you for your payment</p>
  </div>

  <div style="margin-bottom: 24px;">
    <p style="font-size: 16px;">Dear ${contactName},</p>
    <p>We have successfully received your payment for invoice ${invoiceNumber}. Thank you for your business!</p>

    <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #065f46;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #065f46;">Amount Paid</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 20px; color: #10b981;">${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
          }).format(parseFloat(amountPaid))}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #065f46;">Payment Method</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #065f46;">Payment Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${paidAt.toLocaleDateString(
            "en-US",
            {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          )}</td>
        </tr>
      </table>
    </div>

    <p>A receipt has been sent to your email address. If you have any questions about this payment, please don't hesitate to contact us.</p>
  </div>

  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
    <p>This is an automated payment confirmation for invoice ${invoiceNumber}.</p>
    <p style="margin: 8px 0 0 0;">Sent via Aurea CRM</p>
  </div>
</body>
</html>
  `;

  const text = `
Payment Received - Invoice ${invoiceNumber}

Dear ${contactName},

We have successfully received your payment for invoice ${invoiceNumber}. Thank you for your business!

Invoice Number: ${invoiceNumber}
Amount Paid: ${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(amountPaid))}
Payment Method: ${paymentMethod}
Payment Date: ${paidAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}

If you have any questions about this payment, please don't hesitate to contact us.

This is an automated payment confirmation for invoice ${invoiceNumber}.
  `;

  // Get domain from RESEND_FROM_EMAIL
  const baseDomain = process.env.RESEND_FROM_EMAIL?.split("@")[1] || "yourdomain.com";

  return sendEmail({
    to,
    from: `payments@${baseDomain}`,
    fromName: "Payments",
    subject,
    html,
    text,
  });
}
