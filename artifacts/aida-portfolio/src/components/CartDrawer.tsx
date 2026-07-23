import { useEffect, useState } from "react";
import { Link } from "wouter";
import { PackageCheck, X } from "lucide-react";
import { loadCart, removeCartItem } from "@/lib/store";
import Money from "@/components/Money";
import { cn } from "@/lib/utils";
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
  useEffect(() => {
    const sync = () => setCart(loadCart(region));
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, [region]);
  useEffect(() => {
    if (open) setCart(loadCart(region));
  }, [open, region]);
  const subtotal = cart.reduce((n, x) => n + x.priceUsdCents * x.quantity, 0);
  const hasSeparatelyConfirmedShipping = cart.some((item) => item.kind === "print" || item.kind === "product");
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
                  <Money
                    baseAmountUsdCents={x.priceUsdCents * x.quantity}
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
              showBase
              className="font-bold"
            />
          </div>
          {region === "TR" ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-green">
              <PackageCheck size={17} aria-hidden="true" />
              {hasSeparatelyConfirmedShipping ? "Shipping confirmed separately" : "Free shipping within Türkiye"}
            </p>
          ) : (
            <p className="mt-3 text-sm font-semibold">
              International shipping is not included
            </p>
          )}
          <Link
            href={`/basket/${region === "TR" ? "turkiye" : "international"}`}
            onClick={() => onOpenChange(false)}
            className="button-primary mt-6 w-full"
          >
            Review your selection
          </Link>
          <p className="mt-3 text-xs text-ink/55">
            Your basket does not reserve artwork or change inventory.
          </p>
        </footer>
      </aside>
    </div>
  );
}
