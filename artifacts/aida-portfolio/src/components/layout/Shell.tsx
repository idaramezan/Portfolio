import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Newsletter from "./Newsletter";
import CartDrawer from "@/components/CartDrawer";
import {
  getCartCount,
  loadShopSettings,
  setActiveShoppingRegion,
  type ShoppingRegion,
} from "@/lib/store";
import { useLocale } from "@/lib/locale";

const NAV_LINKS = [
  { href: "/shop/turkiye", label: "Türkiye Shop" },
  { href: "/shop/international", label: "International" },
  { href: "/about", label: "About" },
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
  const activeRegion: ShoppingRegion =
    location.startsWith("/shop/international") ||
    location.startsWith("/basket/international")
      ? "INTERNATIONAL"
      : "TR";
  const [cartCount, setCartCount] = useState(getCartCount(activeRegion));
  const { locale, setLocale } = useLocale();
  const siteLinks = loadShopSettings().siteLinks;

  useEffect(() => {
    setActiveShoppingRegion(activeRegion);
    const sync = () => setCartCount(getCartCount(activeRegion));
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, [activeRegion]);

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
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => setIsMobileMenuOpen(false), [location]);

  return (
    <div data-public-site className="min-h-[100dvh] flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="shrink-0 font-serif text-xl sm:text-2xl lg:text-3xl font-bold tracking-tighter text-ink hover:text-coral transition-colors z-50"
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
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <label className="sr-only" htmlFor="language-select">Language</label>
            <select id="language-select" value={locale} onChange={(event) => setLocale(event.target.value as "en" | "tr")} className="min-h-11 border-0 bg-transparent text-xs font-bold focus-visible:ring-2 focus-visible:ring-coral" aria-label="Language">
              <option value="tr">TR</option><option value="en">EN</option>
            </select>
            <button
              ref={menuButtonRef}
              onClick={() => setCartOpen(true)}
              className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border border-ink/15 px-2 text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral sm:px-3"
              aria-label={`Open collection basket, ${cartCount} items`}
            >
              <ShoppingBag size={20} />
              <span className="hidden lg:inline text-sm font-semibold">
                Basket ({cartCount})
              </span>
              <span className="lg:hidden text-xs font-bold">{cartCount}</span>
            </button>
            <button
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

        {isMobileMenuOpen && (
          <nav
            ref={mobileMenuRef}
            id="mobile-navigation"
            aria-label="Mobile navigation"
            aria-modal="true"
            role="dialog"
            className="md:hidden fixed inset-0 overflow-y-auto bg-paper z-40 pt-24 pb-10 px-6 animate-in slide-in-from-top-10 fade-in duration-300"
          >
            <div className="mb-6 border-b border-ink/10 pb-6">
              <label className="text-xs font-bold uppercase tracking-wider">
                Language
                <select value={locale} onChange={(event) => setLocale(event.target.value as "en" | "tr")} className="mt-2 min-h-11 w-full border border-ink/15 bg-paper px-3">
                  <option value="tr">Türkçe</option><option value="en">English</option>
                </select>
              </label>
            </div>
            <p className="eyebrow mb-2">Collect</p>
            <p className="eyebrow mb-2">Türkiye Shop</p>
            {[
              { href: "/shop/turkiye", label: "Shop home" },
              ...TURKIYE_LINKS,
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex min-h-11 items-center font-serif text-3xl font-bold",
                  location === link.href ? "text-coral" : "text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
            <p className="eyebrow mb-2 mt-6">International Shop</p>
            {[
              { href: "/shop/international", label: "Shop home" },
              { href: "/shop/international/originals", label: "Originals" },
              { href: "/shop/international/prints", label: "Prints" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-11 items-center font-serif text-3xl font-bold"
              >
                {link.label}
              </Link>
            ))}
            <p className="eyebrow mb-2 mt-6">Studio</p>
            {[
              { href: "/about", label: "About" },
              { href: "/links", label: "Links" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-11 items-center font-serif text-3xl font-bold"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="public-footer">
        <div className="footer-main">
          <section className="footer-brand" aria-labelledby="footer-brand-name">
            <h2 id="footer-brand-name">Aida Ramezani</h2>
            <p>
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

          <nav className="footer-shop" aria-label="Shop links">
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

          <nav className="footer-information" aria-label="Information links">
            <p className="footer-eyebrow">Information</p>
            <div className="footer-links">
              {INFORMATION_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <Link href="/links">Links</Link>
              <a href="mailto:idaramezan@gmail.com">Contact</a>
            </div>
          </nav>

          <section
            className="footer-newsletter"
            aria-labelledby="studio-letter-heading"
          >
            <p className="footer-eyebrow footer-eyebrow--accent">
              Studio Letter
            </p>
            <h2 id="studio-letter-heading">Notes from the studio.</h2>
            <p>
              Occasional studio updates, early access to new originals, and
              first notice of limited editions.
            </p>
            <Newsletter />
          </section>
        </div>

        <div className="footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} Aida Ramezani. All rights
            reserved.
          </p>
          <p>Made by hand in Istanbul.</p>
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
