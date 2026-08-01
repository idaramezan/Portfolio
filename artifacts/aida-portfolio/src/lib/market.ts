export type Market = "turkiye" | "international";
export type CurrencyCode = "USD" | "TRY";

export const MARKET_CONFIG = {
  turkiye: {
    currency: "TRY" as const,
    locale: "tr-TR",
    originalsRoute: "/shop/turkiye/originals",
    printsRoute: "/shop/turkiye/prints",
    basketRegion: "TR" as const,
    shipping: "Free shipping within Türkiye",
  },
  international: {
    currency: "USD" as const,
    locale: "en-US",
    originalsRoute: "/shop/international/originals",
    printsRoute: "/shop/international/prints",
    basketRegion: "INTERNATIONAL" as const,
    shipping: "International shipping calculated separately",
  },
} as const;

export function marketFromPath(pathname = window.location.pathname): Market {
  return pathname.startsWith("/shop/international") ||
    pathname.startsWith("/basket/international")
    ? "international"
    : "turkiye";
}

export function originalDetailHref(market: Market, slug: string) {
  return `${MARKET_CONFIG[market].originalsRoute}/${slug}`;
}

export function printDetailHref(market: Market, slug: string) {
  return `${MARKET_CONFIG[market].printsRoute}/${slug}`;
}
