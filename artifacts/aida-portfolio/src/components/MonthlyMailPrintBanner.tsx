import { useEffect, useState } from "react";
import { addItemToCart, loadShopSettings, type CartItem } from "@/lib/store";
import { formatPrice } from "@/lib/utils";

export default function MonthlyMailPrintBanner() {
  const [settings, setSettings] = useState(loadShopSettings());

  useEffect(() => {
    const sync = () => setSettings(loadShopSettings());
    window.addEventListener("shop-settings:updated", sync);
    return () => window.removeEventListener("shop-settings:updated", sync);
  }, []);

  if (!settings.mailPrint.enabled || !settings.mailPrint.available) return null;

  const handleAdd = () => {
    const item: CartItem = {
      id: "mailprint",
      kind: "mailprint",
      title: settings.mailPrint.title,
      subtitle: settings.mailPrint.description,
      priceCents: settings.mailPrint.priceCents,
      quantity: 1,
    };

    const result = addItemToCart(item, 1);
    if (!result.ok) {
      window.alert(result.reason);
    }
  };

  const highlights = [
    "A handwritten note from the studio",
    "A signed print from the month’s work",
    "A few tactile extras and studio keepsakes",
  ];

  return (
    <section id="studio-mail" className="mx-auto w-full max-w-6xl px-4 md:px-8 py-16 md:py-20 border-t border-b border-ink/10 bg-paper">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-start">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Studio Mail</p>
          <h2 className="text-4xl md:text-5xl font-serif text-ink">A monthly parcel from the studio, made to feel personal.</h2>
          <p className="text-lg md:text-xl text-ink/80 leading-relaxed max-w-2xl">
            {settings.mailPrint.description}
          </p>
          <div className="space-y-3 rounded-none border border-ink/10 bg-card p-6">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-ink/80">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-coral" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Limited quantity • {settings.mailPrint.monthLabel}</p>
        </div>

        <div className="rounded-none border border-ink/10 bg-ink/5 p-8 shadow-sm">
          <div className="space-y-6 text-ink">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">This month’s package</p>
              <p className="mt-2 text-3xl font-serif text-ink">Studio Mail package</p>
            </div>
            <div className="space-y-3 text-sm text-ink/80">
              <p>Each package arrives as a slow, tactile moment: the letter, the print, and the small objects that make the studio feel close at hand.</p>
              <p className="font-medium text-ink">A thoughtful way to bring a little of the studio into your week.</p>
            </div>
            <div className="mt-6 flex flex-col gap-4 border-t border-ink/10 pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Starting at</p>
                <span className="mt-2 block font-hand text-4xl text-ochre">{formatPrice(settings.mailPrint.priceCents)}</span>
              </div>
              <button
                onClick={handleAdd}
                className="rounded-none bg-coral px-6 py-3 font-serif text-lg text-paper transition-colors hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
              >
                Add to basket
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
