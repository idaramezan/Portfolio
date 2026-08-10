export type StudioLetterContext =
  | "home"
  | "turkiye"
  | "international"
  | "mystery-mail"
  | "newsletter"
  | "studio-letter"
  | "hundred-windows"
  | "footer";

export const NEWSLETTER_SOURCE: Record<StudioLetterContext, string> = {
  home: "homepage",
  turkiye: "turkiye-shop",
  international: "international-shop",
  "mystery-mail": "mystery-mail",
  newsletter: "newsletter-page",
  "studio-letter": "studio-letter-page",
  "hundred-windows": "100_windows",
  footer: "footer",
};

export function normalizeNewsletterEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidNewsletterEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeNewsletterEmail(value));
}
