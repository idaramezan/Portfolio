import { useEffect, useState } from "react";
import { PackageCheck, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import {
  getCanonicalCartItemPricing,
  isCartItemAvailable,
  loadCart,
  removeCartItem,
} from "@/lib/store";
import Money from "@/components/Money";
import { cn } from "@/lib/utils";
import { formatCurrencyMinor } from "@/lib/currency";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useServerNow } from "@/hooks/use-server-now";
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
  const [runtimeWhatsapp, setRuntimeWhatsapp] = useState<{
    configured: boolean;
    enabled: boolean;
    number: string | null;
  } | null>(null);
  const settings = useShopSettings();
  const now = useServerNow();
  useEffect(() => {
    const sync = () => setCart(loadCart(region));
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, [region]);
  useEffect(() => {
    if (open) setCart(loadCart(region));
  }, [open, region]);
  useEffect(() => {
    if (!open) return;
    fetch("/api/storefront-config")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setRuntimeWhatsapp(payload.whatsapp || null))
      .catch(() => setRuntimeWhatsapp(null));
  }, [open]);
  const canonicalUnitPrice = (item: (typeof cart)[number]) =>
    getCanonicalCartItemPricing(item, settings)?.unitPriceCents ??
    item.priceUsdCents;
  const subtotal = cart.reduce(
    (total, item) => total + canonicalUnitPrice(item) * item.quantity,
    0,
  );
  const basketCurrency = region === "TR" ? "TRY" : "USD";
  const hasSeparatelyConfirmedShipping = cart.some((item) => item.kind === "print" || item.kind === "product");
  const hasCatalogRecord = (item: (typeof cart)[number]) => {
    const baseId = item.id.split(":")[0];
    if (item.kind === "original")
      return settings.originalProducts.some(
        (product) => product.id === baseId.replace(/^original-/, ""),
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
  const effectiveWhatsappNumber = runtimeWhatsapp?.configured
    ? runtimeWhatsapp.number || ""
    : settings.whatsapp.number;
  const whatsappEnabled = runtimeWhatsapp?.configured
    ? runtimeWhatsapp.enabled
    : settings.whatsapp.enabled;
  const orderMessage = [
    settings.whatsapp.greeting,
    "",
    region === "TR"
      ? "I would like to complete my order for these items:"
      : "I would like to complete my international order for these artworks:",
    "",
    ...cart.flatMap((item, index) =>
      [
        `${index + 1}. ${item.title}`,
        item.printConfiguration ? `Size: ${item.printConfiguration.sizeLabel}` : "",
        item.printConfiguration?.sizeSecondaryLabel || "",
        item.printConfiguration
          ? `Framing: ${item.printConfiguration.framing === "framed" ? "Framed" : "Unframed"}`
          : "",
        item.selectedColor ? `Color: ${item.selectedColor}` : "",
        `Quantity: ${item.quantity}`,
        `Line total: ${formatCurrencyMinor(canonicalUnitPrice(item) * item.quantity, basketCurrency)}`,
        "",
      ].filter(Boolean),
    ),
    `${region === "TR" ? "Items" : "Artwork"} subtotal: ${formatCurrencyMinor(subtotal, basketCurrency)}`,
    region === "TR"
      ? hasSeparatelyConfirmedShipping
        ? "Shipping price will be calculated based on the package size."
        : "Shipping within Türkiye: Free"
      : "International shipping will be calculated separately based on destination.",
    "",
    "My name:",
    region === "TR" ? "Delivery city:" : "Delivery country and city:",
    "Questions or notes:",
  ]
    .filter((line) => line !== "")
    .join("\n");
  const whatsappUrl =
    cart.length > 0 &&
    unavailableItems.length === 0 &&
    whatsappEnabled &&
    /^\d{8,15}$/.test(effectiveWhatsappNumber)
      ? `https://wa.me/${effectiveWhatsappNumber}?text=${encodeURIComponent(orderMessage)}`
      : null;
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
        <header className="flex items-center justify-between border-b border-ink/10 p-6">
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
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <p className="border border-ink/10 bg-ochre/10 p-4 text-sm">
            Every collection is confirmed personally with Aida before purchase.
          </p>
          {cart.length === 0 ? (
            <p className="py-12 text-center text-ink/60">
              Your collection basket is waiting.
            </p>
          ) : (
            cart.map((x) => (
              <div
                key={x.id}
                className="flex gap-4 border-b border-ink/10 pb-4"
              >
                {x.imageUrl && (
                  <img
                    src={x.imageUrl}
                    alt=""
                    className="h-20 w-20 object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl">{x.title}</h3>
                  <p className="text-xs text-ink/55">Quantity {x.quantity}</p>
                  {unavailableItems.some((item) => item.id === x.id) && (
                    <p role="alert" className="mt-2 text-sm font-semibold text-coral">
                      This item is no longer available. Remove it before continuing.
                    </p>
                  )}
                  <Money
                    baseAmountUsdCents={canonicalUnitPrice(x) * x.quantity}
                    canonicalCurrency={basketCurrency}
                    className="mt-2 block text-sm font-bold"
                  />
                </div>
                <button
                  onClick={() => removeCartItem(x.id, region)}
                  className="text-sm text-coral"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <footer className="border-t border-ink/10 p-6">
          <div className="flex justify-between">
            <span>{region === "TR" ? "Items" : "Artwork"} subtotal</span>
            <Money
              baseAmountUsdCents={subtotal}
              canonicalCurrency={basketCurrency}
              className="font-bold"
            />
          </div>
          {region === "TR" ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-green">
              <PackageCheck size={17} aria-hidden="true" />
              {hasSeparatelyConfirmedShipping ? "Shipping price will be calculated based on the package size" : "Free shipping within Türkiye"}
            </p>
          ) : (
            <p className="mt-3 text-sm font-semibold">
              International shipping is not included
            </p>
          )}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenChange(false)}
              className="button-primary mt-6 w-full"
            >
              <FaWhatsapp size={20} aria-hidden="true" />
              Complete Order with Aida
            </a>
          ) : (
            <div>
              <button
                type="button"
                disabled
                className="button-primary mt-6 w-full opacity-45"
              >
                <FaWhatsapp size={20} aria-hidden="true" />
                Complete Order with Aida
              </button>
              {cart.length > 0 && unavailableItems.length === 0 && (
                <p role="status" className="mt-2 text-xs text-ink/60">
                  Connecting to WhatsApp. Please reopen the basket if this takes more than a moment.
                </p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs text-ink/55">
            Your basket does not reserve artwork or change inventory.
          </p>
        </footer>
      </aside>
    </div>
  );
}
