import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useLocale } from "@/lib/locale";
import { trackAnalytics } from "@/lib/analytics";
import {
  getFourthwallCheckoutUrl,
  loadFourthwallCart,
  removeFourthwallCartItem,
  updateFourthwallCartItem,
  validateFourthwallCart,
} from "@/lib/fourthwall-cart";

const copy = {
  en: {
    label: "PRINTS & MERCH",
    remove: "Remove",
    subtotal: "Subtotal",
    shipping: "Shipping",
    taxes: "Taxes",
    calculated: "Calculated at checkout",
    total: "Total before shipping and taxes",
    checkout: "CONTINUE TO PAYMENT →",
    note: "Secure checkout, shipping and taxes are handled at the next step.",
    separate:
      "Studio pieces and animation merch are fulfilled separately and require separate checkout.",
    updateError:
      "Couldn't update the quantity. Your previous quantity has been restored.",
    checkoutError: "Checkout is temporarily unavailable. Please try again.",
  },
  tr: {
    label: "BASKILAR & ÜRÜNLER",
    remove: "Kaldır",
    subtotal: "Ara toplam",
    shipping: "Kargo",
    taxes: "Vergiler",
    calculated: "Ödeme adımında hesaplanır",
    total: "Kargo ve vergi öncesi toplam",
    checkout: "ÖDEMEYE DEVAM ET →",
    note: "Güvenli ödeme, kargo ve vergiler bir sonraki adımda tamamlanır.",
    separate:
      "Atölye ürünleri ve animasyon ürünleri ayrı gönderilir ve ayrı ödeme gerektirir.",
    updateError: "Adet güncellenemedi. Önceki adet geri yüklendi.",
    checkoutError: "Ödeme şu anda kullanılamıyor. Lütfen tekrar dene.",
  },
} as const;

function price(amountMinor: number, currency: string, locale: "en" | "tr") {
  try {
    return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

export default function FourthwallBasket({
  open,
  hasLocalItems = false,
}: {
  open: boolean;
  hasLocalItems?: boolean;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [cart, setCart] = useState(loadFourthwallCart);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => setCart(loadFourthwallCart());
    window.addEventListener("fourthwall-cart:updated", sync);
    return () => window.removeEventListener("fourthwall-cart:updated", sync);
  }, []);
  useEffect(() => {
    if (!open || !cart.cartId) return;
    void validateFourthwallCart().catch((reason) =>
      setError(reason instanceof Error ? reason.message : text.updateError),
    );
    trackAnalytics("basket_opened", { metadata: { basketType: "fourthwall" } });
  }, [open]);
  if (!cart.items.length) return null;
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.unitAmountMinor * item.quantity,
    0,
  );
  const update = async (variantId: string, quantity: number) => {
    setBusy(variantId);
    setError("");
    try {
      await updateFourthwallCartItem(variantId, quantity);
    } catch {
      setError(text.updateError);
    } finally {
      setBusy("");
    }
  };
  const remove = async (variantId: string) => {
    setBusy(variantId);
    setError("");
    try {
      await removeFourthwallCartItem(variantId);
      trackAnalytics("remove_from_basket", {
        metadata: { productType: "fourthwall", variantId },
      });
    } catch {
      setError(text.updateError);
    } finally {
      setBusy("");
    }
  };
  const checkout = async () => {
    setBusy("checkout");
    setError("");
    try {
      const url = await getFourthwallCheckoutUrl();
      trackAnalytics("checkout_started", {
        metadata: {
          basketType: "fourthwall",
          quantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
          currency: cart.currency,
          subtotal,
        },
      });
      window.location.assign(url);
    } catch {
      setError(text.checkoutError);
      setBusy("");
    }
  };
  return (
    <section className="fourthwall-basket">
      <p className="eyebrow">{text.label}</p>
      {hasLocalItems && (
        <p className="fourthwall-basket__separate">{text.separate}</p>
      )}
      <div>
        {cart.items.map((item) => (
          <article key={item.variantId} className="fourthwall-basket__item">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" />
            ) : (
              <div aria-hidden="true" />
            )}
            <div>
              <h3>{item.title}</h3>
              <p>
                {item.format}
                {item.variantName && item.variantName !== "Standard"
                  ? ` · ${item.variantName}`
                  : ""}
              </p>
              <strong>
                {price(item.unitAmountMinor, item.currency, locale)}
              </strong>
              <div className="fourthwall-basket__quantity">
                <button
                  type="button"
                  disabled={busy === item.variantId || item.quantity <= 1}
                  onClick={() => void update(item.variantId, item.quantity - 1)}
                  aria-label={`Decrease ${item.title} quantity`}
                >
                  <Minus size={15} />
                </button>
                <span aria-live="polite">{item.quantity}</span>
                <button
                  type="button"
                  disabled={busy === item.variantId || item.quantity >= 99}
                  onClick={() => void update(item.variantId, item.quantity + 1)}
                  aria-label={`Increase ${item.title} quantity`}
                >
                  <Plus size={15} />
                </button>
              </div>
              <button
                type="button"
                className="fourthwall-basket__remove"
                disabled={busy === item.variantId}
                onClick={() => void remove(item.variantId)}
              >
                {text.remove}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="fourthwall-basket__summary">
        <p className="eyebrow">
          {locale === "tr" ? "SİPARİŞ ÖZETİ" : "ORDER SUMMARY"}
        </p>
        <dl>
          <div>
            <dt>{text.subtotal}</dt>
            <dd>{price(subtotal, cart.currency, locale)}</dd>
          </div>
          <div>
            <dt>{text.shipping}</dt>
            <dd>{text.calculated}</dd>
          </div>
          <div>
            <dt>{text.taxes}</dt>
            <dd>{text.calculated}</dd>
          </div>
          <div className="fourthwall-basket__total">
            <dt>{text.total}</dt>
            <dd>{price(subtotal, cart.currency, locale)}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="button-primary"
          disabled={busy === "checkout"}
          onClick={() => void checkout()}
        >
          {text.checkout}
        </button>
        <p>{text.note}</p>
        {error && (
          <p role="alert" className="fourthwall-basket__error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
