import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const sendInvitationEmail = async ({
  to,
  inviterName,
  organizationName,
  invitationUrl,
  role,
  isSubaccount = false,
}: {
  to: string;
  inviterName: string;
  organizationName: string;
  invitationUrl: string;
  role?: string;
  isSubaccount?: boolean;
}) => {
  const fromEnv = process.env.RESEND_FROM_EMAIL || "noreply@aureacrm.com";
  const normalizedFrom = fromEnv.split("#")[0].trim();
  const subject = `You've been invited to join ${organizationName}`;
  const entityType = isSubaccount ? "client workspace" : "organization";
  const roleText = role ? ` as ${role}` : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to ${organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong>${roleText}.
    </p>

    <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
      You've been invited to collaborate in the ${entityType}. Click the button below to accept the invitation and get started.
    </p>

    <div style="text-align: center; margin: 35px 0;">
      <a href="${invitationUrl}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                font-size: 16px;
                display: inline-block;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 13px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>

    <p style="font-size: 12px; color: #999; margin-top: 10px;">
      Or copy and paste this link into your browser:<br>
      <span style="color: #667eea; word-break: break-all;">${invitationUrl}</span>
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>Sent by Aurea CRM</p>
  </div>
</body>
</html>
`;

  const text = `
You've been invited to join ${organizationName}

${inviterName} has invited you to join ${organizationName}${roleText}.

You've been invited to collaborate in the ${entityType}. Click the link below to accept the invitation:

${invitationUrl}

If you didn't expect this invitation, you can safely ignore this email.
`;

  try {
    const result = await resend.emails.send({
      from: normalizedFrom || "noreply@aureamedia.co.uk",
      to,
      subject,
      html,
      text,
    });

    return result;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw new Error("Failed to send invitation email");
  }
};
