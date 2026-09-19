import { useEffect, useState } from "react";
import { Check, Minus, PackageCheck, Plus, Ticket, X } from "lucide-react";
import { Link } from "wouter";
import {
  getCanonicalCartItemPricing,
  isCartItemAvailable,
  loadCart,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/store";
import Money from "@/components/Money";
import { cn } from "@/lib/utils";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useServerNow } from "@/hooks/use-server-now";
import { trackAnalytics } from "@/lib/analytics";
import {
  calculateTurkiyeOrderShipping,
  TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR,
} from "@/lib/turkiye-products";
import { useShippingDestination } from "@/lib/shipping-destination";
import { useLocale } from "@/lib/locale";
import {
  checkoutItems,
  loadAppliedDiscountCode,
  saveAppliedDiscountCode,
} from "@/lib/checkout-cart";

type DiscountQuote = {
  discountCode: string;
  discountPercent: number;
  discountAmountMinor: number;
  subtotalMinor: number;
  shippingMinor: number;
  grandTotalMinor: number;
};

const discountCopy = {
  en: {
    prompt: "Have a discount code?",
    label: "Discount code",
    placeholder: "Enter your code",
    apply: "Apply",
    checking: "Checking…",
    applied: "Code applied",
    off: "off your order",
    save: "You save",
    remove: "Remove",
    discount: "Discount",
    blank: "Enter a discount code first.",
    not_found: "That discount code isn't available.",
    inactive: "That discount code is no longer active.",
    expired: "That discount code has expired.",
    limit_reached: "That discount code has reached its usage limit.",
    not_turkiye:
      "Discount codes are currently available for Türkiye orders only.",
    network: "We couldn't check that code right now. Please try again.",
    shippingRemaining: "more for free shipping",
    shippingUnlocked: "You've unlocked free shipping.",
    shippingRule: "Flat 50 TL shipping · Free from 1,500 TL",
  },
  tr: {
    prompt: "İndirim kodun var mı?",
    label: "İndirim kodu",
    placeholder: "İndirim kodunu gir",
    apply: "Uygula",
    checking: "Kontrol ediliyor…",
    applied: "İndirim kodu uygulandı",
    off: "siparişinde indirim",
    save: "Kazancın",
    remove: "Kaldır",
    discount: "İndirim",
    blank: "Önce bir indirim kodu gir.",
    not_found: "Bu indirim kodu kullanılamıyor.",
    inactive: "Bu indirim kodu artık aktif değil.",
    expired: "Bu indirim kodunun süresi dolmuş.",
    limit_reached: "Bu indirim kodunun kullanım sınırına ulaşıldı.",
    not_turkiye:
      "İndirim kodları şu anda yalnızca Türkiye siparişlerinde kullanılabilir.",
    network: "Bu kodu şu anda kontrol edemedik. Lütfen tekrar dene.",
    shippingRemaining: "daha ekle, kargon ücretsiz olsun",
    shippingUnlocked: "Ücretsiz kargo kazandın.",
    shippingRule: "Sabit 50 TL kargo · 1.500 TL'den itibaren ücretsiz",
  },
} as const;
export default function CartDrawer({
  open,
  onOpenChange,
  region = "TR",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  region?: "TR" | "INTERNATIONAL";
}) {
  const [cart, setCart] = useState(loadCart(region));
  const settings = useShopSettings();
  const { destination, openDestination } = useShippingDestination();
  const { locale } = useLocale();
  const couponText = discountCopy[locale];
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<DiscountQuote | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const now = useServerNow();
  useEffect(() => {
    const sync = () => setCart(loadCart(region));
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, [region]);
  useEffect(() => {
    if (open) setCart(loadCart(region));
    if (open) trackAnalytics("basket_opened");
  }, [open, region]);
  const validateCoupon = async (code: string, quiet = false) => {
    if (!code.trim()) {
      if (!quiet) setCouponError(couponText.blank);
      return;
    }
    setCouponBusy(true);
    if (!quiet) setCouponError("");
    try {
      const response = await fetch("/api/checkout/discount/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          market: "turkiye",
          items: checkoutItems(cart),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const reason = result.reason as keyof typeof couponText;
        throw { couponError: couponText[reason] || couponText.network };
      }
      setCoupon(result);
      setCouponInput(result.discountCode);
      saveAppliedDiscountCode(result.discountCode);
      setCouponError("");
      setCouponOpen(true);
    } catch (error: any) {
      setCoupon(null);
      saveAppliedDiscountCode(null);
      setCouponError(error?.couponError || couponText.network);
    } finally {
      setCouponBusy(false);
    }
  };
  useEffect(() => {
    if (region !== "TR" || (destination && destination.countryCode !== "TR")) {
      setCoupon(null);
      setCouponInput("");
      saveAppliedDiscountCode(null);
      return;
    }
    const saved = loadAppliedDiscountCode();
    if (saved && cart.length) void validateCoupon(saved, true);
  }, [region, destination?.countryCode, JSON.stringify(checkoutItems(cart))]);
  const canonicalUnitPrice = (item: (typeof cart)[number]) =>
    getCanonicalCartItemPricing(item, settings)?.unitPriceCents ??
    item.priceUsdCents;
  const subtotal = cart.reduce(
    (total, item) =>
      total +
      (region === "INTERNATIONAL" && item.kind === "aceo"
        ? 0
        : canonicalUnitPrice(item) * item.quantity),
    0,
  );
  const basketCurrency = region === "TR" ? "TRY" : "USD";
  const shipping =
    region === "TR"
      ? calculateTurkiyeOrderShipping(subtotal)
      : cart.length
        ? 10_000
        : 0;
  const displayedSubtotal = coupon?.subtotalMinor ?? subtotal;
  const displayedShipping = coupon?.shippingMinor ?? shipping;
  const orderTotal = coupon?.grandTotalMinor ?? subtotal + shipping;
  const freeShippingRemaining = Math.max(
    0,
    TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR - displayedSubtotal,
  );
  const freeShippingProgress = Math.min(
    100,
    (displayedSubtotal / TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR) * 100,
  );
  const hasCatalogRecord = (item: (typeof cart)[number]) => {
    const baseId = item.id.split(":")[0];
    if (item.kind === "original")
      return settings.originalProducts.some(
        (product) => product.id === baseId.replace(/^original-/, ""),
      );
    if (item.kind === "aceo")
      return settings.printProducts.some(
        (product) =>
          product.category === "aceo" &&
          product.id === baseId.replace(/^aceo-/, ""),
      );
    if (item.kind === "studio-mail")
      return settings.studioMailPackages.some(
        (edition) => edition.id === baseId,
      );
    const productId = baseId
      .replace(/^print-product-/, "")
      .replace(/^product-/, "");
    return settings.printProducts.some((product) => product.id === productId);
  };
  const unavailableItems = cart.filter(
    (item) =>
      hasCatalogRecord(item) &&
      !isCartItemAvailable(item, settings, now, region),
  );
  const itemType = (item: (typeof cart)[number]) => {
    const labels = locale === "tr"
      ? { print: "İmzalı baskı", original: "Orijinal eser", aceo: "ACEO orijinal", product: "Sanat ürünü", "custom-palette": "Kişiye özel palet", "ready-palette": "Hazır palet", "mail-club": "Mail Club", "studio-mail": "Mystery Mail" }
      : { print: "Signed print", original: "Original artwork", aceo: "ACEO original", product: "Art good", "custom-palette": "Custom palette", "ready-palette": "Ready-made palette", "mail-club": "Mail Club", "studio-mail": "Mystery Mail" };
    return labels[item.kind] || item.subtitle || "";
  };
  return (
    <div
      className={cn(
        "fixed inset-0 z-[60]",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        aria-label="Close basket"
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 h-full w-full bg-ink/50 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        aria-label={`${region === "TR" ? "Türkiye" : "International originals"} collection basket`}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col border-l border-ink/10 bg-paper shadow-2xl transition-transform sm:w-[480px]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <div>
            <p className="eyebrow">
              {region === "TR" ? "Türkiye" : "International originals"}
            </p>
            <h2 className="text-3xl">Collection Basket</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="min-h-11 min-w-11"
            aria-label="Close basket"
          >
            <X className="mx-auto" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="eyebrow mb-4">{locale === "tr" ? "ÜRÜNLER" : "ITEMS"}</p>
          {cart.length === 0 ? (
            <p className="py-12 text-center text-ink/60">
              Your collection basket is waiting.
            </p>
          ) : (
            cart.map((x) => (
              <article
                key={x.id}
                className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 border-b border-ink/10 py-5 first:pt-0 sm:grid-cols-[96px_minmax(0,1fr)]"
              >
                {x.imageUrl ? (
                  <img
                    src={x.imageUrl}
                    alt=""
                    className="h-24 w-20 bg-ink/5 object-cover sm:w-24"
                  />
                ) : (
                  <div className="grid h-24 w-20 place-items-center bg-ink/5 font-serif text-2xl text-ink/25 sm:w-24" aria-hidden="true">
                    {x.title.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-xl leading-tight">{x.title}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[.12em] text-ink/50">{itemType(x)}</p>
                  {x.printConfiguration && (
                    <p className="mt-1 text-xs text-ink/55">
                      {x.printConfiguration.sizeLabel}
                      {x.printConfiguration.sizeSecondaryLabel
                        ? ` · ${x.printConfiguration.sizeSecondaryLabel}`
                        : ""}
                      {` · ${x.printConfiguration.framing === "framed" ? "Framed" : "Unframed"}`}
                    </p>
                  )}
                  {x.metadata?.paletteTypeName && <p className="mt-1 text-xs text-ink/55">{x.metadata.paletteTypeName}</p>}
                  {x.metadata?.selectedColorNames?.length ? <p className="mt-1 text-xs text-ink/55">{locale === "tr" ? "Renkler" : "Colours"}: {x.metadata.selectedColorNames.join(", ")}</p> : null}
                  {x.metadata?.editionMonth && <p className="mt-1 text-xs text-ink/55">{x.metadata.editionMonth}</p>}
                  <p className="mt-3 text-sm text-ink/60">
                    <Money baseAmountUsdCents={canonicalUnitPrice(x)} canonicalCurrency={x.canonicalCurrency || basketCurrency} className="font-semibold text-ink" /> {locale === "tr" ? "adet" : "each"}
                  </p>
                  {x.priceChanged && <p role="status" className="mt-2 text-xs font-semibold text-coral">{locale === "tr" ? `${x.title} ürününün fiyatı sepete eklendiğinden beri değişti.` : `The price of ${x.title} has changed since it was added to your bag.`}</p>}
                  {x.kind !== "original" && x.kind !== "aceo" && (
                    <div
                      className="mt-2 inline-flex items-center border border-ink/15"
                      aria-label={`Quantity for ${x.title}`}
                    >
                      <button
                        type="button"
                        className="grid min-h-11 min-w-11 place-items-center disabled:opacity-35"
                        onClick={() =>
                          updateCartItemQuantity(x.id, x.quantity - 1, region)
                        }
                        disabled={x.quantity <= 1}
                        aria-label={`Decrease ${x.title} quantity`}
                      >
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <span
                        className="min-w-10 text-center text-sm font-bold"
                        aria-live="polite"
                      >
                        {x.quantity}
                      </span>
                      <button
                        type="button"
                        className="grid min-h-11 min-w-11 place-items-center disabled:opacity-35"
                        onClick={() =>
                          updateCartItemQuantity(x.id, x.quantity + 1, region)
                        }
                        disabled={x.quantity >= (x.maxQuantity || 99)}
                        aria-label={`Increase ${x.title} quantity`}
                      >
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  {unavailableItems.some((item) => item.id === x.id) && (
                    <div role="alert" className="mt-2 text-sm font-semibold">
                      <p className="text-coral">
                        {x.kind === "aceo" && region === "INTERNATIONAL"
                          ? locale === "tr"
                            ? `Bu ACEO şu anda yalnızca Türkiye içindeki adreslere gönderilebilir. ${destination?.countryName || "Bu ülke"} için teslimata kapalıdır.`
                            : `This ACEO is currently available for delivery within Türkiye only. It is unavailable for delivery to ${destination?.countryName || "this country"}.`
                          : "This item is no longer available. Remove it before continuing."}
                      </p>
                      {x.kind === "aceo" && region === "INTERNATIONAL" && (
                        <button
                          type="button"
                          className="button-link mt-2"
                          onClick={() => openDestination()}
                        >
                          {locale === "tr"
                            ? "Gönderim ülkesini değiştir"
                            : "Change shipping country"}
                        </button>
                      )}
                    </div>
                  )}
                  {!(x.kind === "aceo" && region === "INTERNATIONAL") && (
                    <p className="mt-3 text-sm">
                      <span className="text-ink/55">{locale === "tr" ? "Ürün toplamı" : "Line total"}: </span>
                      <Money
                        baseAmountUsdCents={canonicalUnitPrice(x) * x.quantity}
                        canonicalCurrency={
                          x.canonicalCurrency || basketCurrency
                        }
                        className="font-bold"
                      />
                    </p>
                  )}
                  <button
                    onClick={() => removeCartItem(x.id, region)}
                    className="mt-3 min-h-8 text-sm font-semibold text-coral underline underline-offset-4"
                  >
                    {locale === "tr" ? "Kaldır" : "Remove"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <footer className="border-t border-ink/10 p-6">
          {region === "TR" && cart.length > 0 && (
            <div className="mb-5 border border-coral/30 bg-[#fff8ee] p-4 shadow-[2px_3px_0_rgba(116,47,74,.08)]">
              {coupon ? (
                <div role="status" aria-live="polite">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green/15">
                      <Check size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink/55">
                        {couponText.applied}
                      </p>
                      <strong className="mt-1 block break-words text-lg">
                        {coupon.discountCode} · {coupon.discountPercent}%
                      </strong>
                      <p className="mt-1 text-sm">
                        {coupon.discountPercent}% {couponText.off}.{" "}
                        {couponText.save}{" "}
                        <Money
                          baseAmountUsdCents={coupon.discountAmountMinor}
                          canonicalCurrency="TRY"
                          className="font-bold"
                        />
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button-link min-h-11 px-2 text-sm"
                      onClick={() => {
                        setCoupon(null);
                        setCouponInput("");
                        setCouponError("");
                        saveAppliedDiscountCode(null);
                      }}
                    >
                      {couponText.remove}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-bold"
                    onClick={() => setCouponOpen((value) => !value)}
                    aria-expanded={couponOpen}
                  >
                    <Ticket size={18} aria-hidden="true" />
                    {couponText.prompt}
                  </button>
                  {couponOpen && (
                    <form
                      className="mt-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void validateCoupon(couponInput);
                      }}
                    >
                      <label
                        htmlFor="basket-discount-code"
                        className="text-sm font-semibold"
                      >
                        {couponText.label}
                      </label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          id="basket-discount-code"
                          className="min-h-11 min-w-0 flex-1 border border-ink/20 bg-paper px-3 uppercase outline-none focus:border-coral"
                          value={couponInput}
                          onChange={(event) =>
                            setCouponInput(event.target.value)
                          }
                          placeholder={couponText.placeholder}
                          autoComplete="off"
                          aria-describedby="basket-discount-message"
                          aria-invalid={Boolean(couponError)}
                        />
                        <button
                          type="submit"
                          disabled={couponBusy}
                          className="button-secondary min-h-11 px-5 disabled:opacity-50"
                        >
                          {couponBusy ? couponText.checking : couponText.apply}
                        </button>
                      </div>
                      <p
                        id="basket-discount-message"
                        role={couponError ? "alert" : "status"}
                        className="mt-2 text-sm font-semibold text-coral"
                      >
                        {couponError}
                      </p>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
          <p className="eyebrow mb-3">Order summary</p>
          <div className="flex justify-between">
            <span>Products</span>
            <Money
              baseAmountUsdCents={displayedSubtotal}
              canonicalCurrency={basketCurrency}
              className="font-bold"
            />
          </div>
          <div className="mt-2 flex justify-between" aria-live="polite">
            <span>Shipping</span>
            <Money
              baseAmountUsdCents={displayedShipping}
              canonicalCurrency={basketCurrency}
              className="font-bold"
            />
          </div>
          {coupon && (
            <div className="mt-2 flex justify-between gap-3 text-coral">
              <span>
                {couponText.discount} · {coupon.discountCode} ·{" "}
                {coupon.discountPercent}%
              </span>
              <strong>
                −
                <Money
                  baseAmountUsdCents={coupon.discountAmountMinor}
                  canonicalCurrency="TRY"
                />
              </strong>
            </div>
          )}
          <div className="mt-3 flex justify-between border-t border-ink/15 pt-3 text-lg">
            <strong>Total</strong>
            <Money
              baseAmountUsdCents={orderTotal}
              canonicalCurrency={basketCurrency}
              className="font-bold"
            />
          </div>
          {region === "TR" ? (
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-green">
                <PackageCheck size={17} aria-hidden="true" />
                {freeShippingRemaining === 0 ? (
                  couponText.shippingUnlocked
                ) : (
                  <>
                    <Money
                      baseAmountUsdCents={freeShippingRemaining}
                      canonicalCurrency="TRY"
                    />{" "}
                    {couponText.shippingRemaining}
                  </>
                )}
              </p>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10"
                role="progressbar"
                aria-label={couponText.shippingUnlocked}
                aria-valuemin={0}
                aria-valuemax={TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR}
                aria-valuenow={Math.min(displayedSubtotal, TURKIYE_FREE_SHIPPING_THRESHOLD_MINOR)}
              >
                <div
                  className="h-full rounded-full bg-green transition-[width] duration-300"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-ink/60">
                {couponText.shippingRule}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold">
              International original delivery: 100 USD per order
            </p>
          )}
          {cart.length > 0 &&
          unavailableItems.length === 0 &&
          !cart.some((item) => item.kind === "studio-mail") ? (
            <Link
              href={
                region === "TR"
                  ? "/checkout/turkiye"
                  : "/checkout/international-originals"
              }
              onClick={() => {
                trackAnalytics("checkout_started", {
                  metadata: {
                    quantity: cart.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    ),
                    currency: basketCurrency,
                    total: subtotal,
                  },
                });
                onOpenChange(false);
              }}
              className="button-primary mt-6 w-full"
            >
              Continue to checkout
            </Link>
          ) : (
            <div>
              <button
                type="button"
                disabled
                className="button-primary mt-6 w-full opacity-45"
              >
                Continue to checkout
              </button>
              {cart.length > 0 && unavailableItems.length === 0 && (
                <p role="status" className="mt-2 text-xs text-ink/60">
                  Remove unavailable or unsupported items before checkout.
                </p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs text-ink/55">
            {locale === "tr"
              ? "Sepetiniz ürünleri ayırmaz veya stok durumunu değiştirmez."
              : "Your basket does not reserve artwork or change inventory."}
          </p>
        </footer>
      </aside>
    </div>
  );
}
