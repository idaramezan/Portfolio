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
  useEffect(() => {
    if (location.startsWith("/admin") || started.current) return;
    fetch("/api/sticker-drop/active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ campaign: next }) => {
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
        setCampaign(next);
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
          setTimeout(() => setStage("modal"), 300);
          return;
        }
        setStage("falling");
        trackAnalytics("sticker_drop_animation_started", {
          entityType: "sticker_drop",
          entityId: next.id,
          entityName: next.slug,
          metadata: { placement: place },
        });
        setTimeout(() => {
          setStage("modal");
          trackAnalytics("sticker_drop_animation_completed", {
            entityType: "sticker_drop",
            entityId: next.id,
            entityName: next.slug,
            metadata: { placement: place },
          });
        }, next.duration);
      })
      .catch(() => undefined);
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
    const count = Math.min(
      innerWidth < 640
        ? campaign.maximumMobileStickers
        : campaign.maximumDesktopStickers,
      campaign.assets.length ? 20 : 0,
    );
    return Array.from({ length: count }, (_, i) => ({
      src: campaign.assets[i % campaign.assets.length],
      left: Math.random() * 92,
      size:
        (innerWidth < 640 ? 42 : 64) +
        Math.random() * (innerWidth < 640 ? 48 : 86),
      rotate: -35 + Math.random() * 70,
      delay: Math.random() * 700,
      duration: Math.max(1400, campaign.duration - 500 + Math.random() * 800),
      drift: -60 + Math.random() * 120,
    }));
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
          <style>{`@keyframes stickerDropFall{0%{transform:translate3d(0,-180px,0) rotate(var(--r));opacity:0}12%{opacity:1}85%{opacity:1}100%{transform:translate3d(var(--d),110vh,0) rotate(calc(var(--r) + 180deg));opacity:0}}`}</style>
          {stickers.map((s, i) => (
            <img
              key={i}
              src={s.src}
              alt=""
              aria-hidden="true"
              className="absolute -top-32 object-contain will-change-transform"
              style={
                {
                  left: `${s.left}%`,
                  width: s.size,
                  height: s.size,
                  animation: `stickerDropFall ${s.duration}ms cubic-bezier(.2,.7,.35,1) ${s.delay}ms both`,
                  "--r": `${s.rotate}deg`,
                  "--d": `${s.drift}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
      {stage === "modal" && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-ink/55 p-3 sm:p-6">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sticker-drop-title"
            className="relative max-h-[calc(100dvh-24px)] w-full max-w-3xl overflow-y-auto border border-ink/15 bg-paper p-5 shadow-2xl sm:p-8"
          >
            <button
              onClick={() => close("dismissed")}
              className="absolute right-2 top-2 grid min-h-11 min-w-11 place-items-center focus-visible:ring-2 focus-visible:ring-coral"
              aria-label="Close Sticker Drop"
            >
              <X />
            </button>
            <div className="grid items-center gap-6 md:grid-cols-[.9fr_1.1fr]">
              <div className="grid grid-cols-2 gap-3 bg-[#f3efe6] p-4">
                {(product?.imageUrl
                  ? [product.imageUrl]
                  : campaign.assets.slice(0, 4)
                ).map((src, i) => (
                  <img
                    key={src + i}
                    src={src}
                    alt={product ? product.title : ""}
                    className="aspect-square w-full object-contain"
                  />
                ))}
              </div>
              <div>
                <p className="eyebrow text-coral">{copy.eyebrow}</p>
                <h2
                  id="sticker-drop-title"
                  className="mt-2 pr-8 font-serif text-3xl sm:text-4xl"
                >
                  {copy.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink/65">
                  {copy.description}
                </p>
                {campaign.destinations.turkiye &&
                  campaign.destinations.international && (
                    <label className="mt-4 block text-sm font-semibold">
                      {locale === "tr"
                        ? "Alışveriş bölgesi"
                        : "Shopping region"}
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
                  <div className="mt-4 border-y border-ink/10 py-4">
                    <h3 className="font-serif text-2xl">{product.title}</h3>
                    <p className="mt-1 text-sm text-ink/60">
                      {product.description}
                    </p>
                    <p className="mt-2 font-bold">
                      {(product.priceMinor / 100).toLocaleString(
                        locale === "tr" ? "tr-TR" : "en-US",
                        { style: "currency", currency: product.currency },
                      )}
                    </p>
                    {market === "turkiye" && product.freeShippingInTurkiye && (
                      <p className="mt-1 text-xs text-ink/55">
                        Free shipping within Türkiye
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
        </div>
      )}
    </>
  );
}
