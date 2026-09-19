import { useEffect, useRef, useState } from "react";
import { Check, PackageCheck, X } from "lucide-react";
import Money from "@/components/Money";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useLocale } from "@/lib/locale";
import { getCanonicalCartItemPricing, loadCart } from "@/lib/store";
import { TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR } from "@/lib/turkiye-products";

export default function ShippingProgressTracker({ region }: { region: "TR" | "INTERNATIONAL" }) {
  const settings = useShopSettings();
  const { locale } = useLocale();
  const [cart, setCart] = useState(() => loadCart(region));
  const [celebrating, setCelebrating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const subtotal = cart.reduce((sum, item) => {
    const unitPrice = getCanonicalCartItemPricing(item, settings)?.unitPriceCents ?? item.priceUsdCents;
    return sum + unitPrice * item.quantity;
  }, 0);
  const unlocked = subtotal >= TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR;
  const wasUnlocked = useRef(unlocked);

  useEffect(() => {
    const sync = () => setCart(loadCart(region));
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, [region]);

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
  const remaining = Math.max(0, TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR - subtotal);
  const progress = Math.min(100, (subtotal / TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR) * 100);
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
            {!unlocked && (
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
            aria-valuenow={Math.min(subtotal, TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="shipping-progress-strip__goal">1.500 TL</span>
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
          <span>{locale === "tr" ? "Bu siparişin kargosu bizden." : "Shipping is on us for this order."}</span>
        </div>
      )}
    </>
  );
}
