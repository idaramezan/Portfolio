const RESEND_ENDPOINT = "https://api.resend.com/emails";
const OWNER_EMAIL = "idaramezan@gmail.com";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export { escapeHtml, OWNER_EMAIL };

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "Aida <Aida@aedaart.com>";
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be configured");
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo || process.env.RESEND_REPLY_TO || OWNER_EMAIL,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the email (${response.status}): ${detail}`);
  }
  return response.json();
}

export function emailShell(content: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3efe6;color:#25231f;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">A note from Aida's studio</div><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:#fffaf1;border:1px solid #ded5c6;padding:38px 32px"><p style="margin:0 0 24px;color:#d75f4a;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Aida Ramezani · Artist</p>${content}<div style="margin-top:34px;padding-top:22px;border-top:1px solid #ded5c6;color:#6b665e;font-size:13px;line-height:1.6">With warmth from the studio,<br><strong style="color:#25231f">Aida</strong><br><a href="mailto:${OWNER_EMAIL}" style="color:#d75f4a">${OWNER_EMAIL}</a></div></div></div></body></html>`;
}
