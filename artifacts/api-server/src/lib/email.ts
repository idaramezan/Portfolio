const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_BATCH_ENDPOINT = "https://api.resend.com/emails/batch";
const OWNER_EMAIL = "idaramezan@gmail.com";
const CONTACT_EMAIL = "aida@aedaart.com";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export { CONTACT_EMAIL, escapeHtml, OWNER_EMAIL };

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = "Aida <Aida@aedaart.com>";
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
      text: input.text,
      reply_to: input.replyTo || process.env.RESEND_REPLY_TO || CONTACT_EMAIL,
      headers: input.headers,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Resend rejected the email (${response.status}): ${detail}`,
    );
  }
  return response.json();
}

export async function sendEmailBatch(
  messages: SendEmailInput[],
  idempotencyKey: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = "Aida <Aida@aedaart.com>";
  if (!apiKey) throw new Error("RESEND_API_KEY must be configured");
  if (!messages.length || messages.length > 100)
    throw new Error("A Resend batch must contain between 1 and 100 emails");
  const response = await fetch(RESEND_BATCH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(
      messages.map((message) => ({
        from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to:
          message.replyTo || process.env.RESEND_REPLY_TO || CONTACT_EMAIL,
        headers: message.headers,
      })),
    ),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Resend rejected the email batch (${response.status}): ${detail}`,
    );
  }
  return response.json();
}

export function emailShell(
  content: string,
  options: {
    preheader?: string;
    unsubscribeUrl?: string;
    headerLabel?: string;
    footerNote?: string;
    showSignature?: boolean;
  } = {},
) {
  const siteUrl = (
    process.env.PUBLIC_SITE_URL || "https://www.aedaart.com"
  ).replace(/\/$/, "");
  const handwriting =
    "'Segoe Print','Bradley Hand','Comic Sans MS','Chalkboard SE',cursive";
  const unsubscribe = options.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:11px;color:#756f67"><a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#756f67;text-decoration:underline">Unsubscribe from the Studio Letter</a></p>`
    : "";
  const signature =
    options.showSignature === false
      ? ""
      : `<img src="${siteUrl}/assets/aida-email-seal.png" width="120" alt="Aida's artist seal" style="display:block;width:120px;max-width:42%;height:auto;margin:0 auto 10px"><p style="margin:0;color:#37332f;font-family:${handwriting};font-size:28px;line-height:1.4;font-style:italic">XOXO, Aida</p>`;
  const footerNote = options.footerNote
    ? `<p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#756f67">${escapeHtml(options.footerNote)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f0e6d8;color:#1b1917;font-family:${handwriting}"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(options.preheader || "A note from Aida's studio")}</div><div style="max-width:600px;margin:0 auto;padding:24px 12px"><div style="background:#fff9f2;border:1px solid #d9d0c3;box-shadow:0 8px 24px rgba(65,49,31,.12);padding:38px 30px;font-family:${handwriting}"><p style="display:inline-block;margin:0 0 26px;padding:7px 10px;background:#efcad8;color:#1b1917;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${escapeHtml(options.headerLabel || "Aida Ramezani · Artist")}</p>${content}<div style="margin-top:38px;padding-top:25px;border-top:1px dashed #beb3a4;text-align:center">${signature}<p style="margin:9px 0 0;font-size:13px"><a href="mailto:${CONTACT_EMAIL}" style="color:#a94468;text-decoration:none">${CONTACT_EMAIL}</a></p>${footerNote}${unsubscribe}</div></div></div></body></html>`;
}
