import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Newsletter from "./Newsletter";

const NAV_LINKS = [
  { href: "/gallery", label: "Gallery" },
  { href: "/originals", label: "Shop Originals" },
  { href: "/prints", label: "Prints & Merch" },
  { href: "/about", label: "About" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

          <button 
            className="md:hidden z-50 p-2 -mr-2 text-ink hover:text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
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

      <footer className="mt-12 border-t border-ink/10 bg-card py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between gap-16">
          <div className="max-w-md">
            <h2 className="font-serif text-2xl font-bold mb-4">Aida Ramezani</h2>
            <p className="text-muted-foreground mb-8">
              Self-taught oil pastel artist. Embracing the beauty of imperfection, one smudge at a time.
            </p>
            <div className="flex gap-4">
              <a href="https://instagram.com/aedaart" target="_blank" rel="noopener noreferrer" className="font-hand text-xl text-ink hover:text-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral">Instagram</a>
              <a href="https://www.tiktok.com/@aedapaints?_r=1&_t=ZS-987Z29KJiK4" target="_blank" rel="noopener noreferrer" className="font-hand text-xl text-ink hover:text-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral">TikTok</a>
              <a href="https://www.youtube.com/@AedaArt" target="_blank" rel="noopener noreferrer" className="font-hand text-xl text-ink hover:text-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral">YouTube</a>
            </div>
          </div>
          
          <div className="max-w-md w-full">
            <Newsletter />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 pt-6 border-t border-ink/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Aida Ramezani. All rights reserved.</p>
          <p>Handmade in the studio.</p>
        </div>
      </footer>
    </div>
  );
}
