import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { loadCart, removeCartItem, saveCart, updateCartItemQuantity } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const [cart, setCart] = useState(loadCart());
  const [whatsappMessage, setWhatsappMessage] = useState("");

  useEffect(() => {
    const sync = () => setCart(loadCart());
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCart(loadCart());
  }, [open]);

  useEffect(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const lines = cart.map((item) => {
      const name = `${item.title}${item.subtitle ? ` (${item.subtitle})` : ""}`;
      return `${item.quantity} x ${name} — ${formatPrice(item.priceCents * item.quantity)}`;
    });
    setWhatsappMessage(["New order request", ...lines, `Subtotal: ${formatPrice(subtotal)}`, "Shipping to be confirmed by Aida."].join("\n"));
  }, [cart]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0), [cart]);

  const handleCheckout = () => {
    const settings = localStorage.getItem("aida-shop-settings");
    const parsed = settings ? JSON.parse(settings) : null;
    const phone = parsed?.whatsappNumber || "+15551234567";
    const text = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={cn("fixed inset-0 z-[60] transition-all", open ? "pointer-events-auto" : "pointer-events-none")}> 
      <div
        className={cn("absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={() => onOpenChange(false)}
      />
      <aside className={cn("absolute right-0 top-0 h-full w-full sm:w-[480px] bg-paper shadow-2xl border-l border-ink/10 transition-transform duration-300 flex flex-col", open ? "translate-x-0" : "translate-x-full")}> 
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-muted-foreground">Your basket</p>
            <h2 className="font-serif text-3xl text-ink">Your order</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-ink/5" aria-label="Close basket">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div className="rounded-none border border-ink/10 bg-ochre/10 p-4 text-sm text-ink">
            Aida will review your order and confirm shipping directly in WhatsApp before anything is sent.
          </div>
          {cart.length === 0 ? (
            <div className="rounded-none border border-ink/10 bg-card p-6 text-center text-muted-foreground">
              Your basket is still empty. Add an original, print, or Studio Mail package to begin.
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="border border-ink/10 bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-xl text-ink">{item.title}</p>
                    {item.subtitle && <p className="text-sm text-muted-foreground">{item.subtitle}</p>}
                    <p className="mt-2 text-sm text-ink">{formatPrice(item.priceCents * item.quantity)}</p>
                  </div>
                  <button onClick={() => { removeCartItem(item.id); setCart(loadCart()); }} className="text-sm text-coral">Remove</button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 border border-ink/10 px-2 py-1">
                    <button onClick={() => { const next = Math.max(0, item.quantity - 1); updateCartItemQuantity(item.id, next); setCart(loadCart()); }} className="px-2 text-lg">−</button>
                    <span className="min-w-6 text-center">{item.quantity}</span>
                    <button onClick={() => { updateCartItemQuantity(item.id, item.quantity + 1); setCart(loadCart()); }} className="px-2 text-lg">+</button>
                  </div>
                  <span className="font-sans text-sm text-muted-foreground">{item.quantity} item{item.quantity > 1 ? "s" : ""}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-ink/10 bg-paper px-6 py-6">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <button onClick={handleCheckout} className="mt-6 w-full bg-coral px-6 py-4 font-serif text-xl text-paper torn-edge-2 hover:bg-ink transition-colors" disabled={cart.length === 0}>
            Send order to WhatsApp
          </button>
          <p className="mt-3 text-sm text-muted-foreground">For originals and prints, availability and shipping will be confirmed by hand.</p>
        </div>
      </aside>
    </div>
  );
}
