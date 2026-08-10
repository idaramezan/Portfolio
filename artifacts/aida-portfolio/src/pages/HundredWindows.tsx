import { useEffect, useMemo, useState } from "react";
import { SiKick, SiTiktok, SiTwitch } from "react-icons/si";
import { useLocale } from "@/lib/locale";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import {
  getActiveShoppingRegion,
  hasActiveShoppingRegionPreference,
  setActiveShoppingRegion,
  type ManagedProduct,
  type ShoppingRegion,
} from "@/lib/store";
import { PaperButton } from "@/components/ui/playful-studio";
import StudioLetterSignup from "@/components/StudioLetterSignup";
import { usePageMeta } from "@/hooks/use-page-meta";
import { trackAnalytics } from "@/lib/analytics";
import { portrait } from "@/lib/assets";
const copy = {
  en: {
    eyebrow: "A DAILY PAINTING PROJECT",
    heading: "100 Windows. 100 Days. 100 Stories.",
    body: "Every day, Aida turns a different window into an oil pastel painting. Follow the project as it grows, discover the prints released so far and watch the next one being created live.",
    today: "TODAY’S WINDOW",
    live: "PAINTED LIVE",
    liveTitle: "See tomorrow’s window before it becomes a print.",
    liveBody:
      "Each window starts live in Aida’s studio. Join the painting session on TikTok, Twitch or Kick and watch the next piece take shape before it appears here.",
    archive: "THE PROJECT SO FAR",
    archiveTitle: "The windows so far.",
    archiveHelp: "Newest first — scroll back through the project to Day 01.",
    view: "See the print",
    international: "Shop this print internationally",
    archiveInternational: "Shop internationally",
    coming: "International release coming soon",
    notify: "Tell me when it’s available",
    easel: "Today’s window is still on the easel.",
    next: "THE NEXT WINDOW",
    nextTitle: "Want tomorrow’s window in your inbox?",
    nextBody:
      "New paintings, little stories and print releases from the project, sent through Aida’s Newsletter.",
    more: "Show more windows",
    empty: "The first window is on its way.",
    emptyBody:
      "Aida is starting a 100-day painting project — one window and one story at a time.",
    shopping: "View prints for",
  },
  tr: {
    eyebrow: "HER GÜN YENİ BİR RESİM",
    heading: "100 Pencere. 100 Gün. 100 Hikâye.",
    body: "Aida, 100 gün boyunca her gün farklı bir pencereyi yağlı pastel bir resme dönüştürüyor. Şimdiye kadar tamamlanan işleri keşfet, baskılara göz at ve sıradaki resmi daha bitmeden canlı yayında izle.",
    today: "BUGÜNÜN PENCERESİ",
    live: "CANLI YAYINDA ÇİZİLİYOR",
    liveTitle: "Sıradaki pencereyi baskıya dönüşmeden önce gör.",
    liveBody:
      "Her yeni pencere önce Aida’nın atölyesinde canlı yayında başlıyor. TikTok, Twitch veya Kick’te yayına katıl ve sıradaki resmin daha tamamlanmadan nasıl ortaya çıktığını izle.",
    archive: "ŞİMDİYE KADAR",
    archiveTitle: "Şimdiye kadarki pencereler.",
    archiveHelp:
      "En yeni çalışmadan başlayarak projenin ilk gününe kadar geri dön.",
    view: "Baskıyı gör",
    international: "Uluslararası baskıyı satın al",
    archiveInternational: "Uluslararası satın al",
    coming: "Uluslararası yayını yakında",
    notify: "Hazır olduğunda haber ver",
    easel: "Bugünün penceresi hâlâ şövalede.",
    next: "SIRADAKİ PENCERE",
    nextTitle: "Sıradaki pencere e-postana gelsin mi?",
    nextBody:
      "Yeni resimler, küçük hikâyeler ve proje baskıları Aida’nın Bülteni ile e-postana gelsin.",
    more: "Daha fazla pencere göster",
    empty: "İlk pencere yolda.",
    emptyBody:
      "Aida, her gün bir pencere ve bir hikâyeyle 100 günlük resim projesine başlıyor.",
    shopping: "Baskıları görüntüle",
  },
} as const;
function chronology(products: ManagedProduct[]) {
  const asc = [...products].sort(
    (a, b) =>
      Date.parse(a.createdAt || "") - Date.parse(b.createdAt || "") ||
      a.id.localeCompare(b.id),
  );
  const days = new Map(asc.map((p, i) => [p.id, i + 1]));
  return [...asc].reverse().map((p) => ({ product: p, day: days.get(p.id)! }));
}
export default function HundredWindows() {
  const { locale } = useLocale(),
    c = copy[locale];
  const settings = useShopSettings();
  const intl = useInternationalProducts();
  const [region, setRegion] = useState<ShoppingRegion>(getActiveShoppingRegion);
  const [visible, setVisible] = useState(15);
  const day = Math.min(
    100,
    Math.max(1, settings.hundredWindows?.currentDay || 1),
  );
  usePageMeta(
    locale === "tr"
      ? "100 Pencere, 100 Gün — Aida Ramezani"
      : "100 Windows, 100 Days — Aida Ramezani",
    locale === "tr"
      ? "Aida Ramezani’nin 100 günlük resim projesini takip et: her gün bir pencere, bir yağlı pastel resim ve yeni bir hikâye."
      : "Follow Aida Ramezani’s 100-day painting project: one window, one oil pastel painting and one story each day.",
  );
  useEffect(() => {
    trackAnalytics("hundred_windows_page_view");
    if (hasActiveShoppingRegionPreference()) return;
    fetch("/api/currency")
      .then((r) => r.json())
      .then((x) => {
        const next = x.country === "TR" ? "TR" : "INTERNATIONAL";
        setRegion(next);
        setActiveShoppingRegion(next);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    let canonical = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    const existed = Boolean(canonical);
    const previous = canonical?.href || "";
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = `${location.origin}/100-windows`;
    return () => {
      if (!existed) canonical?.remove();
      else if (canonical) canonical.href = previous;
    };
  }, []);
  const archive = useMemo(
    () =>
      chronology(
        settings.printProducts.filter(
          (p) =>
            p.isHundredWindowsProduct &&
            ["published", "sold_out"].includes(String(p.status)),
        ),
      ),
    [settings.printProducts],
  );
  const current = settings.printProducts.find(
    (p) =>
      p.id === settings.hundredWindows?.currentProductId &&
      p.isHundredWindowsProduct,
  );
  useEffect(() => {
    const image = settings.hundredWindows?.heroImageUrl || current?.imageUrl;
    if (!image) return;
    let meta = document.querySelector(
      'meta[property="og:image"]',
    ) as HTMLMetaElement | null;
    const existed = Boolean(meta),
      previous = meta?.content || "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", "og:image");
      document.head.append(meta);
    }
    meta.content = new URL(image, location.origin).href;
    return () => {
      if (!existed) meta?.remove();
      else if (meta) meta.content = previous;
    };
  }, [current?.imageUrl, settings.hundredWindows?.heroImageUrl]);
  const heroBase =
    settings.hundredWindows?.heroImageUrl || current?.imageUrl || portrait;
  const heroImage = heroBase
    ? `${heroBase}${heroBase.includes("?") ? "&" : "?"}v=${encodeURIComponent(settings.hundredWindows?.heroImageUrl ? settings.hundredWindows?.heroUpdatedAt || "current" : current?.updatedAt || "current")}`
    : "";
  const socials = [
    [
      "TikTok",
      settings.siteLinks.tiktokUrl,
      SiTiktok,
      "hundred_windows_tiktok_click",
    ],
    [
      "Twitch",
      settings.siteLinks.twitchUrl,
      SiTwitch,
      "hundred_windows_twitch_click",
    ],
    ["Kick", settings.siteLinks.kickUrl, SiKick, "hundred_windows_kick_click"],
  ] as const;
  function switchRegion(next: ShoppingRegion) {
    setRegion(next);
    setActiveShoppingRegion(next);
    trackAnalytics("hundred_windows_region_switch", {
      metadata: { market: next },
    });
  }
  return (
    <main className="windows-page">
      <section className="windows-hero">
        <div>
          <p className="windows-eyebrow">{c.eyebrow}</p>
          <h1>{c.heading}</h1>
          <p>{c.body}</p>
          <div
            className="windows-progress"
            role="progressbar"
            aria-label={`${locale === "tr" ? `${day}. gün` : `Day ${day}`} of 100`}
            aria-valuenow={day}
            aria-valuemin={1}
            aria-valuemax={100}
          >
            <strong>
              {locale === "tr"
                ? `${String(day).padStart(2, "0")}. GÜN / 100`
                : `DAY ${String(day).padStart(2, "0")} / 100`}
            </strong>
            <div>
              <span style={{ width: `${day}%` }} />
              <i style={{ left: `${day}%` }} />
            </div>
          </div>
        </div>
        {heroImage && (
          <figure>
            <img
              src={heroImage}
              alt={
                settings.hundredWindows?.heroImageUrl
                  ? locale === "tr"
                    ? "100 Pencere projesinin bugünkü stüdyo kapağı"
                    : "Today’s 100 Windows studio project cover"
                  : current?.altText || current?.name || "100 Windows project"
              }
            />
            <figcaption>
              {locale === "tr"
                ? `100 GÜNÜN ${String(day).padStart(2, "0")}. GÜNÜ`
                : `DAY ${String(day).padStart(2, "0")} OF 100`}
            </figcaption>
          </figure>
        )}
      </section>
      <div className={`windows-region windows-region--${region.toLowerCase()}`}>
        <span>{c.shopping}</span>
        {(["TR", "INTERNATIONAL"] as const).map((x) => (
          <button
            key={x}
            aria-pressed={region === x}
            onClick={() => switchRegion(x)}
          >
            {x === "TR" ? "Türkiye" : "International"}
          </button>
        ))}
      </div>
      {current && ["published", "sold_out"].includes(String(current.status)) ? (
        <Featured
          product={current}
          day={day}
          region={region}
          intl={intl.products}
          loading={intl.loading}
          locale={locale}
        />
      ) : (
        <section className="windows-current windows-easel">
          <p className="windows-eyebrow">{c.today}</p>
          <h2>
            {locale === "tr"
              ? `${day}. GÜN`
              : `DAY ${String(day).padStart(2, "0")}`}
          </h2>
          <p>{c.easel}</p>
        </section>
      )}
      <section className="windows-live">
        <div className="windows-live-mark">
          <span /> LIVE
        </div>
        <div>
          <p className="windows-eyebrow">{c.live}</p>
          <h2>{c.liveTitle}</h2>
          <p>{c.liveBody}</p>
        </div>
        <div className="windows-socials">
          {socials
            .filter((x) => /^https:\/\//.test(x[1] || ""))
            .map(([name, url, Icon, event]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Watch Aida on ${name}`}
                onClick={() => trackAnalytics(event)}
              >
                <Icon />{" "}
                {locale === "tr" ? `${name}’ta izle` : `Watch on ${name}`} ↗
              </a>
            ))}
        </div>
      </section>
      <section className="windows-archive">
        <p className="windows-eyebrow">{c.archive}</p>
        <h2>{c.archiveTitle}</h2>
        <p>{c.archiveHelp}</p>
        {archive.length ? (
          <div className="windows-grid">
            {archive.slice(0, visible).map(({ product, day: productDay }) => (
              <WindowCard
                key={product.id}
                product={product}
                day={productDay}
                current={product.id === current?.id}
                region={region}
                intl={intl.products}
                loading={intl.loading}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div className="windows-empty">
            <h3>{c.empty}</h3>
            <p>{c.emptyBody}</p>
          </div>
        )}
        {visible < archive.length && (
          <button
            className="paper-button paper-button--pink paper-button--md windows-more"
            onClick={() => setVisible((v) => v + 15)}
          >
            {c.more}
          </button>
        )}
      </section>
      <section className="windows-newsletter">
        <p className="windows-eyebrow">{c.next}</p>
        <h2>{c.nextTitle}</h2>
        <p>{c.nextBody}</p>
        <StudioLetterSignup
          variant="compact"
          context="hundred-windows"
          submitLabel={{
            en: "Send me the next window",
            tr: "Sıradaki pencereyi gönder",
          }}
          trustText={{
            en: "Free to join · Occasional emails · Unsubscribe anytime",
            tr: "Katılım ücretsiz · Ara sıra e-posta · İstediğin zaman ayrıl",
          }}
        />
      </section>
    </main>
  );
}
function resolveInternational(product: ManagedProduct, intl: any[]) {
  return product.fourthwallProductId
    ? intl.find((x) => x.id === product.fourthwallProductId)
    : undefined;
}
function Featured({ product, day, region, intl, locale, loading }: any) {
  const item = resolveInternational(product, intl),
    international = region === "INTERNATIONAL",
    available = international
      ? item
        ? item.available
        : Boolean(product.fourthwallProductUrl)
      : product.available;
  const price = international
    ? item?.price?.formatted
    : new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      }).format((product.priceMinor ?? product.priceUsdCents) / 100);
  const href = international
    ? item?.externalUrl || product.fourthwallProductUrl
    : `/shop/turkiye/prints/${product.slug}`;
  return (
    <section className="windows-current">
      <div className="windows-current-art">
        <img src={product.imageUrl} alt={product.altText || product.name} />
      </div>
      <div className="windows-current-copy">
        <p className="windows-eyebrow">
          {copy[locale as "en" | "tr"].today} ·{" "}
          {locale === "tr"
            ? `${String(day).padStart(2, "0")}. GÜN / 100`
            : `DAY ${String(day).padStart(2, "0")} / 100`}
        </p>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        {international &&
        loading &&
        (product.fourthwallProductId || product.fourthwallProductUrl) ? (
          <div
            className="windows-commerce-skeleton"
            aria-label={
              locale === "tr"
                ? "Uluslararası baskı bilgisi yükleniyor"
                : "Loading international print information"
            }
          >
            <span />
            <span />
          </div>
        ) : available && price ? (
          <strong>{price}</strong>
        ) : international && href ? (
          <p className="windows-price-note">
            {locale === "tr"
              ? "Güncel fiyat Fourthwall’da gösterilir."
              : "Current price shown on Fourthwall."}
          </p>
        ) : (
          <p>
            <strong>
              {international
                ? copy[locale as "en" | "tr"].coming
                : locale === "tr"
                  ? "Şu anda mevcut değil"
                  : "Currently unavailable"}
            </strong>
          </p>
        )}
        {!loading && href && available && international ? (
          <a
            className="paper-button paper-button--pink paper-button--md windows-external-cta"
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackAnalytics("hundred_windows_fourthwall_click")}
          >
            <span>{copy[locale as "en" | "tr"].international}</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : !international && href && available ? (
          <PaperButton
            href={href}
            arrow
            onClick={() =>
              trackAnalytics("hundred_windows_current_product_click")
            }
          >
            {locale === "tr" ? "Bu baskıyı gör" : "View this print"}
          </PaperButton>
        ) : null}
        {international && !loading && !href && (
          <p className="windows-coming-note">
            {locale === "tr"
              ? "Bu pencere henüz uluslararası mağazaya ulaşmadı."
              : "This window has not reached the international shop yet."}
          </p>
        )}
      </div>
    </section>
  );
}
function WindowCard({
  product,
  day,
  current,
  region,
  intl,
  locale,
  loading,
}: any) {
  const item = resolveInternational(product, intl),
    international = region === "INTERNATIONAL",
    available = international
      ? item
        ? item.available
        : Boolean(product.fourthwallProductUrl)
      : product.available;
  const price = international
    ? item?.price?.formatted
    : new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      }).format((product.priceMinor ?? product.priceUsdCents) / 100);
  const href = international
    ? item?.externalUrl || product.fourthwallProductUrl
    : `/shop/turkiye/prints/${product.slug}`;
  return (
    <article className="window-card">
      <div className="window-card-day">
        DAY {String(day).padStart(2, "0")} {current && <em>TODAY</em>}
      </div>
      <div className="window-card-art">
        <img
          loading="lazy"
          decoding="async"
          src={product.imageUrl}
          alt={product.altText || product.name}
        />
      </div>
      <div className="window-card-body">
        <h3>{product.name}</h3>
        {international &&
        loading &&
        (product.fourthwallProductId || product.fourthwallProductUrl) ? (
          <div
            className="windows-card-skeleton"
            aria-label="Loading international print"
          />
        ) : available && price ? (
          <strong>{price}</strong>
        ) : international && href ? (
          <span>
            {locale === "tr" ? "Fiyat Fourthwall’da" : "Price on Fourthwall"}
          </span>
        ) : (
          <span>
            {international
              ? copy[locale as "en" | "tr"].coming
              : locale === "tr"
                ? "Mevcut değil"
                : "Unavailable"}
          </span>
        )}
        <div>
          {!loading && href && available ? (
            <a
              href={href}
              target={international ? "_blank" : undefined}
              rel={international ? "noreferrer" : undefined}
              onClick={() =>
                trackAnalytics(
                  international
                    ? "hundred_windows_fourthwall_click"
                    : "hundred_windows_archive_product_click",
                )
              }
            >
              {international
                ? copy[locale as "en" | "tr"].archiveInternational
                : copy[locale as "en" | "tr"].view}{" "}
              {international ? "↗" : "→"}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
export { chronology };
