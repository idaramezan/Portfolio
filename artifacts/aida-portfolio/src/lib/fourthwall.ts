export interface InternationalProduct {
  id: string;
  slug: string;
  name: string;
  description?: string;
  primaryImage?: { url: string; width?: number; height?: number; alt: string };
  images: { url: string; width?: number; height?: number; alt: string }[];
  price: { amount: number; currency: string; formatted: string };
  available: boolean;
  soldOut: boolean;
  variants: {
    id: string;
    name: string;
    available: boolean;
    price: { amount: number; currency: string; formatted: string };
  }[];
  externalUrl: string;
}
export interface InternationalResponse {
  enabled: boolean;
  products: InternationalProduct[];
  fetchedAt?: string;
  collection?: string;
  shopUrl: string | null;
  stale?: boolean;
  message?: string;
}
export async function getInternationalProducts(
  signal?: AbortSignal,
): Promise<InternationalResponse> {
  const response = await fetch("/api/international", { signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error("International collection unavailable"), {
      fallback: data,
    });
  if (!Array.isArray(data.products))
    throw new Error("Invalid international product response");
  return data;
}
export function isSafeFourthwallUrl(value: string, shopUrl: string | null) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (!shopUrl) return false;
    return url.hostname === new URL(shopUrl).hostname;
  } catch {
    return false;
  }
}
