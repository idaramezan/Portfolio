import { formatCurrencyMinor, formatMoney, useCurrency } from "@/lib/currency";
import type { CurrencyCode } from "@/lib/market";
import { useLocale } from "@/lib/locale";
export default function Money({
  baseAmountUsdCents,
  showBase = false,
  className = "",
  canonicalCurrency = "USD",
}: {
  baseAmountUsdCents: number;
  showBase?: boolean;
  className?: string;
  canonicalCurrency?: CurrencyCode;
}) {
  const { currency, rate, loading } = useCurrency();
  const { locale } = useLocale();
  const formatted = formatMoney(
    baseAmountUsdCents,
    canonicalCurrency,
    currency,
    rate,
    locale,
  );
  if (!formatted && canonicalCurrency === "USD" && currency === "TRY")
    return (
      <span
        className={`${className} inline-block min-h-6 min-w-24 text-sm text-ink/45`}
      >
        {loading
          ? "Loading Türkiye price…"
          : "Türkiye price temporarily unavailable"}
      </span>
    );
  return (
    <span className={className} aria-label={formatted}>
      {formatted}
      {showBase && canonicalCurrency === "USD" && currency === "TRY" && (
        <small className="block text-xs font-normal text-ink/55">
          {formatCurrencyMinor(baseAmountUsdCents, "USD", locale)} USD base
          price
        </small>
      )}
    </span>
  );
}
