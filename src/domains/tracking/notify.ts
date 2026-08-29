import type { EmailContent } from "./digest";

interface ResendConfig {
  apiKey: string;
  from: string;
  to: string;
}

function getConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_EMAIL_FROM;
  const to = process.env.ALERT_EMAIL_TO;
  if (!(apiKey && from && to)) {
    return null;
  }
  return { apiKey, from, to };
}

export type AlertSendResult = "sent" | "skipped" | "failed";

/**
 * Send an email via the Resend REST API. Content (subject/text/html) is built
 * by the pure helpers in digest.ts.
 * - "skipped": RESEND_API_KEY / ALERT_EMAIL_FROM / ALERT_EMAIL_TO not set, so
 *   alerts are disabled (the cron still records prices). Not an error.
 * - "failed": configured but the Resend request errored.
 * - "sent": delivered to Resend.
 */
export async function sendEmail(
  content: EmailContent
): Promise<AlertSendResult> {
  const config = getConfig();
  if (!config) {
    return "skipped";
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: config.to,
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
