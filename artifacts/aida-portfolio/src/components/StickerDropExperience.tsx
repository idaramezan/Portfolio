import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, ShoppingBag, X } from "lucide-react";
import { useLocation } from "wouter";
import { useLocale } from "@/lib/locale";
import {
  addItemToCart,
  loadShopSettings,
  setActiveShoppingRegion,
} from "@/lib/store";
import { trackAnalytics } from "@/lib/analytics";

type Product = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  priceMinor: number;
  currency: string;
  available: boolean;
  soldOut: boolean;
  maxPerUser: number;
  freeShippingInTurkiye: boolean;
};
type Destination = {
  type: "local_product" | "fourthwall_product" | "external_url";
  product: Product | null;
  url: string | null;
  fourthwallProductId?: string | null;
};
type Campaign = {
  id: string;
  slug: string;
  startAt: string;
  endAt: string;
  duration: number;
  maximumDesktopStickers: number;
  maximumMobileStickers: number;
  copy: Record<
    "en" | "tr",
    { eyebrow: string; title: string; description: string }
  >;
  placements: {
    homepage: boolean;
    turkiye: boolean;
    international: boolean;
    other: boolean;
  };
  frequencyMode: string;
  repeatAfterDays: number | null;
  assets: string[];
  destinations: {
    turkiye: Destination | null;
    international: Destination | null;
  };
};

function placement(path: string) {
  if (path === "/") return "homepage";
  if (path.startsWith("/shop/turkiye")) return "turkiye";
  if (path.startsWith("/shop/international")) return "international";
  return "other";
}
function seen(campaign: Campaign) {
  const key = `stickerDropSeen:${campaign.id}`;
  const storage =
    campaign.frequencyMode === "once_per_session"
      ? sessionStorage
      : localStorage;
  try {
    const value = JSON.parse(storage.getItem(key) || "null");
    if (!value) return false;
    if (campaign.frequencyMode === "repeat_after_days")
      return (
        Date.now() - Number(value.seenAt) <
        Number(campaign.repeatAfterDays || 1) * 86400000
      );
    return true;
  } catch {
    return sessionStorage.getItem(key) !== null;
  }
}
function mark(campaign: Campaign, outcome: string) {
  const key = `stickerDropSeen:${campaign.id}`;
  const storage =
    campaign.frequencyMode === "once_per_session"
      ? sessionStorage
      : localStorage;
  try {
    storage.setItem(
      key,
      JSON.stringify({ campaignId: campaign.id, seenAt: Date.now(), outcome }),
    );
  } catch {
    sessionStorage.setItem(key, outcome);
  }
}

export default function StickerDropExperience() {
  const [location] = useLocation();
  const { locale } = useLocale();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stage, setStage] = useState<"idle" | "falling" | "modal">("idle");
  const [market, setMarket] = useState<"turkiye" | "international" | null>(
    null,
  );
  const [added, setAdded] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    if (location.startsWith("/admin") || started.current) return;
    fetch("/api/sticker-drop/active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(async ({ campaign: next }) => {
        if (!next || seen(next)) return;
        const place = placement(location);
        if (!next.placements[place]) return;
        const routeMarket =
          place === "turkiye"
            ? "turkiye"
            : place === "international"
              ? "international"
              : null;
        const stored = localStorage.getItem("aida-active-shop-region");
        const initial =
          routeMarket ||
          (stored === "TR"
            ? "turkiye"
            : stored === "INTERNATIONAL"
              ? "international"
              : null);
        if (initial && !next.destinations[initial])
          setMarket(
            next.destinations.turkiye
              ? "turkiye"
              : next.destinations.international
                ? "international"
                : null,
          );
        else setMarket(initial);
        started.current = true;
        const loadedAssets = (
          await Promise.all(
            next.assets.map(
              (src: string) =>
                new Promise<string | null>((resolve) => {
                  const image = new Image();
                  const timeout = window.setTimeout(() => resolve(null), 1800);
                  image.onload = () => {
                    clearTimeout(timeout);
                    resolve(src);
                  };
                  image.onerror = () => {
                    clearTimeout(timeout);
                    resolve(null);
                  };
                  image.src = src;
                }),
            ),
          )
        ).filter(Boolean);
        const ready = {
          ...next,
          assets: loadedAssets.length ? loadedAssets : next.assets,
        };
        setCampaign(ready);
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
          timers.current.push(window.setTimeout(() => setStage("modal"), 300));
          return;
        }
        timers.current.push(
          window.setTimeout(() => {
            setStage("falling");
            trackAnalytics("sticker_drop_animation_started", {
              entityType: "sticker_drop",
              entityId: next.id,
              entityName: next.slug,
              metadata: { placement: place },
            });
          }, 350),
        );
        timers.current.push(
          window.setTimeout(() => {
            setStage("modal");
            trackAnalytics("sticker_drop_animation_completed", {
              entityType: "sticker_drop",
              entityId: next.id,
              entityName: next.slug,
              metadata: { placement: place },
            });
          }, 350 + 4400),
        );
      })
      .catch(() => undefined);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [location]);
  useEffect(() => {
    if (stage !== "modal" || !campaign) return;
    previousFocus.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    setTimeout(
      () =>
        dialog.current?.querySelector<HTMLElement>("button,a,select")?.focus(),
      0,
    );
    trackAnalytics("sticker_drop_modal_opened", {
      entityType: "sticker_drop",
      entityId: campaign.id,
      entityName: campaign.slug,
      metadata: { placement: placement(location) },
    });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close("dismissed");
      if (event.key !== "Tab" || !dialog.current) return;
      const items = [
        ...dialog.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href],select:not([disabled])",
        ),
      ];
      if (!items.length) return;
      const first = items[0],
        last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    };
  }, [stage, campaign]);
  const stickers = useMemo(() => {
    if (!campaign) return [];
    const mobile = innerWidth < 640;
    const configured = mobile
      ? campaign.maximumMobileStickers
      : campaign.maximumDesktopStickers;
    const count = campaign.assets.length
      ? mobile
        ? Math.max(16, Math.min(24, configured * 3))
        : Math.max(28, Math.min(42, configured * 3))
      : 0;
    const pool = [...campaign.assets].sort(() => Math.random() - 0.5);
    return Array.from({ length: count }, (_, i) => {
      const lane = (i + 0.5) / count;
      const direction = Math.random() > 0.5 ? 1 : -1;
      const sway =
        (mobile ? 7 + Math.random() * 18 : 10 + Math.random() * 30) * direction;
      return {
        src: pool[i % pool.length],
        left: Math.max(
          2,
          Math.min(
            94,
            lane * 100 - 2 + (Math.random() - 0.5) * (mobile ? 10 : 14),
          ),
        ),
        size: mobile ? 25 + Math.random() * 28 : 30 + Math.random() * 38,
        rotate: -45 + Math.random() * 90,
        tilt: 25 + Math.random() * 70,
        delay: Math.random() * 1500,
        duration: mobile
          ? 1800 + Math.random() * 1100
          : 1900 + Math.random() * 1300,
        sway,
        depth: 0.82 + Math.random() * 0.3,
        opacity: 0.9 + Math.random() * 0.1,
      };
    });
  }, [campaign]);
  if (!campaign || stage === "idle") return null;
  const close = (outcome: string) => {
    mark(campaign, outcome);
    setStage("idle");
    trackAnalytics("sticker_drop_dismissed", {
      entityType: "sticker_drop",
      entityId: campaign.id,
      entityName: campaign.slug,
      metadata: { market: market || "unknown", placement: placement(location) },
    });
  };
  const destination = market ? campaign.destinations[market] : null;
  const copy = campaign.copy[locale];
  const product = destination?.product;
  const choose = (value: "turkiye" | "international") => {
    setMarket(value);
    setActiveShoppingRegion(value === "turkiye" ? "TR" : "INTERNATIONAL");
    trackAnalytics("sticker_drop_market_selected", {
      entityType: "sticker_drop",
      entityId: campaign.id,
      metadata: { market: value },
    });
  };
  const add = () => {
    if (!product || !product.available) return;
    const settings = loadShopSettings();
    const current = settings.printProducts.find((x) => x.id === product.id);
    if (!current) return;
    const result = addItemToCart(
      {
        id: `product-${current.id}`,
        productId: current.id,
        kind: "product",
        title: current.name,
        imageUrl: current.imageUrl,
        priceUsdCents: current.priceUsdCents,
        canonicalCurrency: current.priceCurrency,
        canonicalPriceMinor: current.priceMinor,
        quantity: 1,
        maxQuantity: current.maxPerUser,
        category: "Stickers",
      },
      current.maxPerUser,
      "TR",
    );
    if (result.ok) {
      setAdded(true);
      mark(campaign, "added_to_basket");
      trackAnalytics("sticker_drop_add_to_basket", {
        entityType: "sticker_drop",
        entityId: campaign.id,
        entityName: campaign.slug,
        metadata: {
          market: "turkiye",
          destinationType: destination?.type || "local_product",
        },
      });
    }
  };
  return (
    <>
      {stage === "falling" && (
        <div
          className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
          aria-hidden="true"
        >
          <style>{`@keyframes stickerConfettiRain{0%{transform:translate3d(0,-90px,0) rotate(var(--r)) scale(var(--z));opacity:0}7%{opacity:var(--o)}24%{transform:translate3d(calc(var(--s)*.35),22vh,0) rotate(calc(var(--r) + var(--t)*.3)) scale(var(--z))}49%{transform:translate3d(calc(var(--s)*-.2),51vh,0) rotate(calc(var(--r) + var(--t)*.65)) scale(var(--z))}74%{transform:translate3d(calc(var(--s)*.45),80vh,0) rotate(calc(var(--r) + var(--t)*.9)) scale(var(--z));opacity:var(--o)}91%{opacity:var(--o)}100%{transform:translate3d(var(--s),112vh,0) rotate(calc(var(--r) + var(--t))) scale(var(--z));opacity:0}}`}</style>
          {stickers.map((s, i) => (
            <img
              key={i}
              src={s.src}
              alt=""
              aria-hidden="true"
              className="absolute -top-32 object-contain will-change-transform [filter:drop-shadow(0_5px_7px_rgba(20,18,15,.12))]"
              style={
                {
                  left: `${s.left}%`,
                  width: s.size,
                  height: s.size,
                  animation: `stickerConfettiRain ${s.duration}ms cubic-bezier(.32,.05,.78,.55) ${s.delay}ms both`,
                  "--r": `${s.rotate}deg`,
                  "--t": `${s.tilt}deg`,
                  "--s": `${s.sway}px`,
                  "--z": s.depth,
                  "--o": s.opacity,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
      {stage === "modal" && (
        <div
          className="fixed inset-0 z-[95] grid place-items-center bg-ink/60 p-3 backdrop-blur-[2px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close("dismissed");
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sticker-drop-title"
            className="relative grid max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-[1120px] grid-rows-[minmax(34dvh,42dvh)_minmax(0,1fr)] overflow-hidden border border-ink/20 bg-paper shadow-[0_24px_80px_rgba(20,18,15,.24)] md:max-h-[min(780px,calc(100vh-48px))] md:w-[calc(100vw-64px)] md:grid-cols-[58%_42%] md:grid-rows-1"
          >
            <button
              onClick={() => close("dismissed")}
              className="absolute right-2 top-2 z-20 grid h-11 w-11 place-items-center border border-ink/15 bg-paper/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral md:right-3 md:top-3"
              aria-label="Close Sticker Drop"
            >
              <X />
            </button>
            <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-[#eee7d8] p-3 sm:p-5 md:p-8">
              <span className="absolute bottom-3 left-3 z-10 border border-ink/15 bg-paper/90 px-2.5 py-1 text-[10px] font-bold tracking-[.18em]">
                {locale === "tr" ? "YENİ STICKER PAKETİ" : "NEW STICKER DROP"}
              </span>
              {product?.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="relative h-full w-full">
                  {campaign.assets
                    .slice(0, innerWidth < 640 ? 5 : 8)
                    .map((src, i) => (
                      <img
                        key={src + i}
                        src={src}
                        alt=""
                        className="absolute h-[34%] w-[34%] object-contain [filter:drop-shadow(0_5px_7px_rgba(20,18,15,.12))]"
                        style={{
                          left: `${8 + ((i * 23) % 62)}%`,
                          top: `${7 + ((i * 29) % 54)}%`,
                          transform: `rotate(${-14 + ((i * 9) % 27)}deg) scale(${0.86 + (i % 3) * 0.12})`,
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
            <div className="min-h-0 overflow-y-auto px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9 md:px-10 md:pb-10 md:pt-12">
              <p className="eyebrow text-coral">
                {locale === "tr" ? "STÜDYODAN YENİ" : "NEW FROM THE STUDIO"}
              </p>
              <h2
                id="sticker-drop-title"
                className="mt-2 pr-8 font-serif text-3xl leading-[1.05] sm:text-4xl lg:text-5xl"
              >
                {product?.title || copy.title}
              </h2>
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-ink/65 sm:text-base">
                {product?.description || copy.description}
              </p>
              {campaign.destinations.turkiye &&
                campaign.destinations.international && (
                  <label className="mt-4 block text-sm font-semibold">
                    {locale === "tr" ? "Alışveriş bölgesi" : "Shopping region"}
                    <select
                      value={market || ""}
                      onChange={(e) => choose(e.target.value as any)}
                      className="admin-input"
                    >
                      <option value="">
                        {locale === "tr"
                          ? "Bir bölge seçin"
                          : "Choose a region"}
                      </option>
                      <option value="turkiye">
                        {locale === "tr"
                          ? "Türkiye’den alışveriş"
                          : "Shopping in Türkiye"}
                      </option>
                      <option value="international">
                        {locale === "tr"
                          ? "Uluslararası alışveriş"
                          : "Shopping internationally"}
                      </option>
                    </select>
                  </label>
                )}
              {product && (
                <div className="mt-5 border-y border-ink/10 py-4">
                  <p className="font-serif text-2xl font-bold">
                    {(product.priceMinor / 100).toLocaleString(
                      locale === "tr" ? "tr-TR" : "en-US",
                      { style: "currency", currency: product.currency },
                    )}
                  </p>
                  {market === "turkiye" && product.freeShippingInTurkiye && (
                    <p className="mt-2 text-sm text-ink/60">
                      Free shipping within Türkiye
                    </p>
                  )}
                  {market === "international" && (
                    <p className="mt-2 text-sm text-ink/60">
                      Available through Aida’s international shop
                    </p>
                  )}
                  {product.soldOut && (
                    <p className="mt-2 font-bold text-coral">Sold Out</p>
                  )}
                </div>
              )}
              {added ? (
                <div className="mt-5">
                  <p className="font-serif text-2xl">Added to your basket.</p>
                  <button
                    onClick={() => setStage("idle")}
                    className="button-secondary mt-3"
                  >
                    <ShoppingBag size={16} /> Continue browsing
                  </button>
                </div>
              ) : destination?.type === "local_product" &&
                market === "turkiye" ? (
                <button
                  className="button-primary mt-5 w-full"
                  disabled={!product?.available}
                  onClick={add}
                >
                  {locale === "tr"
                    ? "Sticker paketini sepete ekle"
                    : "Add sticker pack to basket"}
                </button>
              ) : destination?.url ? (
                <a
                  href={destination.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary mt-5 w-full"
                  onClick={() => {
                    mark(campaign, "external_click");
                    trackAnalytics("sticker_drop_external_product_clicked", {
                      entityType: "sticker_drop",
                      entityId: campaign.id,
                      entityName: campaign.slug,
                      metadata: {
                        market: market || "international",
                        destinationType: destination.type,
                      },
                    });
                  }}
                >
                  Shop the sticker pack <ExternalLink size={16} />
                </a>
              ) : market ? (
                <button
                  disabled
                  className="button-primary mt-5 w-full opacity-50"
                >
                  Unavailable
                </button>
              ) : null}
              <button
                onClick={() => close("dismissed")}
                className="mt-3 min-h-11 w-full text-sm font-semibold underline underline-offset-4"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
