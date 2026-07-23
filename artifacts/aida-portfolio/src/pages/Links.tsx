import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ExternalLink,
  Instagram,
  Music2,
  Youtube,
} from "lucide-react";
import { portrait } from "@/lib/assets";
import { loadShopSettings } from "@/lib/store";
import { useInternationalProducts } from "@/hooks/use-international";
import InternationalProductCard from "@/components/InternationalProductCard";
import { usePageMeta } from "@/hooks/use-page-meta";
type Region = "turkiye" | "international";
const KEY = "aida-link-region";
const localLinks = [
  [
    "/shop/turkiye/originals",
    "Original Paintings",
    "One-of-a-kind works collected directly from Aida.",
  ],
  [
    "/shop/turkiye/prints",
    "Prints & Goods",
    "Signed prints, T-shirts, mugs and stickers prepared for Türkiye.",
  ],
  [
    "/shop/turkiye/mystery-mail",
    "Mystery Mail",
    "The current limited secret edition, delivered within Türkiye.",
  ],
  [
    "/how-to-collect",
    "How to Collect",
    "Learn how the personal WhatsApp collecting process works.",
  ],
  [
    "/basket/turkiye",
    "Collection Basket",
    "Review your selected pieces and continue directly with Aida.",
  ],
];
export default function Links() {
  usePageMeta(
    "Aida Ramezani — Shop & Social Links",
    "Explore Aida Ramezani’s Türkiye shop, international Fourthwall collection and social channels.",
  );
  const settings = loadShopSettings();
  const { products, shopUrl } = useInternationalProducts();
  const [region, setRegionState] = useState<Region>(() =>
    localStorage.getItem(KEY) === "turkiye" ? "turkiye" : "international",
  );
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    fetch("/api/currency")
      .then((x) => x.json())
      .then((x) => {
        if (x.country === "TR") setRegionState("turkiye");
      })
      .catch(() => {});
  }, []);
  const setRegion = (value: Region) => {
    setRegionState(value);
    localStorage.setItem(KEY, value);
  };
  const keyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (index + 1) % 2 : (index + 1) % 2;
    tabs.current[next]?.focus();
    setRegion(next === 0 ? "turkiye" : "international");
  };
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
  ].filter((x) => {
    try {
      return (
        typeof x[0] === "string" &&
        new URL(x[0] as string).protocol === "https:"
      );
    } catch {
      return false;
    }
  });
  return (
    <main className="mx-auto min-h-screen w-full max-w-[600px] px-5 py-8 md:py-12">
      <Link
        href="/"
        className="text-sm font-semibold underline underline-offset-4"
      >
        ← Full website
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
        <p className="mt-2 text-sm font-semibold">
          Collect directly in Türkiye or shop internationally.
        </p>
      </header>
      <div
        role="tablist"
        aria-label="Shop region"
        className="mt-8 grid grid-cols-2 border border-ink/20 p-1"
      >
        {(["turkiye", "international"] as Region[]).map((x, i) => (
          <button
            key={x}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            aria-selected={region === x}
            aria-controls={`${x}-panel`}
            onKeyDown={(e) => keyDown(e, i)}
            onClick={() => setRegion(x)}
            className={`min-h-12 font-semibold capitalize ${region === x ? "bg-ink text-paper" : "bg-transparent"}`}
          >
            {x === "turkiye" ? "Türkiye" : "International"}
          </button>
        ))}
      </div>
      {region === "turkiye" ? (
        <section id="turkiye-panel" role="tabpanel" className="mt-6 space-y-3">
          <Link href="/shop/turkiye" className="button-primary w-full">
            Enter the Türkiye Shop
          </Link>
          {localLinks.map(([href, title, description]) => (
            <Link
              key={title as string}
              href={href as string}
              className="block min-h-20 border border-ink/15 bg-card p-5 focus-visible:ring-2"
            >
              <strong className="font-serif text-xl">{title as string}</strong>
              <span className="mt-1 block text-sm text-ink/60">
                {description as string}
              </span>
            </Link>
          ))}
          <div className="mt-5 bg-ochre/10 p-5">
            <h2 className="text-2xl">Collect directly from the artist</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">
              Choose your pieces, add them to your basket, and continue
              personally with Aida on WhatsApp to confirm availability, payment
              and delivery.
            </p>
          </div>
        </section>
      ) : (
        <section
          id="international-panel"
          role="tabpanel"
          className="mt-6 space-y-4"
        >
          <Link
            href="/shop/international"
            className="block border border-ink/15 bg-card p-5"
          >
            <strong className="font-serif text-xl">International Shop</strong>
            <span className="mt-1 block text-sm text-ink/60">
              Collect an original directly from Aida or explore international
              prints through Fourthwall.
            </span>
          </Link>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/shop/international/originals"
              className="block border border-ink/15 bg-card p-5"
            >
              <strong>Original Paintings</strong>
              <span className="mt-1 block text-sm text-ink/60">
                Original shipping is quoted separately.
              </span>
            </Link>
            <Link
              href="/shop/international/prints"
              className="block border border-ink/15 bg-card p-5"
            >
              <strong>International Prints</strong>
              <span className="mt-1 block text-sm text-ink/60">
                Fulfilled through Fourthwall.
              </span>
            </Link>
          </div>
          {shopUrl && (
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-ink/15 bg-card p-5"
            >
              <strong className="flex items-center gap-2 font-serif text-xl">
                Visit the full Fourthwall shop <ExternalLink size={15} />
              </strong>
              <span className="mt-1 block text-sm text-ink/60">
                Open Aida’s complete international storefront.
              </span>
            </a>
          )}
          {products.slice(0, 2).map((x) => (
            <InternationalProductCard key={x.id} product={x} compact />
          ))}
          <p className="text-sm text-ink/55">
            Originals are collected directly from Aida. International print
            payment, shipping and fulfillment are completed through Fourthwall.
          </p>
        </section>
      )}
      <section className="mt-10 border-t border-ink/15 pt-7">
        <h2 className="eyebrow text-center">Follow the studio</h2>
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
        <div className="mt-6 flex justify-center gap-5 text-sm">
          <Link href="/about" className="underline underline-offset-4">
            About Aida
          </Link>
          <a
            href="mailto:hello@aidaramezani.com"
            className="underline underline-offset-4"
          >
            Contact
          </a>
        </div>
      </section>
    </main>
  );
}
