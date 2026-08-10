import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { SiKick, SiTiktok, SiTwitch } from "react-icons/si";
import { useLocale } from "@/lib/locale";
import { useShopSettings } from "@/hooks/use-shop-settings";
import type { ManagedProduct } from "@/lib/store";
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
    read: "Read the story",
    live: "PAINTED LIVE",
    liveTitle: "See tomorrow’s window before it becomes a print.",
    liveBody:
      "Each window starts live in Aida’s studio. Join the painting session on TikTok, Twitch or Kick and watch the next piece take shape before it appears here.",
    watch: "Watch live",
    archive: "THE PROJECT SO FAR",
    archiveTitle: "The windows so far.",
    archiveHelp: "Newest first. Scroll back through the project to Day 01.",
    easel: "Today’s window is still being prepared.",
    more: "Show more windows",
    empty: "The first window is on its way.",
    emptyBody:
      "Aida is still working on the first piece. Follow the live sessions or join the Newsletter to see the project begin.",
    next: "FROM THE PROJECT",
    nextTitle: "Follow the next window.",
    nextBody:
      "New paintings, little stories and print releases from 100 Windows, sent through Aida’s Newsletter.",
    submit: "Follow the next window",
    remaining: (n: number) => `${n} windows still to come`,
  },
  tr: {
    eyebrow: "HER GÜN YENİ BİR RESİM",
    heading: "100 Pencere. 100 Gün. 100 Hikâye.",
    body: "Aida, 100 gün boyunca her gün farklı bir pencereyi yağlı pastel bir resme dönüştürüyor. Şimdiye kadar tamamlanan işleri keşfet, baskılara göz at ve sıradaki resmi daha bitmeden canlı yayında izle.",
    today: "BUGÜNÜN PENCERESİ",
    read: "Hikâyeyi oku",
    live: "CANLI YAYINDA ÇİZİLDİ",
    liveTitle: "Yarının penceresini baskıya dönüşmeden önce gör.",
    liveBody:
      "Her yeni pencere önce Aida’nın atölyesinde canlı yayında başlıyor. TikTok, Twitch veya Kick’te yayına katıl ve sıradaki resmin daha tamamlanmadan nasıl ortaya çıktığını izle.",
    watch: "Canlı izle",
    archive: "ŞİMDİYE KADAR",
    archiveTitle: "Şimdiye kadarki pencereler.",
    archiveHelp:
      "En yeni çalışmadan başlayarak projenin ilk gününe kadar geri dön.",
    easel: "Bugünün penceresi hâlâ hazırlanıyor.",
    more: "Daha fazla pencere göster",
    empty: "İlk pencere yolda.",
    emptyBody:
      "Aida hâlâ ilk parça üzerinde çalışıyor. Projenin başlangıcını görmek için canlı yayınları takip et veya Bültene katıl.",
    next: "PROJEDEN",
    nextTitle: "Sıradaki pencereyi takip et.",
    nextBody:
      "100 Pencere’den yeni resimler, küçük hikâyeler ve baskı haberleri Aida’nın Bülteni ile e-postana gelsin.",
    submit: "Sıradaki pencereyi takip et",
    remaining: (n: number) => `${n} pencere daha gelecek`,
  },
} as const;

export function chronology(products: ManagedProduct[]) {
  const asc = [...products].sort(
    (a, b) =>
      Date.parse(a.createdAt || "") - Date.parse(b.createdAt || "") ||
      a.id.localeCompare(b.id),
  );
  const days = new Map(asc.map((product, index) => [product.id, index + 1]));
  return [...asc]
    .reverse()
    .map((product) => ({ product, day: days.get(product.id)! }));
}

function storyHref(product: ManagedProduct, section: "today" | "archive") {
  return `/shop/turkiye/prints/${encodeURIComponent(product.slug || product.id)}?from=100-windows&section=${section}`;
}

function excerpt(product: ManagedProduct) {
  return product.description;
}

export default function HundredWindows() {
  const { locale } = useLocale();
  const c = copy[locale];
  const settings = useShopSettings();
  const [visible, setVisible] = useState(15);
  const day = Math.min(
    100,
    Math.max(1, settings.hundredWindows?.currentDay || 1),
  );
  const current = settings.printProducts.find(
    (product) =>
      product.id === settings.hundredWindows?.currentProductId &&
      product.isHundredWindowsProduct,
  );
  const archive = useMemo(
    () =>
      chronology(
        settings.printProducts.filter(
          (product) =>
            product.isHundredWindowsProduct &&
            ["published", "sold_out"].includes(String(product.status)),
        ),
      ),
    [settings.printProducts],
  );
  const heroBase = settings.hundredWindows?.heroImageUrl || portrait;
  const heroImage = `${heroBase}${heroBase.includes("?") ? "&" : "?"}v=${encodeURIComponent(settings.hundredWindows?.heroUpdatedAt || "current")}`;

  usePageMeta(
    locale === "tr"
      ? "100 Pencere, 100 Gün | Aida Ramezani"
      : "100 Windows, 100 Days | Aida Ramezani",
    locale === "tr"
      ? "Aida Ramezani’nin 100 günlük resim projesini takip et."
      : "Follow Aida Ramezani’s daily 100 Windows painting project.",
  );
  useEffect(() => {
    trackAnalytics("hundred_windows_page_view");
  }, []);
  useEffect(() => {
    let canonical = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    const existed = Boolean(canonical),
      previous = canonical?.href || "";
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
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <strong>
              {locale === "tr"
                ? `${String(day).padStart(2, "0")}. GÜN / 100`
                : `DAY ${String(day).padStart(2, "0")} OF 100`}
            </strong>
            <div>
              <span style={{ width: `${day}%` }} />
              <i style={{ left: `${day}%` }} />
            </div>
            {day < 100 && <small>{c.remaining(100 - day)}</small>}
          </div>
        </div>
        <figure>
          <img
            src={heroImage}
            alt={
              locale === "tr"
                ? "100 Pencere proje kapağı"
                : "100 Windows project cover"
            }
          />
          <figcaption>
            {locale === "tr"
              ? `100 GÜNÜN ${String(day).padStart(2, "0")}. GÜNÜ`
              : `DAY ${String(day).padStart(2, "0")} OF 100`}
          </figcaption>
        </figure>
      </section>

      {current && ["published", "sold_out"].includes(String(current.status)) ? (
        <section className="windows-current" id="todays-window">
          <Link
            href={storyHref(current, "today")}
            className="windows-current-art"
            aria-label={`${c.read}: ${current.name}`}
          >
            <img src={current.imageUrl} alt={current.altText || current.name} />
          </Link>
          <div className="windows-current-copy">
            <p className="windows-eyebrow">
              {c.today} ·{" "}
              {locale === "tr"
                ? `${String(day).padStart(2, "0")}. GÜN / 100`
                : `DAY ${String(day).padStart(2, "0")} / 100`}
            </p>
            <h2>{current.name}</h2>
            <p className="windows-story-excerpt">{excerpt(current)}</p>
            <Link
              className="windows-story-link"
              href={storyHref(current, "today")}
              onClick={() =>
                trackAnalytics("hundred_windows_current_product_click")
              }
            >
              {c.read} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      ) : (
        <section className="windows-current windows-easel" id="todays-window">
          <div>
            <p className="windows-eyebrow">{c.today}</p>
            <h2>
              {locale === "tr"
                ? `${day}. GÜN`
                : `DAY ${String(day).padStart(2, "0")}`}
            </h2>
            <p>{c.easel}</p>
          </div>
        </section>
      )}

      <section className="windows-archive" id="project-so-far">
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
            onClick={() => setVisible((value) => value + 15)}
          >
            {c.more}
          </button>
        )}
      </section>

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
            .filter((item) => /^https:\/\//.test(item[1] || ""))
            .map(([name, url, Icon, event]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackAnalytics(event)}
              >
                <Icon aria-hidden="true" />
                <span>
                  <strong>{name}</strong>
                  <small>{c.watch} ↗</small>
                </span>
              </a>
            ))}
        </div>
      </section>

      <section className="windows-newsletter">
        <p className="windows-eyebrow">{c.next}</p>
        <h2>{c.nextTitle}</h2>
        <p>{c.nextBody}</p>
        <StudioLetterSignup
          variant="compact"
          context="hundred-windows"
          submitLabel={{
            en: "Follow the next window",
            tr: "Sıradaki pencereyi takip et",
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

function WindowCard({
  product,
  day,
  current,
  locale,
}: {
  product: ManagedProduct;
  day: number;
  current: boolean;
  locale: "en" | "tr";
}) {
  const c = copy[locale],
    href = storyHref(product, "archive");
  return (
    <article className="window-card">
      <div className="window-card-day">
        {locale === "tr"
          ? `${String(day).padStart(2, "0")}. GÜN`
          : `DAY ${String(day).padStart(2, "0")}`}
        {current && <em>{locale === "tr" ? "BUGÜN" : "TODAY"}</em>}
      </div>
      <Link
        className="window-card-art"
        href={href}
        aria-label={`${c.read}: ${product.name}`}
      >
        <img
          loading="lazy"
          decoding="async"
          src={product.imageUrl}
          alt={product.altText || product.name}
        />
      </Link>
      <div className="window-card-body">
        <h3>
          <Link href={href}>{product.name}</Link>
        </h3>
        <p>{excerpt(product)}</p>
        <div>
          <Link
            className="windows-story-link"
            href={href}
            onClick={() =>
              trackAnalytics("hundred_windows_archive_product_click")
            }
          >
            {c.read} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
