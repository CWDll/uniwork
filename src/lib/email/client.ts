type SendEmailInput = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

type SendEmailResult =
  | { id?: string; skipped?: false }
  | { reason: string; skipped: true };

function getEmailFrom() {
  return process.env.EMAIL_FROM || "Uniwork <notifications@uniwork.local>";
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({
  html,
  subject,
  text,
  to,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getEmailFrom();

  if (!apiKey || !process.env.EMAIL_FROM) {
    console.info(`Email skipped: missing RESEND_API_KEY or EMAIL_FROM (${subject})`);

    return { reason: "missing_email_env", skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html,
      subject,
      text,
      to: [to],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const result = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    id?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      result?.error?.message ||
        `Resend email request failed with HTTP ${response.status}`,
    );
  }

  return { id: result?.id, skipped: false };
}
