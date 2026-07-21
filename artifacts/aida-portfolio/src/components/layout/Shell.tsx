import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Newsletter from "./Newsletter";
import CartDrawer from "@/components/CartDrawer";
import { getCartCount } from "@/lib/store";

const NAV_LINKS = [
  { href: "/gallery", label: "Gallery" },
  { href: "/originals", label: "Shop Originals" },
  { href: "/prints", label: "Prints" },
  { href: "/about", label: "About" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(getCartCount());

  useEffect(() => {
    const sync = () => setCartCount(getCartCount());
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between">
          <Link href="/" className="font-serif text-3xl md:text-4xl font-bold tracking-tighter text-ink hover:text-coral transition-colors z-50">
            Aida Ramezani
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-medium text-lg link-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-4 focus-visible:ring-offset-paper",
                  location === link.href ? "text-coral" : "text-ink hover:text-coral"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="relative rounded-full border border-ink/10 p-2 text-ink hover:bg-ink/5"
              aria-label="Open basket"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-paper">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              className="md:hidden z-50 p-2 -mr-2 text-ink hover:text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-paper z-40 pt-32 px-6 flex flex-col gap-6 animate-in slide-in-from-top-10 fade-in duration-300">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "font-serif text-3xl font-bold",
                  location === link.href ? "text-coral" : "text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 w-full">
        {children}
      </main>

      <footer className="mt-12 border-t border-ink/10 bg-card py-14">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <h2 className="font-serif text-3xl text-ink">Aida Ramezani</h2>
            <p className="text-ink/80 max-w-2xl leading-relaxed">
              Studio-made oil pastel works that celebrate texture, imperfect marks, and the poetic warmth of analog creation.
            </p>
            <div className="flex gap-4">
              <a href="https://instagram.com/aedaart" target="_blank" rel="noopener noreferrer" className="font-hand text-xl text-ink hover:text-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral">Instagram</a>
              <a href="https://www.tiktok.com/@aedapaints?_r=1&_t=ZS-987Z29KJiK4" target="_blank" rel="noopener noreferrer" className="font-hand text-xl text-ink hover:text-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral">TikTok</a>
              <a href="https://www.youtube.com/@AedaArt" target="_blank" rel="noopener noreferrer" className="font-hand text-xl text-ink hover:text-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral">YouTube</a>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.35em] text-muted-foreground mb-3">Navigate</p>
              <div className="grid gap-3 text-sm text-ink/80">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="underline underline-offset-4 hover:text-coral transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="font-sans text-xs uppercase tracking-[0.35em] text-muted-foreground mb-3">Join the Studio Letter</p>
              <Newsletter />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 pt-6 border-t border-ink/5 text-sm text-muted-foreground flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
          <p>&copy; {new Date().getFullYear()} Aida Ramezani. All rights reserved.</p>
          <p>Handmade in the studio.</p>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
