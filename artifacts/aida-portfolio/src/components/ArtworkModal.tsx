import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Artwork } from "@workspace/api-client-react";
import { getArtworkImage } from "@/lib/assets";

interface ArtworkModalProps {
  artwork: Artwork | null;
  index: number;
  onClose: () => void;
  /** Show price + WhatsApp buy button. False in Gallery (showcase), true in Shop Originals. */
  showBuyButton?: boolean;
}

// Detect if visitor is from Turkey and return TRY-converted price string
function usePriceDisplay(priceCents: number | null, currency: string) {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!priceCents) { setDisplay(null); return; }

    const usd = priceCents / 100;

    fetch("https://ipapi.co/json/", { cache: "force-cache" })
      .then((r) => r.json())
      .then((geo) => {
        if (geo.country_code === "TR") {
          // Fetch live USD→TRY rate
          fetch("https://open.er-api.com/v6/latest/USD")
            .then((r) => r.json())
            .then((rates) => {
              const rate = rates?.rates?.TRY;
              if (rate) {
                const lira = usd * rate;
                setDisplay(`₺${Math.round(lira).toLocaleString("tr-TR")}`);
              } else {
                setDisplay(formatUSD(usd, currency));
              }
            })
            .catch(() => setDisplay(formatUSD(usd, currency)));
        } else {
          setDisplay(formatUSD(usd, currency));
        }
      })
      .catch(() => setDisplay(formatUSD(usd, currency)));
  }, [priceCents, currency]);

  return display;
}

function formatUSD(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ArtworkModal({ artwork, index, onClose, showBuyButton = false }: ArtworkModalProps) {
  const priceDisplay = usePriceDisplay(artwork?.priceCents ?? null, artwork?.currency ?? "USD");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (artwork) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [artwork, onClose]);

  if (!artwork) return null;

  const waText = encodeURIComponent(
    `Hi, I'm interested in buying "${artwork.title}". Can you send me the details of it?`
  );
  const whatsappHref = `https://wa.me/905354795088?text=${waText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-6xl max-h-full bg-paper torn-edge-2 shadow-2xl flex flex-col md:flex-row overflow-hidden z-10 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-20 bg-paper/50 md:bg-transparent rounded-full p-2 text-ink hover:text-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          aria-label="Close modal"
        >
          <X size={32} />
        </button>

        {/* Image */}
        <div className="w-full md:w-3/5 bg-ink/5 p-4 md:p-8 flex items-center justify-center min-h-[40vh] md:min-h-[70vh] overflow-y-auto">
          <img
            src={getArtworkImage(artwork, index)}
            alt={artwork.title}
            className="max-w-full max-h-full object-contain shadow-lg"
          />
        </div>

        {/* Details */}
        <div className="w-full md:w-2/5 p-6 md:p-10 lg:p-12 flex flex-col overflow-y-auto bg-paper">
          <div className="mb-2 flex items-center gap-3">
            <span className="bg-ochre/20 text-ink/80 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm">
              {artwork.category}
            </span>
            <span className="text-muted-foreground text-sm font-sans">{artwork.year}</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-serif font-bold text-ink mb-6 leading-tight">
            {artwork.title}
          </h2>

          <div className="space-y-4 text-ink font-sans text-lg mb-10 border-l-2 border-ochre pl-4">
            <p><span className="font-bold text-muted-foreground mr-2">Medium:</span>{artwork.medium}</p>
            {artwork.sizeInches && (
              <p><span className="font-bold text-muted-foreground mr-2">Size:</span>{artwork.sizeInches} in</p>
            )}
          </div>

          {artwork.description && (
            <div className="mb-10 text-ink/80 font-sans leading-relaxed whitespace-pre-wrap">
              {artwork.description}
            </div>
          )}

          {showBuyButton && (
            <div className="mt-auto pt-8 border-t border-ink/10">
              {artwork.status === "SOLD" ? (
                <div className="inline-block transform -rotate-6 border-4 border-coral text-coral px-6 py-2 mix-blend-multiply">
                  <span className="font-hand text-4xl font-bold tracking-widest uppercase block translate-y-1">Sold Out</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {priceDisplay && (
                    <div className="flex items-end justify-between">
                      <span className="font-sans text-muted-foreground uppercase tracking-widest text-sm font-bold">Price</span>
                      <span className="font-hand text-4xl text-ochre">{priceDisplay}</span>
                    </div>
                  )}
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-coral text-paper font-serif font-bold text-xl px-8 py-4 torn-edge-2 hover:bg-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
                  >
                    Buy Original
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
