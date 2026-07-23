import { createContext, useContext, useEffect, useState } from "react";
import { marketFromPath, type CurrencyCode, type Market } from "@/lib/market";

export interface CurrencyState {
  market: Market;
  currency: CurrencyCode;
  rate: string | null;
  rateDate: string | null;
  isFallback: boolean;
  loading: boolean;
}

const Ctx = createContext<CurrencyState | null>(null);
const MANUAL_RATE_KEY = "aida-usd-try-manual-rate-v1";

export type ManualRate = { rate: number; rateDate: string };
export function getManualCurrencyRate(): ManualRate | null {
  try {
    const value = JSON.parse(localStorage.getItem(MANUAL_RATE_KEY) || "null");
    return Number.isFinite(Number(value?.rate)) && Number(value.rate) > 0
      ? { rate: Number(value.rate), rateDate: String(value.rateDate || "") }
      : null;
  } catch { return null; }
}
export function saveManualCurrencyRate(rate: number) {
  const rateDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  localStorage.setItem(MANUAL_RATE_KEY, JSON.stringify({ rate, rateDate }));
}
export function clearManualCurrencyRate() { localStorage.removeItem(MANUAL_RATE_KEY); }

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarket] = useState<Market>(() => marketFromPath());
  const [rate, setRate] = useState<string | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [isFallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setMarket(marketFromPath());
    window.addEventListener("popstate", sync);
    window.addEventListener("shop-region:updated", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("shop-region:updated", sync);
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setLoading(true);
    const manual = getManualCurrencyRate();
    if (manual) {
      setRate(String(manual.rate));
      setRateDate(manual.rateDate);
      setFallback(false);
      setLoading(false);
      return;
    }
    fetch("/api/exchange-rates/USD/TRY")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(async (data) => {
        if (!Number.isFinite(Number(data.rate)) || Number(data.rate) <= 0)
          throw new Error("Invalid exchange rate");
        setRate(String(data.rate));
        setRateDate(data.rateDate || null);
        setFallback(Boolean(data.isFallback));
        const { migrateLegacyTryPricing } = await import("@/lib/pricing-migration");
        migrateLegacyTryPricing(Number(data.rate), String(data.rateDate || ""));
      })
      .catch(() => setRate(null))
      .finally(() => setLoading(false));
    };
    refresh();
    window.addEventListener("currency-rate:updated", refresh);
    return () => window.removeEventListener("currency-rate:updated", refresh);
  }, []);

  return (
    <Ctx.Provider
      value={{
        market,
        currency: market === "turkiye" ? "TRY" : "USD",
        rate,
        rateDate,
        isFallback,
        loading,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCurrency() {
  const value = useContext(Ctx);
  if (!value) throw new Error("CurrencyProvider missing");
  return value;
}

export function convertUsdCentsToTry(amount: number, rate: string | number) {
  const scaled = Math.round(Number(rate) * 1_000_000);
  return Math.round((amount * scaled) / 1_000_000);
}

export function formatCurrencyMinor(amountMinor: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "TRY" ? 0 : 2,
  }).format(amountMinor / 100);
}

export function formatMoney(
  amountMinor: number,
  canonicalCurrency: CurrencyCode,
  marketCurrency: CurrencyCode,
  rate: string | null,
) {
  if (canonicalCurrency === marketCurrency)
    return formatCurrencyMinor(amountMinor, canonicalCurrency);
  if (canonicalCurrency === "USD" && marketCurrency === "TRY" && rate)
    return formatCurrencyMinor(convertUsdCentsToTry(amountMinor, rate), "TRY");
  return "";
}
