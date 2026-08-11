import { Link } from "wouter";
import { Instagram, Mail, Music2, Youtube } from "lucide-react";
import { SiKick, SiTwitch } from "react-icons/si";
import { portrait } from "@/lib/assets";
import originalPaintingsImage from "@assets/links-original-paintings.jpg";
import printsGoodsImage from "@assets/links-prints-goods.jpg";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { trackAnalytics } from "@/lib/analytics";
import { useLocale } from "@/lib/locale";
import CommissionLinkCard from "@/components/CommissionLinkCard";

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
    <main className="mx-auto min-h-screen w-full max-w-[600px] px-5 py-8 md:py-12">
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
    </main>
  );
}
