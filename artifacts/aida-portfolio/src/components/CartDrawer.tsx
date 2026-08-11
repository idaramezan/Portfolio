import { useEffect, useState } from "react";
import { Minus, PackageCheck, Plus, X } from "lucide-react";
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
import { calculateTurkiyeProductShipping } from "@/lib/turkiye-products";
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
  const canonicalUnitPrice = (item: (typeof cart)[number]) =>
    getCanonicalCartItemPricing(item, settings)?.unitPriceCents ??
    item.priceUsdCents;
  const subtotal = cart.reduce(
    (total, item) => total + canonicalUnitPrice(item) * item.quantity,
    0,
  );
  const basketCurrency = region === "TR" ? "TRY" : "USD";
  const totalProductQuantity = cart.reduce(
    (total, item) =>
      total + (["print", "product"].includes(item.kind) ? item.quantity : 0),
    0,
  );
  const shipping =
    region === "TR"
      ? calculateTurkiyeProductShipping(totalProductQuantity)
      : cart.length
        ? 10_000
        : 0;
  const orderTotal = subtotal + shipping;
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
                  {x.printConfiguration && (
                    <p className="text-xs text-ink/55">
                      {x.printConfiguration.sizeLabel}
                      {x.printConfiguration.sizeSecondaryLabel
                        ? ` · ${x.printConfiguration.sizeSecondaryLabel}`
                        : ""}
                      {` · ${x.printConfiguration.framing === "framed" ? "Framed" : "Unframed"}`}
                    </p>
                  )}
                  <p className="text-xs text-ink/55">Quantity {x.quantity}</p>
                  {x.kind !== "original" && (
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
                    <p
                      role="alert"
                      className="mt-2 text-sm font-semibold text-coral"
                    >
                      This item is no longer available. Remove it before
                      continuing.
                    </p>
                  )}
                  <p className="mt-2 text-sm">
                    <span className="text-ink/55">Line total: </span>
                    <Money
                      baseAmountUsdCents={canonicalUnitPrice(x) * x.quantity}
                      canonicalCurrency={basketCurrency}
                      className="font-bold"
                    />
                  </p>
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
          <p className="eyebrow mb-3">Order summary</p>
          <div className="flex justify-between">
            <span>Products</span>
            <Money
              baseAmountUsdCents={subtotal}
              canonicalCurrency={basketCurrency}
              className="font-bold"
            />
          </div>
          <div className="mt-2 flex justify-between" aria-live="polite">
            <span>Shipping</span>
            <Money
              baseAmountUsdCents={shipping}
              canonicalCurrency={basketCurrency}
              className="font-bold"
            />
          </div>
          <div className="mt-3 flex justify-between border-t border-ink/15 pt-3 text-lg">
            <strong>Total</strong>
            <Money
              baseAmountUsdCents={orderTotal}
              canonicalCurrency={basketCurrency}
              className="font-bold"
            />
          </div>
          {region === "TR" ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-green">
              <PackageCheck size={17} aria-hidden="true" />
              {totalProductQuantity > 0
                ? "Türkiye delivery is 200 TL for the first product, then 20 TL for each additional product. Originals ship free."
                : "Free shipping within Türkiye"}
            </p>
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
            Your basket does not reserve artwork or change inventory.
          </p>
        </footer>
      </aside>
    </div>
  );
}
