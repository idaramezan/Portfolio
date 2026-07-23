import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ExternalLink, MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import Money from "@/components/Money";
import {
  clearCart,
  getCanonicalCartItemPricing,
  isCartItemAvailable,
  loadCart,
  loadShopSettings,
  removeCartItem,
  updateCartItemQuantity,
  setActiveShoppingRegion,
  type ShoppingRegion,
} from "@/lib/store";
import { useServerNow } from "@/hooks/use-server-now";
import { formatCurrencyMinor } from "@/lib/currency";

function reference(prefix: string) {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const suffix = crypto
    .getRandomValues(new Uint16Array(1))[0]
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `${prefix}-${date}-${suffix}`;
}
export default function Basket({ region = "TR" }: { region?: ShoppingRegion }) {
  const localItems = () =>
    loadCart(region).filter((item) => item.productOrigin !== "fourthwall");
  const [items, setItems] = useState(localItems());
  const [confirmed, setConfirmed] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [settings, setSettings] = useState(loadShopSettings);
  const now = useServerNow();
  const basketCurrency = region === "TR" ? "TRY" : "USD";
  const hasMail = items.some((x) => x.kind === "studio-mail");
  const unavailableItems = items.filter(
    (item) => !isCartItemAvailable(item, settings, now, region),
  );
  const canonicalUnitPrice = (item: (typeof items)[number]) => {
    return (
      getCanonicalCartItemPricing(item, settings)?.unitPriceCents ??
      item.priceUsdCents
    );
  };
  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          (getCanonicalCartItemPricing(item, settings)?.lineTotalCents ??
            item.priceUsdCents * item.quantity),
        0,
      ),
    [items, settings],
  );
  useEffect(() => {
    setActiveShoppingRegion(region);
    const sync = () => setItems(localItems());
    const syncSettings = () => setSettings(loadShopSettings());
    window.addEventListener("cart:updated", sync);
    window.addEventListener("shop-settings:updated", syncSettings);
    return () => {
      window.removeEventListener("cart:updated", sync);
      window.removeEventListener("shop-settings:updated", syncSettings);
    };
  }, [region]);
  const message = () => {
    const ref = reference(settings.whatsapp.referencePrefix || "AR");
    const lines = items
      .flatMap((x, i) => [
        `${i + 1}. ${x.title}`,
        `Type: ${x.kind === "studio-mail" ? "Mystery Mail" : x.kind === "original" ? "Original Painting" : x.kind === "product" ? "Studio Good" : "Signed Print"}`,
        x.printConfiguration ? `Size: ${x.printConfiguration.sizeLabel}` : "",
        x.printConfiguration?.sizeSecondaryLabel || "",
        x.printConfiguration
          ? `Framing: ${x.printConfiguration.framing === "framed" ? "Framed" : "Unframed"}`
          : "",
        x.selectedColor
          ? `Color: ${x.selectedColor[0].toUpperCase() + x.selectedColor.slice(1)}`
          : "",
        `Quantity: ${x.quantity}`,
        `Unit price: ${formatCurrencyMinor(canonicalUnitPrice(x), basketCurrency)}`,
        `Line total: ${formatCurrencyMinor(canonicalUnitPrice(x) * x.quantity, basketCurrency)}`,
        x.shippingRestriction ? `Delivery: ${x.shippingRestriction}` : "",
        "",
      ])
      .filter(Boolean);
    return [
      settings.whatsapp.greeting,
      "",
      region === "TR"
        ? "I would like to collect the following pieces through the Türkiye shop:"
        : "I would like to ask about collecting the following original artwork internationally:",
      "",
      `Collection reference: ${ref}`,
      "",
      ...lines,
      `${region === "TR" ? "Items" : "Artwork"} subtotal: ${formatCurrencyMinor(subtotal, basketCurrency)}`,
      "",
      region === "TR"
        ? "Shipping within Türkiye: Free"
        : "International shipping: Not included\nShipping will be calculated separately based on destination.",
      "",
      "My name:",
      region === "TR" ? "Delivery city:" : "Delivery country:",
      region === "INTERNATIONAL" ? "Delivery city or postal code:" : "",
      "Questions or notes:",
      "",
      "Thank you.",
    ]
      .filter((x) => x !== "")
      .join("\n");
  };
  const url =
    settings.whatsapp.enabled && /^\d{8,15}$/.test(settings.whatsapp.number)
      ? `https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(message())}`
      : null;
  return (
    <div className="section-shell">
      <p className="eyebrow">
        {region === "TR"
          ? "Türkiye Collection Basket"
          : "International Originals Basket"}
      </p>
      <h1 className="mt-4 max-w-4xl text-5xl md:text-7xl">
        A few pieces from the studio, ready to discuss.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/70">
        Every collection is confirmed personally. Review your selection, then
        continue with Aida on WhatsApp to confirm availability, payment, and
        delivery.
      </p>
      {items.length === 0 ? (
        <div className="mt-12 border border-ink/10 bg-card p-10 text-center">
          <h2 className="text-3xl">Your collection basket is waiting.</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink/65">
            Browse originals, Prints & Goods and Mystery Mail, then return here
            to continue directly with Aida.
          </p>
          <Link
            href={
              region === "TR"
                ? "/shop/turkiye"
                : "/shop/international/originals"
            }
            className="button-primary mt-6"
          >
            Explore available work
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-4">
            {items.map((x) => (
              <article
                key={x.id}
                className="grid grid-cols-[90px_1fr] gap-4 border-b border-ink/15 pb-5 sm:grid-cols-[130px_1fr]"
              >
                {x.imageUrl ? (
                  <img
                    src={x.imageUrl}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="aspect-square bg-ink/5" />
                )}
                <div>
                  <div className="flex justify-between gap-3">
                    <div>
                      <span className="eyebrow">
                        {x.kind === "studio-mail"
                          ? "Limited Mystery Mail"
                          : x.kind.replace("-", " ")}
                      </span>
                      <h2 className="mt-1 text-2xl">{x.title}</h2>
                      {x.subtitle && (
                        <p className="text-sm text-ink/55">{x.subtitle}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeCartItem(x.id, region)}
                      aria-label={`Remove ${x.title}`}
                      className="min-h-11 text-coral"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {x.shippingRestriction && (
                    <p className="mt-2 text-sm font-semibold text-coral">
                      {x.shippingRestriction}
                    </p>
                  )}
                  {x.kind === "studio-mail" && x.expiresAt && (
                    <p className="mt-2 text-xs text-ink/60">
                      Available until{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/Istanbul",
                      }).format(new Date(x.expiresAt))}{" "}
                      Istanbul time
                    </p>
                  )}
                  {unavailableItems.some((item) => item.id === x.id) && (
                    <p
                      role="alert"
                      className="mt-3 border border-coral/30 bg-coral/5 p-3 text-sm font-semibold text-coral"
                    >
                      This item is no longer available. Remove it before
                      continuing.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center border border-ink/15">
                      <button
                        className="min-h-11 min-w-11"
                        onClick={() =>
                          updateCartItemQuantity(x.id, x.quantity - 1, region)
                        }
                        aria-label={`Decrease ${x.title} quantity`}
                      >
                        <Minus size={15} className="mx-auto" />
                      </button>
                      <span aria-live="polite" className="min-w-8 text-center">
                        {x.quantity}
                      </span>
                      <button
                        className="min-h-11 min-w-11"
                        onClick={() =>
                          updateCartItemQuantity(x.id, x.quantity + 1, region)
                        }
                        aria-label={`Increase ${x.title} quantity`}
                      >
                        <Plus size={15} className="mx-auto" />
                      </button>
                    </div>
                    <div className="text-right">
                      <Money
                        baseAmountUsdCents={canonicalUnitPrice(x) * x.quantity}
                        canonicalCurrency={basketCurrency}
                        className="font-sans font-bold"
                      />
                      <span className="block text-xs text-ink/50">
                        line total
                      </span>
                    </div>
                  </div>
                  {x.kind === "original" && (
                    <p className="mt-3 text-xs text-ink/55">
                      One of one · Adding this work does not reserve it.
                    </p>
                  )}
                </div>
              </article>
            ))}
            <button
              onClick={() => clearCart(region)}
              className="button-link text-coral"
            >
              Clear basket
            </button>
          </div>
          <aside className="h-fit border border-ink/10 bg-card p-6 lg:sticky lg:top-28">
            <p className="eyebrow">Collection summary</p>
            <div className="mt-5 flex justify-between border-b border-ink/10 pb-5">
              <span>
                {items.reduce((n, x) => n + x.quantity, 0)} pieces · Items
                subtotal
              </span>
              <Money
                baseAmountUsdCents={subtotal}
                canonicalCurrency={basketCurrency}
                className="font-sans text-xl font-bold"
              />
            </div>
            {region === "TR" && items.some((item) => item.appliedExchangeRate) && (
              <p className="mt-4 text-xs leading-relaxed text-ink/55">
                TRY prices use the latest available daily rate
                recorded when each original was added. Final availability,
                delivery, and payment details are confirmed personally on
                WhatsApp.
              </p>
            )}
            <p className="mt-4 text-sm font-semibold">
              {region === "TR"
                ? "Shipping: Free within Türkiye"
                : "International shipping: Calculated separately"}
            </p>
            {region === "INTERNATIONAL" && (
              <p className="mt-2 text-sm text-ink/60">
                International shipping is not included in the artwork subtotal.
                Shipping is calculated separately based on destination and
                confirmed with Aida before payment.
              </p>
            )}
            {hasMail && (
              <label className="mt-5 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I understand that Mystery Mail is available only within
                  Türkiye.
                </span>
              </label>
            )}
            <div className="mt-7 border-t border-ink/10 pt-6">
              <h2 className="text-3xl">Continue directly with the artist.</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">
                Aida personally confirms every selection, answers questions, and
                arranges payment and delivery with you.
              </p>
              {url ? (
                <a
                  href={
                    (hasMail && !confirmed) || unavailableItems.length
                      ? undefined
                      : url
                  }
                  onClick={(e) => {
                    if ((hasMail && !confirmed) || unavailableItems.length)
                      e.preventDefault();
                    else setHandoff(true);
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={
                    (hasMail && !confirmed) || unavailableItems.length > 0
                  }
                  className={`button-primary mt-6 w-full ${(hasMail && !confirmed) || unavailableItems.length ? "pointer-events-none opacity-45" : ""}`}
                >
                  <MessageCircle size={18} />
                  Continue with Aida on WhatsApp <ExternalLink size={14} />
                </a>
              ) : (
                <p
                  role="alert"
                  className="mt-6 border border-coral/30 bg-coral/5 p-4 text-sm"
                >
                  WhatsApp ordering is being configured. Your basket is safely
                  kept here.
                </p>
              )}
              {handoff && (
                <p aria-live="polite" className="mt-3 text-xs text-ink/55">
                  Your basket has been kept here in case you need to return.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
