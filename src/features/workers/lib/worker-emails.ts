/**
 * Worker Email Notifications
 * Handles email notifications for workers (document expiry, shift changes, etc.)
 */

import { sendEmail } from "@/lib/email";
import { format, formatDistanceToNow } from "date-fns";

export interface SendDocumentExpiryReminderParams {
  workerEmail: string;
  workerName: string;
  documentName: string;
  documentType: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  portalUrl: string;
}

export async function sendDocumentExpiryReminder(
  params: SendDocumentExpiryReminderParams
) {
  const {
    workerEmail,
    workerName,
    documentName,
    documentType,
    expiryDate,
    daysUntilExpiry,
    portalUrl,
  } = params;

  const isExpired = daysUntilExpiry < 0;
  const subject = isExpired
    ? `Your ${documentName} has expired`
    : `Your ${documentName} expires soon`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${isExpired ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 16px;">${isExpired ? "⚠️" : "⏰"}</div>
    <h1 style="color: white; margin: 0; font-size: 24px;">${isExpired ? "Document Expired" : "Document Expiring Soon"}</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${workerName},</p>

    <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
      ${
        isExpired
          ? `Your <strong>${documentName}</strong> expired on <strong>${format(expiryDate, "dd MMMM yyyy")}</strong>. Please upload a new version as soon as possible to maintain your compliance status.`
          : `Your <strong>${documentName}</strong> will expire in <strong>${daysUntilExpiry} ${daysUntilExpiry === 1 ? "day" : "days"}</strong> on <strong>${format(expiryDate, "dd MMMM yyyy")}</strong>. Please upload a renewed version before it expires.`
      }
    </p>

    <div style="background: ${isExpired ? "#fee2e2" : "#fef3c7"}; border-left: 4px solid ${isExpired ? "#ef4444" : "#f59e0b"}; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #666;">
        <strong>Document:</strong> ${documentName}<br>
        <strong>Type:</strong> ${documentType}<br>
        <strong>Expiry Date:</strong> ${format(expiryDate, "dd MMMM yyyy")}<br>
        <strong>Status:</strong> ${isExpired ? "Expired" : `Expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? "day" : "days"}`}
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Update Document
      </a>
    </div>

    <p style="font-size: 13px; color: #999; margin-top: 30px;">
      Maintaining up-to-date compliance documents is important for your employment status. If you have any questions, please contact your manager.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated reminder from your Worker Portal.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
${subject}

Hi ${workerName},

${
  isExpired
    ? `Your ${documentName} expired on ${format(expiryDate, "dd MMMM yyyy")}. Please upload a new version as soon as possible to maintain your compliance status.`
    : `Your ${documentName} will expire in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? "day" : "days"} on ${format(expiryDate, "dd MMMM yyyy")}. Please upload a renewed version before it expires.`
}

Document: ${documentName}
Type: ${documentType}
Expiry Date: ${format(expiryDate, "dd MMMM yyyy")}
Status: ${isExpired ? "Expired" : `Expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? "day" : "days"}`}

Update your document here: ${portalUrl}

Maintaining up-to-date compliance documents is important for your employment status. If you have any questions, please contact your manager.

This is an automated reminder from your Worker Portal.
  `;

  return sendEmail({
    to: workerEmail,
    subject,
    html,
    text,
  });
}

export interface SendShiftAssignedParams {
  workerEmail: string;
  workerName: string;
  shiftTitle: string;
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  location?: string;
  portalUrl: string;
}

export async function sendShiftAssignedNotification(
  params: SendShiftAssignedParams
) {
  const {
    workerEmail,
    workerName,
    shiftTitle,
    shiftDate,
    startTime,
    endTime,
    location,
    portalUrl,
  } = params;

  const subject = `New Shift Assigned: ${shiftTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
    <h1 style="color: white; margin: 0; font-size: 24px;">New Shift Assigned</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${workerName},</p>

    <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
      You have been assigned a new shift. Please review the details below and confirm your availability.
    </p>

    <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h2 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">${shiftTitle}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #1e40af;">📅 Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${format(shiftDate, "EEEE, dd MMMM yyyy")}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #1e40af;">⏰ Time</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}</td>
        </tr>
        ${
          location
            ? `
        <tr>
          <td style="padding: 8px 0; color: #1e40af;">📍 Location</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${location}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        View Shift Details
      </a>
    </div>

    <p style="font-size: 13px; color: #999; margin-top: 30px;">
      If you have any questions or cannot attend this shift, please contact your manager as soon as possible.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated notification from your Worker Portal.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
${subject}

Hi ${workerName},

You have been assigned a new shift. Please review the details below and confirm your availability.

Shift: ${shiftTitle}
Date: ${format(shiftDate, "EEEE, dd MMMM yyyy")}
Time: ${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}
${location ? `Location: ${location}` : ""}

View shift details: ${portalUrl}

If you have any questions or cannot attend this shift, please contact your manager as soon as possible.

This is an automated notification from your Worker Portal.
  `;

  return sendEmail({
    to: workerEmail,
    subject,
    html,
    text,
  });
}

export interface SendShiftCancelledParams {
  workerEmail: string;
  workerName: string;
  shiftTitle: string;
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  reason?: string;
}

export async function sendShiftCancelledNotification(
  params: SendShiftCancelledParams
) {
  const {
    workerEmail,
    workerName,
    shiftTitle,
    shiftDate,
    startTime,
    endTime,
    reason,
  } = params;

  const subject = `Shift Cancelled: ${shiftTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
    <h1 style="color: white; margin: 0; font-size: 24px;">Shift Cancelled</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${workerName},</p>

    <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
      Your shift on <strong>${format(shiftDate, "EEEE, dd MMMM yyyy")}</strong> has been cancelled.
    </p>

    <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #666;">
        <strong>Shift:</strong> ${shiftTitle}<br>
        <strong>Date:</strong> ${format(shiftDate, "EEEE, dd MMMM yyyy")}<br>
        <strong>Time:</strong> ${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}
        ${reason ? `<br><strong>Reason:</strong> ${reason}` : ""}
      </p>
    </div>

    <p style="font-size: 13px; color: #999; margin-top: 30px;">
      If you have any questions about this cancellation, please contact your manager.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated notification from your Worker Portal.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
${subject}

Hi ${workerName},

Your shift on ${format(shiftDate, "EEEE, dd MMMM yyyy")} has been cancelled.

Shift: ${shiftTitle}
Date: ${format(shiftDate, "EEEE, dd MMMM yyyy")}
Time: ${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}
${reason ? `Reason: ${reason}` : ""}

If you have any questions about this cancellation, please contact your manager.

This is an automated notification from your Worker Portal.
  `;

  return sendEmail({
    to: workerEmail,
    subject,
    html,
    text,
  });
}
