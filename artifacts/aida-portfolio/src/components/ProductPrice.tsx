import Money from "@/components/Money";
import type { CurrencyCode } from "@/lib/market";
import type { ProductSale } from "@/lib/store";
import { calculateProductSale } from "@/lib/product-sale";
import { useLocale } from "@/lib/locale";

export default function ProductPrice({
  regularPriceMinor,
  currency,
  sale,
  compact = false,
}: {
  regularPriceMinor: number;
  currency: CurrencyCode;
  sale?: ProductSale;
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const pricing = calculateProductSale(regularPriceMinor, sale);
  if (pricing.status !== "active")
    return (
      <Money
        baseAmountUsdCents={regularPriceMinor}
        canonicalCurrency={currency}
      />
    );
  const off =
    locale === "tr"
      ? `%${pricing.percentage} indirim`
      : `${pricing.percentage}% off`;
  return (
    <span
      className={`product-sale-price ${compact ? "product-sale-price--compact" : ""}`}
      aria-label={`${locale === "tr" ? "İndirimli fiyat" : "Sale price"} ${pricing.finalPriceMinor / 100} ${currency}. ${locale === "tr" ? "Normal fiyat" : "Original price"} ${pricing.regularPriceMinor / 100} ${currency}. ${off}.`}
    >
      <strong>
        <Money
          baseAmountUsdCents={pricing.finalPriceMinor}
          canonicalCurrency={currency}
        />
      </strong>
      <span>
        <del>
          <Money
            baseAmountUsdCents={pricing.regularPriceMinor}
            canonicalCurrency={currency}
          />
        </del>{" "}
        · {off}
      </span>
    </span>
  );
}
