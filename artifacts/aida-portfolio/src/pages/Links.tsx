import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Instagram, Mail, Music2, Youtube } from "lucide-react";
import { portrait } from "@/lib/assets";
import originalPaintingsImage from "@assets/links-original-paintings.jpg";
import printsGoodsImage from "@assets/links-prints-goods.jpg";
import mysteryMailImage from "@assets/links-mystery-mail.jpg";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
type Region = "turkiye" | "international";
const KEY = "aida-link-region";
const localLinks = [
  {
    href: "/shop/turkiye/originals",
    title: "Original Paintings",
    description: "One-of-a-kind works collected directly from Aida.",
    image: originalPaintingsImage,
    position: "center",
  },
  {
    href: "/shop/turkiye/prints",
    title: "Prints & Goods",
    description: "Signed prints and studio goods prepared for Türkiye.",
    image: printsGoodsImage,
    position: "center",
  },
  {
    href: "/shop/turkiye/mystery-mail",
    title: "Mystery Mail",
    description:
      "The current limited secret edition, delivered within Türkiye.",
    image: mysteryMailImage,
    position: "center",
  },
];

const internationalLinks = [
  {
    href: "/shop/international/originals",
    title: "Original Paintings",
    description: "Collect original work directly from Aida.",
    image: originalPaintingsImage,
    position: "center",
  },
  {
    href: "/shop/international/prints",
    title: "International Prints",
    description:
      "Prints and goods fulfilled internationally through Fourthwall.",
    image: printsGoodsImage,
    position: "center",
  },
];

function ImageLinkCard({
  href,
  title,
  description,
  image,
  position,
}: (typeof localLinks)[number]) {
  return (
    <Link
      href={href}
      className="group relative aspect-square min-w-0 overflow-hidden bg-ink text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035] group-focus-visible:scale-[1.035]"
        style={{ objectPosition: position }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/15 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <strong className="block font-serif text-xl leading-tight sm:text-2xl">
          {title}
        </strong>
        <span className="mt-1.5 block text-xs leading-relaxed text-paper/80 sm:text-sm">
          {description}
        </span>
      </span>
    </Link>
  );
}
export default function Links() {
  usePageMeta(
    "Aida Ramezani — Shop & Social Links",
    "Explore Aida Ramezani’s Türkiye shop, international Fourthwall collection and social channels.",
  );
  const settings = useShopSettings();
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
      <Link
        href={region === "turkiye" ? "/shop/turkiye" : "/shop/international"}
        className="button-primary mt-4 flex min-h-14 w-full items-center justify-center text-center"
      >
        {region === "turkiye"
          ? "Go to Türkiye Shop"
          : "Go to International Shop"}
      </Link>
      <Link
        href="/newsletter"
        className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 border border-coral bg-paper px-5 text-center font-semibold text-coral transition-colors hover:bg-coral hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
      >
        <Mail size={18} aria-hidden="true" />
        Join the Studio Letter
      </Link>
      {region === "turkiye" ? (
        <section id="turkiye-panel" role="tabpanel" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            {localLinks.map((link) => (
              <ImageLinkCard key={link.title} {...link} />
            ))}
          </div>
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
        <section id="international-panel" role="tabpanel" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {internationalLinks.map((link) => (
              <ImageLinkCard key={link.title} {...link} />
            ))}
          </div>
          <p className="mt-4 text-sm text-ink/55">
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
            href="mailto:aida@aedaart.com"
            className="underline underline-offset-4"
          >
            Contact
          </a>
        </div>
      </section>
    </main>
  );
}
