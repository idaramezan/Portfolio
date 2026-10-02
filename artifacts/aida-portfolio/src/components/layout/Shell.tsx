import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CartDrawer from "@/components/CartDrawer";
import ShippingProgressTracker from "@/components/ShippingProgressTracker";
import { getCartCount, loadShopSettings } from "@/lib/store";
import { getFourthwallCartCount } from "@/lib/fourthwall-cart";
import { useLocale } from "@/lib/locale";
import { StudioWordmark } from "@/components/ui/playful-studio";
import { trackAnalytics } from "@/lib/analytics";
import {
  DestinationControl,
  useShippingDestination,
} from "@/lib/shipping-destination";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const previousPathRef = useRef<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const languagePickerRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [languageOpen, setLanguageOpen] = useState(false);
  const { isTürkiye } = useShippingDestination();
  const activeRegion = isTürkiye ? "TR" : "INTERNATIONAL";
  const [cartCount, setCartCount] = useState(
    () => getCartCount(activeRegion) + getFourthwallCartCount(),
  );
  const isBasketEmpty = cartCount === 0;
  const { locale, setLocale } = useLocale();
  const settings = loadShopSettings();
  const siteLinks = settings.siteLinks;
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
  const closeMobileMenu = (restoreFocus = false) => {
    setIsMobileMenuOpen(false);
    if (restoreFocus)
      requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    let previousY = window.scrollY;
    let frame = 0;
    const updateHeader = () => {
      frame = 0;
      const currentY = Math.max(0, window.scrollY);
      setHeaderScrolled(currentY > 24);
      if (currentY <= 8) {
        setHeaderVisible(true);
      } else if (currentY > previousY + 4) {
        setHeaderVisible(false);
        setIsMobileMenuOpen(false);
        setLanguageOpen(false);
      } else if (currentY < previousY - 4) {
        setHeaderVisible(true);
      }
      previousY = currentY;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateHeader);
    };
    updateHeader();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const watched = new WeakSet<HTMLImageElement>();
    const mark = (image: HTMLImageElement) => {
      if (image.dataset.noShimmer !== undefined) return;
      image.dataset.imageState =
        image.complete && image.naturalWidth > 0 ? "loaded" : "loading";
      if (!watched.has(image)) {
        watched.add(image);
        image.addEventListener("load", () => {
          image.dataset.imageState = "loaded";
        });
        image.addEventListener("error", () => {
          image.dataset.imageState = "error";
        });
      }
    };
    const scan = (root: ParentNode) => {
      if (root instanceof HTMLImageElement) mark(root);
      root.querySelectorAll?.("img").forEach((image) => mark(image));
    };
    scan(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes")
          mark(record.target as HTMLImageElement);
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scan(node);
        });
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () =>
      setCartCount(getCartCount(activeRegion) + getFourthwallCartCount());
    sync();
    window.addEventListener("cart:updated", sync);
    window.addEventListener("fourthwall-cart:updated", sync);
    return () => {
      window.removeEventListener("cart:updated", sync);
      window.removeEventListener("fourthwall-cart:updated", sync);
    };
  }, [activeRegion]);

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
        data-hidden={!headerVisible || undefined}
        className="site-header sticky top-0 z-50 border-b border-ink/5 bg-white"
      >
        <div className="site-header__grid mx-auto h-24 w-full px-4 md:h-32 md:px-10">
          <button
            ref={menuButtonRef}
            className="site-header__menu-button z-50 min-h-11 min-w-11 p-2 text-ink hover:text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
          <Link
            href="/"
            className="site-header__brand z-50 shrink-0 whitespace-nowrap font-serif text-lg font-bold tracking-tighter text-ink transition-colors hover:text-coral sm:text-xl md:text-2xl lg:text-3xl"
          >
            <StudioWordmark compact />
          </Link>

          <div className="site-header__utilities flex shrink-0 items-center">
            <div className="site-header__country">
              <DestinationControl utility />
            </div>
            <div
              ref={languagePickerRef}
              className="header-language"
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
                    options?.[
                      event.key === "ArrowUp" ? options.length - 1 : 0
                    ]?.focus();
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
                  if (
                    !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
                  )
                    return;
                  event.preventDefault();
                  const options = Array.from(
                    event.currentTarget.querySelectorAll<HTMLButtonElement>(
                      '[role="menuitemradio"]',
                    ),
                  );
                  const current = options.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? options.length - 1
                        : (current +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            options.length) %
                          options.length;
                  options[next]?.focus();
                }}
              >
                {(
                  [
                    ["en", "English"],
                    ["tr", "Türkçe"],
                  ] as const
                ).map(([code, label]) => (
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
                    <span
                      className="header-language__indicator"
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {!isBasketEmpty && (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                disabled={isMobileMenuOpen}
                className="header-basket relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral sm:px-3"
                aria-label={
                  locale === "tr"
                    ? `Sepet, ${cartCount} ürün`
                    : `Basket, ${cartCount} ${cartCount === 1 ? "item" : "items"}`
                }
              >
                <ShoppingBag size={20} />
                <span className="hidden lg:inline text-sm font-semibold">
                  {locale === "tr" ? "Sepet" : "Basket"}
                </span>
                <span className="header-basket__count">{cartCount}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
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
        className="mobile-menu"
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
        <p className="mobile-menu__eyebrow">AEDA ART</p>
        <div className="mobile-menu__navigation">
          {[
            ["/", locale === "tr" ? "Ana Sayfa" : "Home"],
            ["/paintings", locale === "tr" ? "Orijinaller" : "Originals"],
            [
              "/shop?category=prints",
              locale === "tr"
                ? "Sınırlı Edisyon Baskılar"
                : "Limited Edition Prints",
            ],
            [
              "/moving-image",
              locale === "tr" ? "Hareketli Görüntü" : "Moving Image",
            ],
            ["/about", locale === "tr" ? "Aida Hakkında" : "About"],
          ].map(([href, label]) => (
            <div className="mobile-menu__row" key={href}>
              <Link
                href={href}
                onClick={() => closeMobileMenu()}
                className={cn(
                  "mobile-menu__link",
                  (href === "/"
                    ? location === "/"
                    : location.startsWith(href.split("?")[0])) && "is-active",
                )}
              >
                <span>{label}</span>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
        <div className="mobile-menu__destination">
          <p className="mobile-menu__utility-label">
            {locale === "tr" ? "GÖNDERİM" : "SHIPPING TO"}
          </p>
          <DestinationControl menu />
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
        </footer>
      </nav>

      {isTürkiye && <ShippingProgressTracker region={activeRegion} />}
      <main className="flex-1 w-full">{children}</main>

      <footer className="site-footer public-footer">
        <div className="site-footer__inner">
          <div className="site-footer__legal">
            <span>&copy; {new Date().getFullYear()} Aeda Art</span>
            <span>
              <Link href="/paintings">Originals</Link> ·{" "}
              <Link href="/shop?category=prints">Limited Edition Prints</Link> ·{" "}
              <Link href="/about">About</Link>
            </span>
            <span>
              <Link href="/privacy">Privacy</Link> ·{" "}
              <Link href="/terms">Terms</Link>
            </span>
          </div>
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
