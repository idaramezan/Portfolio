import { useEffect, useRef, useState } from "react";
import { Check, PackageCheck, X } from "lucide-react";
import Money from "@/components/Money";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useLocale } from "@/lib/locale";
import { getCanonicalCartItemPricing, loadCart } from "@/lib/store";
import {
  calculateTurkiyeShippingSummary,
  TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR,
} from "@/lib/turkiye-products";
import {
  checkoutItems,
  loadAppliedDiscountCode,
} from "@/lib/checkout-cart";

export default function ShippingProgressTracker({ region }: { region: "TR" | "INTERNATIONAL" }) {
  const settings = useShopSettings();
  const { locale } = useLocale();
  const [cart, setCart] = useState(() => loadCart(region));
  const [celebrating, setCelebrating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [quotedMerchandiseTotal, setQuotedMerchandiseTotal] = useState<number | null>(null);
  const [discountVersion, setDiscountVersion] = useState(0);
  const canonicalSubtotal = cart.reduce((sum, item) => {
    const unitPrice = getCanonicalCartItemPricing(item, settings)?.unitPriceCents ?? item.priceUsdCents;
    return sum + unitPrice * item.quantity;
  }, 0);
  const shipping = calculateTurkiyeShippingSummary(
    quotedMerchandiseTotal ?? canonicalSubtotal,
  );
  const unlocked = shipping.freeShippingUnlocked;
  const wasUnlocked = useRef(unlocked);

  useEffect(() => {
    const sync = () => setCart(loadCart(region));
    const syncDiscount = () => setDiscountVersion((value) => value + 1);
    window.addEventListener("cart:updated", sync);
    window.addEventListener("discount-code:updated", syncDiscount);
    return () => {
      window.removeEventListener("cart:updated", sync);
      window.removeEventListener("discount-code:updated", syncDiscount);
    };
  }, [region]);

  useEffect(() => {
    if (region !== "TR" || !cart.length) {
      setQuotedMerchandiseTotal(null);
      return;
    }
    const controller = new AbortController();
    void fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        market: "turkiye",
        items: checkoutItems(cart),
        discountCode: loadAppliedDiscountCode() || undefined,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setQuotedMerchandiseTotal(
          Number.isInteger(result.merchandiseTotalMinor)
            ? result.merchandiseTotalMinor
            : null,
        );
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setQuotedMerchandiseTotal(null);
      });
    return () => controller.abort();
  }, [region, discountVersion, JSON.stringify(checkoutItems(cart))]);

  useEffect(() => {
    if (unlocked && !wasUnlocked.current) setCelebrating(true);
    wasUnlocked.current = unlocked;
  }, [unlocked]);

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 4200);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  useEffect(() => {
    if (cart.length === 0) setDismissed(false);
  }, [cart.length]);

  if (region !== "TR" || cart.length === 0) return null;
  const remaining = shipping.remainingMinor;
  const progress = shipping.progressPercent;
  const status = unlocked
    ? locale === "tr" ? "Ücretsiz kargo kazandın" : "Free shipping unlocked"
    : locale === "tr" ? "Ücretsiz kargoya yaklaşıyorsun" : "You're close to free shipping";

  return (
    <>
      {!dismissed && <section className="shipping-progress-strip" aria-label={status}>
        <div className="shipping-progress-strip__inner">
          <PackageCheck size={18} aria-hidden="true" />
          <div className="shipping-progress-strip__copy">
            <strong>{status}</strong>
            {unlocked ? (
              <span>{locale === "tr" ? "Kargoda 50 TL tasarruf ettiniz." : "You saved 50 TL on delivery."}</span>
            ) : (
              <span>
                <Money baseAmountUsdCents={remaining} canonicalCurrency="TRY" />{" "}
                {locale === "tr" ? "daha ekle" : "to go"}
              </span>
            )}
          </div>
          <div
            className="shipping-progress-strip__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR}
            aria-valuenow={Math.min(shipping.merchandiseTotalMinor, TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="shipping-progress-strip__goal">
            {unlocked
              ? locale === "tr" ? "1.500 TL ve üzeri ücretsiz kargo" : "Free shipping from 1,500 TL"
              : locale === "tr" ? "50 TL kargo · 1.500 TL üzeri ücretsiz" : "50 TL shipping · Free from 1,500 TL"}
          </span>
          <button
            type="button"
            className="shipping-progress-strip__close"
            onClick={() => setDismissed(true)}
            aria-label={locale === "tr" ? "Kargo ilerlemesini kapat" : "Close shipping progress"}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      </section>}
      {celebrating && (
        <div className="free-shipping-celebration" role="dialog" aria-modal="true" aria-labelledby="free-shipping-title">
          <button type="button" aria-label={locale === "tr" ? "Kapat" : "Close"} onClick={() => setCelebrating(false)}>
            <X size={18} />
          </button>
          <div className="free-shipping-celebration__burst" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
          </div>
          <span className="free-shipping-celebration__icon"><Check size={30} /></span>
          <p>{locale === "tr" ? "HARİKA!" : "WONDERFUL!"}</p>
          <h2 id="free-shipping-title">{locale === "tr" ? "Ücretsiz kargo kazandın" : "Free shipping unlocked"}</h2>
          <span>{locale === "tr" ? "Kargoda 50 TL tasarruf ettiniz." : "You saved 50 TL on delivery."}</span>
        </div>
      )}
    </>
  );
}
