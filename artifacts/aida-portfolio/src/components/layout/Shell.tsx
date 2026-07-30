import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Newsletter from "./Newsletter";
import { studioLetterCopy } from "@/components/StudioLetterSignup";
import CartDrawer from "@/components/CartDrawer";
import {
  getCartCount,
  loadShopSettings,
  setActiveShoppingRegion,
  type ShoppingRegion,
} from "@/lib/store";
import { useLocale } from "@/lib/locale";

const NAV_LINKS = [
  { href: "/shop/turkiye", en: "Türkiye Shop", tr: "Türkiye Mağaza" },
  { href: "/shop/international", en: "International", tr: "Uluslararası" },
  { href: "/studio-letter", en: "Studio Letter", tr: "Stüdyo Mektubu" },
  { href: "/about", en: "About", tr: "Hakkında" },
];

const INFORMATION_LINKS = [
  { href: "/about", label: "About" },
  { href: "/how-to-collect", label: "How to Collect" },
];

const TURKIYE_LINKS = [
  { href: "/shop/turkiye/originals", label: "Originals" },
  { href: "/shop/turkiye/prints", label: "Prints & Goods" },
  { href: "/shop/turkiye/mystery-mail", label: "Mystery Mail" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const previousPathRef = useRef<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState(false);
  const activeRegion: ShoppingRegion =
    location.startsWith("/shop/international") ||
    location.startsWith("/basket/international")
      ? "INTERNATIONAL"
      : "TR";
  const [cartCount, setCartCount] = useState(getCartCount(activeRegion));
  const { locale, setLocale } = useLocale();
  const newsletterCopy = studioLetterCopy[locale];
  const siteLinks = loadShopSettings().siteLinks;
  const isHome = location === "/";
  const manageAnalytics = () =>
    window.dispatchEvent(new CustomEvent("analytics:manage"));

  useEffect(() => {
    if (location.startsWith("/shop/") || location.startsWith("/basket/"))
      setActiveShoppingRegion(activeRegion);
    const sync = () => setCartCount(getCartCount(activeRegion));
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, [activeRegion]);

  useEffect(() => {
    fetch("/api/newsletter/event-banner?placement=home")
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setActiveEvent(Boolean(result?.config)))
      .catch(() => setActiveEvent(false));
  }, []);

  useEffect(() => {
    const pathname = location.split(/[?#]/, 1)[0];
    if (
      previousPathRef.current !== null &&
      previousPathRef.current !== pathname
    ) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    previousPathRef.current = pathname;
  }, [location]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    const menu = mobileMenuRef.current;
    const focusable = () =>
      Array.from(
        menu?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => setIsMobileMenuOpen(false), [location]);

  return (
    <div data-public-site className="min-h-[100dvh] flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b border-ink/5">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 py-0 md:h-auto md:px-8 md:py-5">
          <Link
            href="/"
            className="z-50 shrink-0 whitespace-nowrap font-serif text-lg font-bold tracking-tighter text-ink transition-colors hover:text-coral sm:text-xl md:text-2xl lg:text-3xl"
          >
            Aida Ramezani
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-5 lg:gap-7"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-medium text-sm lg:text-base link-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-4 focus-visible:ring-offset-paper",
                  location.startsWith(link.href)
                    ? "text-coral"
                    : "text-ink hover:text-coral",
                )}
              >
                {link[locale]}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <label className="sr-only" htmlFor="language-select">
              Language
            </label>
            <select
              id="language-select"
              disabled={isMobileMenuOpen}
              value={locale}
              onChange={(event) => setLocale(event.target.value as "en" | "tr")}
              className="hidden min-h-11 border-0 bg-transparent text-xs font-bold focus-visible:ring-2 focus-visible:ring-coral md:block"
              aria-label="Language"
            >
              <option value="tr">TR</option>
              <option value="en">EN</option>
            </select>
            <button
              onClick={() => setCartOpen(true)}
              disabled={isMobileMenuOpen}
              className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral sm:px-3 md:border md:border-ink/15"
              aria-label={`Open collection basket, ${cartCount} items`}
            >
              <ShoppingBag size={20} />
              <span className="hidden lg:inline text-sm font-semibold">
                Basket ({cartCount})
              </span>
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-paper lg:hidden">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              ref={menuButtonRef}
              className="md:hidden z-50 min-h-11 min-w-11 p-2 text-ink hover:text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <nav
          ref={mobileMenuRef}
          id="mobile-navigation"
          aria-label="Mobile navigation"
          aria-modal="true"
          role="dialog"
          className="fixed inset-0 z-40 h-dvh overscroll-contain overflow-y-auto bg-paper px-6 pb-10 pt-24 animate-in fade-in slide-in-from-top-10 duration-300 md:hidden"
        >
          <p className="eyebrow mb-5 text-coral">
            {locale === "tr" ? "Keşfet" : "Explore"}
          </p>
          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {[
              {
                label: locale === "tr" ? "Türkiye Mağaza" : "Türkiye Shop",
                home: "/shop/turkiye",
                links: [
                  [
                    "/shop/turkiye/prints",
                    locale === "tr" ? "Baskılar ve Ürünler" : "Prints & Goods",
                  ],
                  [
                    "/shop/turkiye/originals",
                    locale === "tr"
                      ? "Orijinal Resimler"
                      : "Original Paintings",
                  ],
                  ["/shop/turkiye/mystery-mail", "Mystery Mail"],
                ],
              },
              {
                label:
                  locale === "tr"
                    ? "Uluslararası Mağaza"
                    : "International Shop",
                home: "/shop/international",
                links: [
                  [
                    "/shop/international/prints",
                    locale === "tr" ? "Baskılar ve Ürünler" : "Prints & Goods",
                  ],
                  [
                    "/shop/international/originals",
                    locale === "tr"
                      ? "Orijinal Resimler"
                      : "Original Paintings",
                  ],
                ],
              },
            ].map((group) => (
              <details
                key={group.home}
                className="group py-2"
                open={location.startsWith(group.home)}
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-serif text-2xl font-bold">
                  {group.label}
                  <span className="font-sans text-lg text-coral transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="pb-3 pl-3">
                  <Link
                    href={group.home}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex min-h-11 items-center text-sm font-bold text-coral"
                  >
                    {locale === "tr" ? "Mağaza ana sayfası" : "Shop home"}
                  </Link>
                  {group.links.map(([href, label]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex min-h-11 items-center text-lg font-semibold"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
            {[
              [
                "/studio-letter",
                locale === "tr" ? "Stüdyo Mektubu" : "Studio Letter",
              ],
              ["/about", locale === "tr" ? "Hakkında" : "About"],
              ...(activeEvent
                ? [["/event", locale === "tr" ? "Etkinlik" : "Event"]]
                : []),
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-14 items-center font-serif text-2xl font-bold"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2" aria-label="Language">
            <button
              type="button"
              onClick={() => setLocale("tr")}
              className={cn(
                "min-h-11 border px-3 text-sm font-bold",
                locale === "tr"
                  ? "border-coral bg-coral text-paper"
                  : "border-ink/15",
              )}
            >
              Türkçe
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={cn(
                "min-h-11 border px-3 text-sm font-bold",
                locale === "en"
                  ? "border-coral bg-coral text-paper"
                  : "border-ink/15",
              )}
            >
              English
            </button>
          </div>
          <button
            type="button"
            onClick={manageAnalytics}
            className="mt-4 min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            {locale === "tr" ? "Gizlilik seçenekleri" : "Privacy choices"}
          </button>
        </nav>
      )}

      <main className="flex-1 w-full">{children}</main>

      <footer className="public-footer">
        <div className="footer-main">
          <section className="footer-brand" aria-labelledby="footer-brand-name">
            <h2 id="footer-brand-name">Aida Ramezani</h2>
            <p className="footer-brand-copy">
              Original oil pastel paintings, Prints & Goods and limited Mystery
              Mail editions, created by Aida Ramezani in Istanbul.
            </p>
            <div
              className="footer-socials"
              aria-label="Aida Ramezani on social media"
            >
              {[
                ["Instagram", siteLinks.instagramUrl],
                ["TikTok", siteLinks.tiktokUrl],
                ["YouTube", siteLinks.youtubeUrl],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{label}</span>
                  <ExternalLink size={12} aria-hidden="true" />
                  <span className="sr-only">opens in a new tab</span>
                </a>
              ))}
            </div>
          </section>

          <nav
            className="footer-shop footer-desktop-links"
            aria-label="Shop links"
          >
            <p className="footer-eyebrow">Shop in Türkiye</p>
            <div className="footer-links">
              <Link href="/shop/turkiye">Türkiye shop home</Link>
              {TURKIYE_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <p className="footer-eyebrow mt-6">Shop internationally</p>
              <Link href="/shop/international">International shop home</Link>
              <Link href="/shop/international/originals">Originals</Link>
              <Link href="/shop/international/prints">Prints</Link>
            </div>
          </nav>

          <nav
            className="footer-information footer-desktop-links"
            aria-label="Information links"
          >
            <p className="footer-eyebrow">Information</p>
            <div className="footer-links">
              {INFORMATION_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <Link href="/links">Links</Link>
              <Link href="/studio-letter">
                {locale === "tr" ? "Stüdyo Mektubu" : "Studio Letter"}
              </Link>
              <a href="mailto:aida@aedaart.com">Contact</a>
            </div>
          </nav>

          <div className="footer-mobile-links">
            <details>
              <summary>Shop</summary>
              <div className="footer-links">
                <Link href="/shop/turkiye/prints">Türkiye prints & goods</Link>
                <Link href="/shop/turkiye/originals">Türkiye originals</Link>
                <Link href="/shop/international/prints">
                  International prints
                </Link>
                <Link href="/shop/international/originals">
                  International originals
                </Link>
              </div>
            </details>
            <details>
              <summary>Information</summary>
              <div className="footer-links">
                <Link href="/about">About</Link>
                <Link href="/how-to-collect">How to collect</Link>
                <Link href="/studio-letter">Studio Letter</Link>
                <a href="mailto:aida@aedaart.com">Contact</a>
              </div>
            </details>
          </div>

          <section
            className="footer-newsletter"
            aria-labelledby="studio-letter-heading"
            data-no-translate
          >
            <p className="footer-eyebrow footer-eyebrow--accent">
              {newsletterCopy.footerHeading}
            </p>
            <h2 id="studio-letter-heading">{newsletterCopy.footerHeading}</h2>
            <p className="footer-newsletter-copy">
              {isHome
                ? locale === "tr"
                  ? "Ücretsiz sanat hikâyeleri ve stüdyo notları."
                  : "Free art stories and studio notes."
                : newsletterCopy.footerSubheading}
            </p>
            <Link
              href="/studio-letter"
              className="mb-4 inline-flex text-sm font-semibold text-coral underline underline-offset-4"
            >
              {locale === "tr" ? "Daha fazla bilgi" : "Learn more"}
            </Link>
            {!isHome && <Newsletter />}
          </section>
        </div>

        <div className="footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} Aida Ramezani. All rights
            reserved.
          </p>
          <p>Made by hand in Istanbul.</p>
          <button
            type="button"
            onClick={manageAnalytics}
            className="min-h-11 text-left underline underline-offset-4"
          >
            Manage analytics
          </button>
        </div>
      </footer>

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        region={activeRegion}
      />
    </div>
  );
}
