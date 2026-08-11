import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Instagram, Mail, Music2, Youtube } from "lucide-react";
import {
  SiDiscord,
  SiInstagram,
  SiKick,
  SiTiktok,
  SiTwitch,
  SiYoutube,
} from "react-icons/si";
import { portrait } from "@/lib/assets";
import originalPaintingsImage from "@assets/links-original-paintings.jpg";
import printsGoodsImage from "@assets/links-prints-goods.jpg";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { trackAnalytics } from "@/lib/analytics";
import { useLocale } from "@/lib/locale";
import CommissionLinkCard from "@/components/CommissionLinkCard";

function validExternalUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function LinksMobile({
  settings,
  locale,
}: {
  settings: ReturnType<typeof useShopSettings>;
  locale: "en" | "tr";
}) {
  const letterRef = useRef<HTMLAnchorElement>(null);
  const [letterSeen, setLetterSeen] = useState(false);
  const project = settings.hundredWindows;
  const currentProduct = [
    ...settings.printProducts,
    ...settings.originalProducts,
  ].find((item) => item.id === project?.currentProductId);
  const projectImage =
    currentProduct?.imageUrl || project?.heroImageUrl || printsGoodsImage;
  const currentDay = Math.min(100, Math.max(1, project?.currentDay || 1));
  useEffect(() => {
    const card = letterRef.current;
    if (!card || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLetterSeen(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);
  const live = [
    ["TikTok", settings.siteLinks.tiktokUrl, SiTiktok, "pink"],
    ["Twitch", settings.siteLinks.twitchUrl, SiTwitch, "lavender"],
    ["Kick", settings.siteLinks.kickUrl, SiKick, "mint"],
  ].filter((item) => validExternalUrl(item[1] as string));
  const follow = [
    ["Instagram", settings.siteLinks.instagramUrl, SiInstagram],
    ["YouTube", settings.siteLinks.youtubeUrl, SiYoutube],
  ].filter((item) => validExternalUrl(item[1] as string));
  return (
    <div className="links-mobile">
      <Link href="/" className="links-mobile__back">
        ←{" "}
        {locale === "tr"
          ? "Web sitesinin tamamını keşfet"
          : "Explore the full website"}
      </Link>
      <header className="links-mobile__profile">
        <img src={portrait} alt="Aida Ramezani" width="96" height="96" />
        <h1>Aida Ramezani</h1>
        <p>
          {locale === "tr"
            ? "Aida'nın İstanbul atölyesinden yağlı pastel resimler, stüdyo baskıları ve günlük hikâyeler."
            : "Oil pastel paintings, studio prints and daily stories from Aida’s Istanbul studio."}
        </p>
      </header>
      <Link
        href="/shop"
        className="paper-button paper-button--pink paper-button--lg links-mobile__primary"
      >
        <span>{locale === "tr" ? "Atölyeyi keşfet" : "Shop the studio"}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
      {project && (
        <Link
          href="/100-windows"
          className="links-mobile__windows"
          onClick={() => trackAnalytics("hundred_windows_links_page_click")}
        >
          <img
            src={projectImage}
            alt={
              locale === "tr"
                ? "100 Windows projesinin güncel çalışması"
                : "Current artwork from the 100 Windows project"
            }
            width="720"
            height="540"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = printsGoodsImage;
            }}
          />
          <span className="links-mobile__windows-content">
            <span className="eyebrow">100 WINDOWS · 100 DAYS</span>
            <strong>
              {locale === "tr"
                ? "100 Windows'ı takip et"
                : "Follow 100 Windows"}
            </strong>
            <span>
              {locale === "tr"
                ? "Her gün bir pencere, bir resim."
                : "One window, one painting, every day."}
            </span>
            <span className="links-mobile__progress-label">
              {locale === "tr"
                ? `100 günün ${currentDay}. günü`
                : `Day ${currentDay} of 100`}
            </span>
            <span
              className="links-mobile__progress"
              role="img"
              aria-label={
                locale === "tr"
                  ? `100 günün ${currentDay} günü tamamlandı`
                  : `Day ${currentDay} of 100 completed`
              }
            >
              <i style={{ width: `${currentDay}%` }} />
            </span>
            <b>
              {locale === "tr" ? "Projeyi keşfet" : "Explore the project"} →
            </b>
          </span>
        </Link>
      )}
      <CommissionLinkCard locale={locale} compactMobile />
      <Link
        ref={letterRef}
        href="/newsletter"
        className="links-mobile__letter"
        data-seen={letterSeen || undefined}
      >
        <span className="links-mobile__letter-stamp" aria-hidden="true">
          AR
        </span>
        <span className="links-mobile__letter-flap" aria-hidden="true" />
        <span className="eyebrow">
          {locale === "tr"
            ? "ATÖLYEDEN GELEN KUTUNA"
            : "FROM THE STUDIO TO YOUR INBOX"}
        </span>
        <strong>
          {locale === "tr"
            ? "Aida'nın atölyesinden mektuplar"
            : "Letters from Aida’s studio"}
        </strong>
        <span>
          {locale === "tr"
            ? "Hikâyeler, yeni resimler ve sırada ne olduğuna dair ilk bakışlar."
            : "Stories, new paintings and first looks at what’s coming next."}
        </span>
        <b>{locale === "tr" ? "Bültene katıl" : "Join the Newsletter"} →</b>
      </Link>
      <section className="links-mobile__section">
        <h2 className="eyebrow">
          {locale === "tr" ? "KOLEKSİYONA GÖRE KEŞFET" : "SHOP BY COLLECTION"}
        </h2>
        <div className="links-mobile__collections">
          {[
            [
              "/shop?category=originals",
              originalPaintingsImage,
              locale === "tr" ? "TEK VE ORİJİNAL" : "ONE-OF-A-KIND",
              locale === "tr" ? "Orijinal Eserler" : "Original Art",
              locale === "tr"
                ? "Aida'nın orijinal yağlı pastel resimleri."
                : "Original oil pastel paintings by Aida.",
              "butter",
            ],
            [
              "/shop?category=prints",
              printsGoodsImage,
              locale === "tr" ? "ATÖLYE EDİSYONLARI" : "STUDIO EDITIONS",
              locale === "tr" ? "Baskılar ve Ürünler" : "Prints & Goods",
              locale === "tr"
                ? "İmzalı baskılar ve küçük atölye parçaları."
                : "Signed prints and little studio pieces.",
              "blue",
            ],
          ].map(([href, image, eyebrow, title, copy, tone]) => (
            <Link
              key={href}
              href={href}
              className={`links-mobile__collection links-mobile__collection--${tone}`}
            >
              <img src={image} alt="" width="480" height="360" loading="lazy" />
              <span>
                <small>{eyebrow}</small>
                <strong>{title}</strong>
                <p>{copy}</p>
                <b>{locale === "tr" ? "Keşfet" : "Explore"} →</b>
              </span>
            </Link>
          ))}
        </div>
      </section>
      {live.length > 0 && (
        <section className="links-mobile__section">
          <h2 className="eyebrow">
            {locale === "tr"
              ? "BENİ CANLI RESİM YAPARKEN İZLE"
              : "WATCH ME PAINT LIVE"}
          </h2>
          <p className="links-mobile__section-copy">
            {locale === "tr"
              ? "Yeni eserler hayata geçerken resim sürecine katıl."
              : "Join the painting process while new pieces come to life."}
          </p>
          <div className="links-mobile__social-list">
            {live.map(([name, url, Icon, tone]) => {
              const SocialIcon = Icon as typeof SiTiktok;
              return (
                <a
                  key={name as string}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`links-mobile__social links-mobile__social--${tone}`}
                >
                  <SocialIcon />
                  <span>{name as string}</span>
                  <b>↗</b>
                </a>
              );
            })}
          </div>
        </section>
      )}
      {follow.length > 0 && (
        <section className="links-mobile__section">
          <h2 className="eyebrow">
            {locale === "tr" ? "ATÖLYEYİ TAKİP ET" : "FOLLOW THE STUDIO"}
          </h2>
          <div className="links-mobile__social-list">
            {follow.map(([name, url, Icon]) => {
              const SocialIcon = Icon as typeof SiInstagram;
              return (
                <a
                  key={name as string}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="links-mobile__social links-mobile__social--quiet"
                >
                  <SocialIcon />
                  <span>{name as string}</span>
                  <b>↗</b>
                </a>
              );
            })}
          </div>
        </section>
      )}
      {validExternalUrl(settings.siteLinks.discordUrl) && (
        <a
          href={settings.siteLinks.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="links-mobile__discord"
        >
          <SiDiscord />
          <span>
            <small>
              {locale === "tr"
                ? "ATÖLYE MESAİ SONRASI"
                : "THE STUDIO AFTER HOURS"}
            </small>
            <strong>
              {locale === "tr"
                ? "Atölye sohbetine katıl."
                : "Come hang out in the studio chat."}
            </strong>
            <p>
              {locale === "tr"
                ? "Sanat hakkında konuş, yaptıklarını paylaş ve toplulukla yayın haberlerini yakala."
                : "Talk about art, share what you're making and catch stream updates with the community."}
            </p>
            <b>{locale === "tr" ? "Discord'a katıl" : "Join the Discord"} →</b>
            <em>{locale === "tr" ? "Katılım ücretsiz." : "Free to join."}</em>
          </span>
        </a>
      )}
    </div>
  );
}

export default function Links() {
  usePageMeta(
    "Aida Ramezani | Shop & Social Links",
    "Explore Aida Ramezani's studio, 100 Windows, Newsletter and social channels.",
  );
  const settings = useShopSettings();
  const { locale } = useLocale();
  const socials = [
    [
      settings.siteLinks.instagramUrl,
      "Instagram",
      settings.siteLinks.instagramHandle,
      Instagram,
    ],
    [
      settings.siteLinks.tiktokUrl,
      "TikTok",
      settings.siteLinks.tiktokHandle,
      Music2,
    ],
    [
      settings.siteLinks.youtubeUrl,
      "YouTube",
      settings.siteLinks.youtubeLabel,
      Youtube,
    ],
    [settings.siteLinks.twitchUrl, "Twitch", "Watch Aida live", SiTwitch],
    [settings.siteLinks.kickUrl, "Kick", "Watch Aida live", SiKick],
  ].filter((item) => {
    try {
      return (
        typeof item[0] === "string" &&
        new URL(item[0] as string).protocol === "https:"
      );
    } catch {
      return false;
    }
  });
  const tiles = [
    {
      href: "/shop?category=originals",
      image: originalPaintingsImage,
      title: locale === "tr" ? "Orijinal Eserler" : "Original Art",
      copy:
        locale === "tr"
          ? "Aida'nın tek ve orijinal yağlı pastel resimleri."
          : "One-of-a-kind oil pastel paintings by Aida.",
    },
    {
      href: "/shop?category=prints",
      image: printsGoodsImage,
      title: locale === "tr" ? "Baskılar ve Ürünler" : "Prints & Goods",
      copy:
        locale === "tr"
          ? "İmzalı baskılar ve küçük atölye parçaları."
          : "Signed prints and small studio pieces.",
    },
  ];
  return (
    <main className="links-page mx-auto min-h-screen w-full max-w-[600px] px-5 py-8 md:py-12">
      <LinksMobile settings={settings} locale={locale} />
      <div className="links-desktop">
        <Link
          href="/"
          className="text-sm font-semibold underline underline-offset-4"
        >
          ← {locale === "tr" ? "Web sitesine dön" : "Full website"}
        </Link>
        <header className="mt-8 text-center">
          <img
            src={portrait}
            alt="Aida Ramezani"
            className="mx-auto h-28 w-28 rounded-full object-cover object-[center_25%]"
          />
          <h1 className="mt-5 text-4xl">Aida Ramezani</h1>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink/65">
            {settings.siteLinks.linkHubDescription}
          </p>
        </header>
        <Link
          href="/shop"
          className="button-primary mt-7 flex min-h-14 w-full items-center justify-center"
        >
          {locale === "tr" ? "Atölyeyi keşfet" : "Shop the studio"}
        </Link>
        <Link
          href="/100-windows"
          onClick={() => trackAnalytics("hundred_windows_links_page_click")}
          className="links-windows-card mt-3 block border border-ink/10 bg-blue/15 p-5"
        >
          <p className="eyebrow">100 WINDOWS · 100 DAYS</p>
          <h2 className="mt-2 text-3xl">
            {locale === "tr" ? "Projeyi takip et" : "Follow 100 Windows"}
          </h2>
          <p className="mt-2 text-sm text-ink/65">
            {locale === "tr"
              ? `100 günün ${settings.hundredWindows?.currentDay || 1}. günü`
              : `Day ${settings.hundredWindows?.currentDay || 1} of 100`}
          </p>
        </Link>
        <Link
          href="/newsletter"
          className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 border border-coral bg-paper px-5 font-semibold text-coral"
        >
          <Mail size={18} aria-hidden="true" />
          {locale === "tr" ? "Bültene katıl" : "Join the Newsletter"}
        </Link>
        <CommissionLinkCard locale={locale} />
        <section className="mt-5 grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group overflow-hidden bg-ink text-paper"
            >
              <img
                src={tile.image}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <span className="block p-4">
                <strong className="font-serif text-xl">{tile.title}</strong>
                <span className="mt-1 block text-xs text-paper/70">
                  {tile.copy}
                </span>
              </span>
            </Link>
          ))}
        </section>
        <section className="mt-10 border-t border-ink/15 pt-7">
          <h2 className="eyebrow text-center">
            {locale === "tr" ? "Atölyeyi takip et" : "Follow the studio"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {socials.map(([url, name, handle, Icon]) => {
              const I = Icon as typeof Instagram;
              return (
                <a
                  key={name as string}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 items-center justify-center gap-2 border border-ink/15"
                >
                  <I size={17} />
                  <span>{name as string}</span>
                  <span className="sr-only">
                    {handle as string}, opens in a new tab
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
