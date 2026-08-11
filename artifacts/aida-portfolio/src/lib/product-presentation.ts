import type { ManagedProduct } from "@/lib/store";
import type { ShippingDestination } from "@/lib/shipping-destination";
import type { CurrencyCode } from "@/lib/market";
import { isSoldOut } from "@/lib/product-status";

export type FulfillmentType =
  "local" | "fourthwall" | "original_request" | "unavailable";

export type ProductPresentation = {
  destinationCountry: string | null;
  currency: CurrencyCode | null;
  amountMinor: number | null;
  externalPrice: string | null;
  fulfillmentType: FulfillmentType;
  availability: "available" | "sold" | "unavailable" | "loading";
  shippingMessage: string;
  primaryCTA: string;
  externalUrl: string | null;
};

type LinkedProduct = {
  externalUrl?: string;
  available?: boolean;
  price?: { formatted?: string };
};

export function resolveProductPresentation(
  product: ManagedProduct,
  destination: ShippingDestination | null,
  linked?: LinkedProduct,
  fallbackUrl?: string,
): ProductPresentation {
  const original = product.kind === "original";
  const sold = isSoldOut(product);
  const country = destination?.countryCode || null;
  const externalUrl = linked?.externalUrl || fallbackUrl || null;
  if (sold)
    return {
      destinationCountry: country,
      currency: null,
      amountMinor: null,
      externalPrice: null,
      fulfillmentType: "unavailable",
      availability: "sold",
      shippingMessage: "Sold",
      primaryCTA: "View piece",
      externalUrl,
    };
  if (!destination)
    return {
      destinationCountry: null,
      currency: null,
      amountMinor: null,
      externalPrice: null,
      fulfillmentType: "unavailable",
      availability: "loading",
      shippingMessage: "Checking delivery options",
      primaryCTA: "View piece",
      externalUrl,
    };
  if (country === "TR")
    return {
      destinationCountry: country,
      currency: original ? "USD" : "TRY",
      amountMinor: product.priceMinor ?? product.priceUsdCents,
      externalPrice: null,
      fulfillmentType: "local",
      availability: "available",
      shippingMessage: original
        ? "Free delivery within Türkiye"
        : "Prepared in Aida's studio",
      primaryCTA: original ? "View artwork" : "See options",
      externalUrl: null,
    };
  if (original)
    return {
      destinationCountry: country,
      currency: "USD",
      amountMinor: product.priceUsdCents,
      externalPrice: null,
      fulfillmentType: country === "US" ? "unavailable" : "original_request",
      availability: country === "US" ? "unavailable" : "available",
      shippingMessage:
        country === "US"
          ? "Not available for US delivery"
          : "Delivery available by request",
      primaryCTA: country === "US" ? "View artwork" : "Request delivery",
      externalUrl,
    };
  const available = Boolean(
    externalUrl && (linked ? linked.available !== false : true),
  );
  return {
    destinationCountry: country,
    currency: null,
    amountMinor: null,
    externalPrice: available ? linked?.price?.formatted || null : null,
    fulfillmentType: available ? "fourthwall" : "unavailable",
    availability: available ? "available" : "unavailable",
    shippingMessage: available
      ? "Fulfilled through Aida's print partner"
      : "Not available for this destination yet",
    primaryCTA: available ? "Get this print" : "View piece",
    externalUrl: available ? externalUrl : null,
  };
}
