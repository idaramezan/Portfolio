import { loadShopSettings, saveShopSettings } from "@/lib/store";

const BACKUP_KEY = "aida-pricing-before-try-migration-v1";

export function migrateLegacyTryPricing(rate: number, rateDate: string) {
  if (!Number.isFinite(rate) || rate <= 0) return;
  const settings = loadShopSettings();
  const legacyPrints = settings.printProducts.some(
    (product) => product.priceCurrency !== "TRY",
  );
  const legacyMail = settings.studioMailPackages.some(
    (product) => product.priceCurrency !== "TRY",
  );
  if (!legacyPrints && !legacyMail) return;
  if (!localStorage.getItem(BACKUP_KEY)) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(settings));
    } catch {
      console.warn("Pricing migration paused because a safety backup could not be stored.");
      return;
    }
  }
  const convertedAt = rateDate || new Date().toISOString().slice(0, 10);
  const convert = (minor: number) => Math.round(minor * rate);
  settings.printProducts = settings.printProducts.map((product) => {
    if (product.priceCurrency === "TRY") return product;
    const previous = product.priceMinor ?? product.priceUsdCents;
    const next = convert(previous);
    return {
      ...product,
      priceCurrency: "TRY",
      priceMinor: next,
      priceUsdCents: next,
      pricingMigrationReviewed: false,
      pricingMigration: {
        previousAmountMinor: previous,
        previousCurrency: "USD",
        appliedConversionRate: rate,
        conversionDate: convertedAt,
        newAmountMinor: next,
      },
      printOptions: product.printOptions
        ? {
            ...product.printOptions,
            sizes: product.printOptions.sizes.map((size) => ({
              ...size,
              additionalPriceUsdCents: convert(size.additionalPriceUsdCents),
            })),
            framing: {
              ...product.printOptions.framing,
              frameAdditionalPriceUsdCents: convert(
                product.printOptions.framing.frameAdditionalPriceUsdCents,
              ),
            },
          }
        : undefined,
    };
  });
  settings.studioMailPackages = settings.studioMailPackages.map((product) => {
    if (product.priceCurrency === "TRY") return product;
    const previous = product.priceMinor ?? product.priceUsdCents;
    const next = convert(previous);
    return {
      ...product,
      priceCurrency: "TRY",
      priceMinor: next,
      priceUsdCents: next,
      pricingMigrationReviewed: false,
      pricingMigration: {
        previousAmountMinor: previous,
        previousCurrency: "USD",
        appliedConversionRate: rate,
        conversionDate: convertedAt,
        newAmountMinor: next,
      },
    };
  });
  saveShopSettings(settings);
}
