import { recordAuditEvent } from "./observability";

type EmailMessage = {
  html?: string;
  subject: string;
  text: string;
  to: string;
};

const defaultFrom = "Mesh <notifications@mesh.local>";

export async function sendEmail(message: EmailMessage) {
  const from = process.env.MESH_EMAIL_FROM ?? defaultFrom;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("Mesh email notification", {
      from,
      subject: message.subject,
      text: message.text,
      to: message.to,
    });
    await recordAuditEvent({
      metadata: {
        provider: "console",
        subject: message.subject,
        to: message.to,
      },
      type: "email.logged",
    });
    return { delivered: false, provider: "console" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: message.html,
      subject: message.subject,
      text: message.text,
      to: message.to,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Email provider failed with ${response.status}`);
  }

  await recordAuditEvent({
    metadata: {
      provider: "resend",
      subject: message.subject,
      to: message.to,
    },
    type: "email.sent",
  });

  return { delivered: true, provider: "resend" as const };
}

export async function notifySupport(subject: string, text: string) {
  const to =
    process.env.MESH_SUPPORT_EMAIL ??
    process.env.NEXT_PUBLIC_MESH_SUPPORT_EMAIL ??
    "";

  if (!to) {
    await recordAuditEvent({
      metadata: { subject },
      type: "support.notification_missing",
    });
    return;
  }

  await sendEmail({ subject, text, to });
}
