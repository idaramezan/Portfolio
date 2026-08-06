import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CartDrawer from "@/components/CartDrawer";
import {
  getCartCount,
  loadShopSettings,
  setActiveShoppingRegion,
  type ShoppingRegion,
} from "@/lib/store";
import { useLocale } from "@/lib/locale";
import { StudioWordmark } from "@/components/ui/playful-studio";
import { trackAnalytics } from "@/lib/analytics";

const NAV_LINKS = [
  { href: "/shop/turkiye", en: "Türkiye Shop", tr: "Türkiye Mağaza" },
  { href: "/shop/international", en: "International", tr: "Uluslararası" },
  { href: "/newsletter", en: "Newsletter", tr: "Bülten" },
  { href: "/events", en: "Events", tr: "Etkinlikler" },
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
  const [openMobileShop, setOpenMobileShop] = useState<"turkiye" | "international" | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const activeRegion: ShoppingRegion =
    location.startsWith("/shop/international") ||
    location.startsWith("/basket/international")
      ? "INTERNATIONAL"
      : "TR";
  const [cartCount, setCartCount] = useState(getCartCount(activeRegion));
  const { locale, setLocale } = useLocale();
  const siteLinks = loadShopSettings().siteLinks;
  const socialLinks = [
    ["Instagram", siteLinks.instagramUrl], ["TikTok", siteLinks.tiktokUrl],
    ["Twitch", siteLinks.twitchUrl], ["Kick", siteLinks.kickUrl],
    ["YouTube", siteLinks.youtubeUrl], ["Discord", siteLinks.discordUrl],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const trackSocial = (label: string, location: string) => {
    const platform = label.toLowerCase();
    if (["tiktok", "twitch", "kick"].includes(platform))
      trackAnalytics("stream_platform_click", { metadata: { platform, location } });
    if (platform === "discord")
      trackAnalytics("discord_join_click", { metadata: { location } });
  };
  const manageAnalytics = () =>
    window.dispatchEvent(new CustomEvent("analytics:manage"));
  const closeMobileMenu = (restoreFocus = false) => {
    setIsMobileMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    const updateHeader = () => setHeaderScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

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
    const selectors = '[id^="smartlook-feedback"],[class*="smartlook-feedback"],[data-smartlook-feedback],iframe[src*="feedback.smartlook"]';
    const removeHandle = () => document.querySelectorAll(selectors).forEach((node) => node.remove());
    removeHandle();
    const observer = new MutationObserver(removeHandle);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
      <header data-scrolled={headerScrolled || undefined} className="site-header sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b border-ink/5">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 py-0 md:h-auto md:px-8 md:py-5">
          <Link
            href="/"
            className="z-50 shrink-0 whitespace-nowrap font-serif text-lg font-bold tracking-tighter text-ink transition-colors hover:text-coral sm:text-xl md:text-2xl lg:text-3xl"
          >
            <StudioWordmark compact />
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

      {isMobileMenuOpen && <div className="mobile-menu-overlay md:hidden" aria-hidden="true" onClick={() => closeMobileMenu(true)} />}
      <nav
        ref={mobileMenuRef}
        id="mobile-navigation"
        aria-label={locale === "tr" ? "Mobil gezinme" : "Mobile navigation"}
        aria-modal="true"
        aria-hidden={!isMobileMenuOpen}
        role="dialog"
        data-open={isMobileMenuOpen}
        className="mobile-menu md:hidden"
      >
            <header className="mobile-menu__header">
              <Link href="/" className="mobile-menu__brand" onClick={() => closeMobileMenu()}>Aida Ramezani</Link>
              <button type="button" className="mobile-menu__close" aria-label="Close menu" onClick={() => closeMobileMenu(true)}><X aria-hidden="true" /></button>
            </header>
            <p className="mobile-menu__eyebrow">{locale === "tr" ? "Stüdyoyu keşfet" : "Explore the studio"}</p>
            <div className="mobile-menu__navigation">
            {([
              {
                id: "turkiye" as const,
                label: locale === "tr" ? "Türkiye Mağaza" : "Türkiye Shop",
                home: "/shop/turkiye",
                description: locale === "tr" ? "Orijinaller, baskılar, ürünler ve Mystery Mail" : "Originals, prints, goods and Mystery Mail",
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
                id: "international" as const,
                label:
                  locale === "tr"
                    ? "Uluslararası Mağaza"
                    : "International Shop",
                home: "/shop/international",
                description: locale === "tr" ? "Orijinaller ve dünya çapında stüdyo ürünleri" : "Originals and worldwide studio products",
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
            ]).map((group) => {
              const isOpen = openMobileShop === group.id;
              const submenuId = `mobile-${group.id}-shop-links`;
              return (
              <div key={group.home} className="mobile-menu__row">
                <button
                  type="button"
                  className="mobile-menu__trigger"
                  aria-expanded={isOpen}
                  aria-controls={submenuId}
                  onClick={() => setOpenMobileShop(isOpen ? null : group.id)}
                >
                  <span className="mobile-menu__trigger-copy">
                    <span className="mobile-menu__trigger-title">{group.label}</span>
                    {!isOpen && <span className="mobile-menu__trigger-description">{group.description}</span>}
                  </span>
                  <ChevronDown className={cn("mobile-menu__chevron", isOpen && "is-open")} aria-hidden="true" />
                </button>
                {isOpen && <div id={submenuId} className="mobile-menu__submenu">
                  <Link
                    href={group.home}
                    onClick={() => closeMobileMenu()}
                  >
                    {locale === "tr" ? "Mağaza ana sayfası" : "Shop home"}
                  </Link>
                  {group.links.map(([href, label]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => closeMobileMenu()}
                    >
                      {label}
                    </Link>
                  ))}
                </div>}
              </div>
              );
            })}
            {[
              [
                "/newsletter",
                locale === "tr" ? "Bülten" : "Newsletter",
              ],
              ["/about", locale === "tr" ? "Aida Hakkında" : "About Aida"],
            ].map(([href, label]) => (
              <div className="mobile-menu__row" key={href}>
              <Link
                href={href}
                onClick={() => closeMobileMenu()}
                className="mobile-menu__link"
              >
                {label}
              </Link>
              </div>
            ))}
            {activeEvent && <div className="mobile-menu__row"><Link href="/event" onClick={() => closeMobileMenu()} className="mobile-menu__link"><span>{locale === "tr" ? "Etkinlik" : "Current Event"}</span><span className="mobile-menu__event-badge">{locale === "tr" ? "Güncel" : "Current"}</span></Link></div>}
            </div>
            <p className="mobile-menu__note">{locale === "tr" ? "Aida’nın İstanbul stüdyosundan kişisel sanat hikâyeleri ve ilk bakışlar." : "Personal art stories and first looks from Aida’s Istanbul studio."}</p>
            <footer className="mobile-menu__footer">
            <div className="mobile-menu__languages" aria-label={locale === "tr" ? "Dil" : "Language"}>
            <button
              type="button"
              onClick={() => setLocale("tr")}
              className="mobile-menu__language"
              aria-current={locale === "tr"}
            >
              Türkçe
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className="mobile-menu__language"
              aria-current={locale === "en"}
            >
              English
            </button>
            </div>
              <div className="mobile-menu__secondary-links">{socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackSocial(label, "mobile_menu")}>{label}</a>)}
              <button type="button" onClick={manageAnalytics}>{locale === "tr" ? "Gizlilik seçenekleri" : "Privacy choices"}</button>
              </div>
            </footer>
          </nav>

      <main className="flex-1 w-full">{children}</main>

      <footer className="site-footer public-footer">
        <div className="site-footer__inner">
          <div className="site-footer__main">
            <section>
              <h2 className="site-footer__brand">Aida Ramezani</h2>
              <p className="site-footer__studio-line">Original art, studio stories and small editions made by Aida in Istanbul.</p>
              <div className="site-footer__social" aria-label="Aida Ramezani on social media">
                {socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackSocial(label, "site_footer")}>{label}<span className="sr-only"> opens in a new tab</span></a>)}
              </div>
            </section>
            <section className="site-footer__letter">
              <h2>{locale === "tr" ? "Bülten" : "Newsletter"}</h2>
              <p>{locale === "tr" ? "Kişisel sanat hikâyeleri, atölye notları ve yeni çalışmalara ilk bakışlar." : "Personal art stories, studio notes and first looks at new work."}</p>
              <Link href="/newsletter">{locale === "tr" ? "Oku ve abone ol" : "Read and subscribe"} →</Link>
            </section>
            <nav className="site-footer__nav site-footer__nav--shop footer-desktop-links" aria-label="Shop navigation">
              <p className="footer-eyebrow">Shop</p>
              <div className="site-footer__nav-links"><Link href="/shop/turkiye">Türkiye shop</Link>{TURKIYE_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}<Link href="/shop/international">International shop</Link></div>
            </nav>
            <nav className="site-footer__nav site-footer__nav--information footer-desktop-links" aria-label="Information navigation">
              <p className="footer-eyebrow mt-5">Information</p>
              <div className="site-footer__nav-links">{INFORMATION_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}<Link href="/links">Links</Link><a href="mailto:aida@aedaart.com">Contact</a></div>
            </nav>
            <div className="site-footer__nav footer-mobile-links">
              <details className="site-footer__nav-group"><summary className="site-footer__nav-trigger">Shop <ChevronDown aria-hidden="true" /></summary><div className="site-footer__nav-links"><Link href="/shop/turkiye">Türkiye shop</Link><Link href="/shop/turkiye/originals">Original Art</Link><Link href="/shop/turkiye/prints">Prints & Goods</Link><Link href="/shop/international">International shop</Link></div></details>
              <details className="site-footer__nav-group"><summary className="site-footer__nav-trigger">Information <ChevronDown aria-hidden="true" /></summary><div className="site-footer__nav-links"><Link href="/about">About</Link><Link href="/how-to-collect">How to collect</Link><Link href="/newsletter">Newsletter</Link><a href="mailto:aida@aedaart.com">Contact</a></div></details>
            </div>
          </div>
          <div className="site-footer__legal"><span>&copy; {new Date().getFullYear()} Aida Ramezani</span><span>Made by hand in Istanbul</span><button type="button" onClick={manageAnalytics}>Manage analytics</button></div>
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
