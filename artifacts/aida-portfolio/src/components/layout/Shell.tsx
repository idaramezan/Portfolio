import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Menu,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CartDrawer from "@/components/CartDrawer";
import { getCartCount, loadShopSettings } from "@/lib/store";
import { useLocale } from "@/lib/locale";
import { StudioWordmark } from "@/components/ui/playful-studio";
import { trackAnalytics } from "@/lib/analytics";
import {
  DestinationControl,
  useShippingDestination,
} from "@/lib/shipping-destination";

const NAV_LINKS = [
  { href: "/shop", en: "Shop", tr: "Mağaza" },
  { href: "/events", en: "Events", tr: "Etkinlikler" },
  { href: "/about", en: "About", tr: "Hakkında" },
];

const INFORMATION_LINKS = [
  { href: "/about", label: "About" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const previousPathRef = useRef<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const languagePickerRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileShop, setOpenMobileShop] = useState<"shop" | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const { isTürkiye } = useShippingDestination();
  const activeRegion = isTürkiye ? "TR" : "INTERNATIONAL";
  const [cartCount, setCartCount] = useState(getCartCount(activeRegion));
  const { locale, setLocale } = useLocale();
  const siteLinks = loadShopSettings().siteLinks;
  const socialLinks = [
    ["Instagram", siteLinks.instagramUrl],
    ["TikTok", siteLinks.tiktokUrl],
    ["Twitch", siteLinks.twitchUrl],
    ["Kick", siteLinks.kickUrl],
    ["YouTube", siteLinks.youtubeUrl],
    ["Discord", siteLinks.discordUrl],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const trackSocial = (label: string, location: string) => {
    const platform = label.toLowerCase();
    if (["tiktok", "twitch", "kick"].includes(platform))
      trackAnalytics("stream_platform_click", {
        metadata: { platform, location },
      });
    if (platform === "discord")
      trackAnalytics("discord_join_click", { metadata: { location } });
  };
  const manageAnalytics = () =>
    window.dispatchEvent(new CustomEvent("analytics:manage"));
  const closeMobileMenu = (restoreFocus = false) => {
    setIsMobileMenuOpen(false);
    if (restoreFocus)
      requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    const updateHeader = () => setHeaderScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
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
    const selectors =
      '[id^="smartlook-feedback"],[class*="smartlook-feedback"],[data-smartlook-feedback],iframe[src*="feedback.smartlook"]';
    const removeHandle = () =>
      document.querySelectorAll(selectors).forEach((node) => node.remove());
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
  useEffect(() => {
    if (!languageOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!languagePickerRef.current?.contains(event.target as Node))
        setLanguageOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setLanguageOpen(false);
      languageTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [languageOpen]);
  useEffect(() => {
    if (!isTürkiye) setCartOpen(false);
  }, [isTürkiye]);

  return (
    <div data-public-site className="min-h-[100dvh] flex flex-col font-sans">
      <header
        data-scrolled={headerScrolled || undefined}
        className="site-header sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b border-ink/5"
      >
        <div className="site-header__grid mx-auto h-20 max-w-7xl px-4 md:h-auto md:px-8">
          <Link
            href="/"
            className="z-50 shrink-0 whitespace-nowrap font-serif text-lg font-bold tracking-tighter text-ink transition-colors hover:text-coral sm:text-xl md:text-2xl lg:text-3xl"
          >
            <StudioWordmark compact />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="site-header__nav hidden md:flex"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-medium text-sm lg:text-base link-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-4 focus-visible:ring-offset-paper",
                  location.startsWith(link.href)
                    ? "site-header__nav-link--active text-ink"
                    : "text-ink hover:text-coral",
                )}
              >
                {link[locale]}
              </Link>
            ))}
          </nav>

          <div className="site-header__utilities flex shrink-0 items-center">
            <div className="hidden lg:block">
              <DestinationControl utility />
            </div>
            <div
              ref={languagePickerRef}
              className="header-language hidden md:block"
              data-active-locale={locale}
              data-open={languageOpen || undefined}
              data-no-translate
            >
              <button
                ref={languageTriggerRef}
                type="button"
                className="header-language__trigger"
                aria-label={
                  locale === "tr" ? "Dili değiştir" : "Change language"
                }
                aria-haspopup="menu"
                aria-expanded={languageOpen}
                aria-controls="header-language-menu"
                onClick={() => setLanguageOpen((current) => !current)}
                onKeyDown={(event) => {
                  if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
                  event.preventDefault();
                  setLanguageOpen(true);
                  requestAnimationFrame(() => {
                    const options =
                      languagePickerRef.current?.querySelectorAll<HTMLButtonElement>(
                        '[role="menuitemradio"]',
                      );
                    options?.[event.key === "ArrowUp" ? options.length - 1 : 0]?.focus();
                  });
                }}
              >
                {locale.toUpperCase()}
                <ChevronDown aria-hidden="true" />
              </button>
              <div
                id="header-language-menu"
                className="header-language__menu"
                role="menu"
                aria-label={locale === "tr" ? "Dil seç" : "Choose language"}
                aria-hidden={!languageOpen}
                onKeyDown={(event) => {
                  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
                    return;
                  event.preventDefault();
                  const options = Array.from(
                    event.currentTarget.querySelectorAll<HTMLButtonElement>(
                      '[role="menuitemradio"]',
                    ),
                  );
                  const current = options.indexOf(document.activeElement as HTMLButtonElement);
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? options.length - 1
                        : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                  options[next]?.focus();
                }}
              >
                {([
                  ["en", "English"],
                  ["tr", "Türkçe"],
                ] as const).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={locale === code}
                    tabIndex={languageOpen && locale === code ? 0 : -1}
                    onClick={() => {
                      setLocale(code);
                      setLanguageOpen(false);
                      languageTriggerRef.current?.focus();
                    }}
                  >
                    <span className="header-language__indicator" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {isTürkiye && (
              <button
                onClick={() => setCartOpen(true)}
                disabled={isMobileMenuOpen}
                className="header-basket relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral sm:px-3"
                aria-label={
                  locale === "tr"
                    ? `Koleksiyon sepetini aç, ${cartCount} ürün`
                    : `Open collection basket, ${cartCount} items`
                }
              >
                <ShoppingBag size={20} />
                <span className="hidden lg:inline text-sm font-semibold">
                  {locale === "tr" ? "Sepet" : "Basket"}
                </span>
                <span
                  className={`header-basket__count ${cartCount ? "" : "header-basket__count--empty"}`}
                >
                  {cartCount}
                </span>
              </button>
            )}
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
        <div
          className="mobile-menu-overlay md:hidden"
          aria-hidden="true"
          onClick={() => closeMobileMenu(true)}
        />
      )}
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
          <Link
            href="/"
            className="mobile-menu__brand"
            onClick={() => closeMobileMenu()}
          >
            Aeda Art
          </Link>
          <button
            type="button"
            className="mobile-menu__close"
            aria-label="Close menu"
            onClick={() => closeMobileMenu(true)}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <p className="mobile-menu__eyebrow">
          {locale === "tr" ? "Stüdyoyu keşfet" : "Explore the studio"}
        </p>
        <div className="mobile-menu__navigation">
          {[
            {
              id: "shop" as const,
              label: locale === "tr" ? "Mağaza" : "Shop",
              home: "/shop",
              description:
                locale === "tr"
                  ? "Baskılar ve orijinal eserler"
                  : "Prints and original works",
              links: [
                [
                  "/shop?category=prints",
                  locale === "tr" ? "Baskılar" : "Prints",
                ],
                ...(isTürkiye
                  ? [
                      [
                        "/shop?category=originals",
                        locale === "tr" ? "Orijinal Eserler" : "Original Art",
                      ],
                    ]
                  : []),
              ],
            },
          ].map((group) => {
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
                    <span className="mobile-menu__trigger-title">
                      {group.label}
                    </span>
                    {!isOpen && (
                      <span className="mobile-menu__trigger-description">
                        {group.description}
                      </span>
                    )}
                  </span>
                  {isOpen ? (
                    <Minus className="mobile-menu__chevron" aria-hidden="true" />
                  ) : (
                    <Plus className="mobile-menu__chevron" aria-hidden="true" />
                  )}
                </button>
                  <div
                    id={submenuId}
                    className="mobile-menu__submenu"
                    data-open={isOpen || undefined}
                    aria-hidden={!isOpen}
                  >
                    <Link href={group.home} onClick={() => closeMobileMenu()}>
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
                  </div>
              </div>
            );
          })}
          {[
            ["/events", locale === "tr" ? "Etkinlikler" : "Events"],
            ["/about", locale === "tr" ? "Aida Hakkında" : "About Aida"],
          ].map(([href, label]) => (
            <div className="mobile-menu__row" key={href}>
              <Link
                href={href}
                onClick={() => closeMobileMenu()}
                className={cn(
                  "mobile-menu__link",
                  location.startsWith(href) && "is-active",
                )}
                aria-current={location.startsWith(href) ? "page" : undefined}
              >
                <span>{label}</span>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          ))}
          {activeEvent && (
            <div className="mobile-menu__row">
              <Link
                href="/event"
                onClick={() => closeMobileMenu()}
                className="mobile-menu__link"
              >
                <span>{locale === "tr" ? "Etkinlik" : "Current Event"}</span>
                <span className="mobile-menu__event-badge">
                  {locale === "tr" ? "Güncel" : "Current"}
                </span>
              </Link>
            </div>
          )}
        </div>
        <div className="mobile-menu__destination">
          <p className="mobile-menu__utility-label">
            {locale === "tr" ? "GÖNDERİM" : "SHIPPING TO"}
          </p>
          <DestinationControl menu />
        </div>
        <div className="mobile-menu__note">
          <p className="mobile-menu__utility-label">
            {locale === "tr" ? "ATÖLYE NOTLARI" : "STUDIO NOTES"}
          </p>
          <p>
            {locale === "tr"
              ? "Kişisel sanat hikâyeleri ve yeni çalışmalara ara sıra ilk bakışlar."
              : "Personal art stories and occasional first looks."}
          </p>
        </div>
        <footer className="mobile-menu__footer">
          <p className="mobile-menu__utility-label">
            {locale === "tr" ? "DİL" : "LANGUAGE"}
          </p>
          <div
            className="mobile-menu__languages"
            aria-label={locale === "tr" ? "Dil" : "Language"}
            data-active-locale={locale}
            data-no-translate
          >
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
          <p className="mobile-menu__utility-label mobile-menu__social-label">
            {locale === "tr" ? "SOSYAL" : "FOLLOW"}
          </p>
          <div className="mobile-menu__secondary-links mobile-menu__socials">
            {socialLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocial(label, "mobile_menu")}
              >
                {label}
              </a>
            ))}
          </div>
          <button
            type="button"
            className="mobile-menu__privacy"
            onClick={manageAnalytics}
          >
            {locale === "tr" ? "Gizlilik seçenekleri" : "Privacy choices"}
          </button>
        </footer>
      </nav>

      <main className="flex-1 w-full">{children}</main>

      <footer className="site-footer public-footer">
        <div className="site-footer__inner">
          <div className="site-footer__main">
            <section>
              <h2 className="site-footer__brand">Aeda Art</h2>
              <p className="site-footer__studio-line">
                Original art, studio stories and small editions made by Aida.
              </p>
              <div
                className="site-footer__social"
                aria-label="Aeda Art on social media"
              >
                {socialLinks.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackSocial(label, "site_footer")}
                  >
                    {label}
                    <span className="sr-only"> opens in a new tab</span>
                  </a>
                ))}
              </div>
            </section>
            <nav
              className="site-footer__nav site-footer__nav--shop footer-desktop-links"
              aria-label="Shop navigation"
            >
              <p className="footer-eyebrow">Shop</p>
              <div className="site-footer__nav-links">
                <Link href="/shop?category=prints">Prints</Link>
                {isTürkiye && (
                  <Link href="/shop?category=originals">Original Art</Link>
                )}
              </div>
            </nav>
            <nav
              className="site-footer__nav site-footer__nav--information footer-desktop-links"
              aria-label="Information navigation"
            >
              <p className="footer-eyebrow mt-5">Information</p>
              <div className="site-footer__nav-links">
                <Link href="/events">Events</Link>
                {INFORMATION_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
                <Link href="/links">Links</Link>
                <a href="mailto:aida@aedaart.com">Contact</a>
              </div>
            </nav>
            <div className="site-footer__nav footer-mobile-links">
              <details className="site-footer__nav-group">
                <summary className="site-footer__nav-trigger">
                  Shop
                </summary>
                <div className="site-footer__nav-links">
                  <Link href="/shop?category=prints">Prints</Link>
                  {isTürkiye && (
                    <Link href="/shop?category=originals">Original Art</Link>
                  )}
                </div>
              </details>
              <details className="site-footer__nav-group">
                <summary className="site-footer__nav-trigger">
                  Information
                </summary>
                <div className="site-footer__nav-links">
                  <Link href="/events">Events</Link>
                  <Link href="/about">About</Link>
                  <Link href="/links">Links</Link>
                  <a href="mailto:aida@aedaart.com">Contact</a>
                </div>
              </details>
            </div>
          </div>
          <div className="site-footer__legal">
            <span>&copy; {new Date().getFullYear()} Aeda Art</span>
            <span>Made by Aida</span>
            <button type="button" onClick={manageAnalytics}>
              Manage analytics
            </button>
          </div>
        </div>
      </footer>

      {isTürkiye && (
        <CartDrawer
          open={cartOpen}
          onOpenChange={setCartOpen}
          region={activeRegion}
        />
      )}
    </div>
  );
}
