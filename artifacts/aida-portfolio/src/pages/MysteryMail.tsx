import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, PackageCheck, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import Money from "@/components/Money";
import { ShopPageHeader } from "@/components/RegionalShop";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useServerNow } from "@/hooks/use-server-now";
import { useToast } from "@/hooks/use-toast";
import { mysteryMailCoverImage } from "@/lib/assets";
import {
  getMysteryMailCountdown,
  getMysteryMailUrgency,
} from "@/lib/mystery-mail";
import { addItemToCart, setActiveShoppingRegion } from "@/lib/store";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useLocale } from "@/lib/locale";
import StudioLetterSignup from "@/components/StudioLetterSignup";

const TITLE = "Mystery Mail Art Package in Türkiye | Aida Ramezani";
const DESCRIPTION =
  "Order Aida Ramezani’s limited Mystery Mail in Türkiye, featuring an exclusive art postcard, studio stickers and surprise art objects with free shipping.";
const CANONICAL_PATH = "/shop/turkiye/mystery-mail";
const EMPTY_TITLE = "Mystery Mail Art Editions | Aida Ramezani";
const EMPTY_DESCRIPTION =
  "Discover Aida Ramezani’s limited Mystery Mail art editions, released for a short time with exclusive art postcards, stickers and studio surprises in Türkiye.";

const MYSTERY_NEWSLETTER_COPY = {
  en: {
    comingEyebrow: "THE NEXT MYSTERY IS BEING PREPARED",
    comingHeading: "The next Mystery Mail is still sealed.",
    comingBody:
      "Aida is preparing a new limited parcel with an exclusive mini print and a few unrevealed studio surprises. Join the free Studio Letter and be among the first to know when it becomes available.",
    reassurance: "One-time purchase. Never a subscription.",
    comingSubmit: "Tell me when it opens",
    comingTrust:
      "Free to join. You’ll also receive occasional stories and updates from Aida’s studio.",
    closedEyebrow: "THIS EDITION HAS CLOSED",
    closedHeading: "This Mystery Mail has left the studio.",
    closedBody:
      "This limited edition is no longer available. Join the free Studio Letter to hear about the next Mystery Mail before it opens.",
    closedSubmit: "Be first to know",
    secondaryHeading: "Want first notice of the next edition?",
    secondaryBody:
      "Join the free Studio Letter for early news about future Mystery Mail releases and new work from the studio.",
    secondarySubmit: "Join the Studio Letter",
  },
  tr: {
    comingEyebrow: "YENİ GİZEM HAZIRLANIYOR",
    comingHeading: "Yeni Mystery Mail henüz mühürlü.",
    comingBody:
      "Aida; yalnızca bu edisyona özel bir mini baskı ve henüz açıklanmayan birkaç atölye sürprizi içeren yeni, sınırlı bir paket hazırlıyor. Satışa çıktığında ilk öğrenenlerden olmak için ücretsiz Stüdyo Mektubu’na katıl.",
    reassurance: "Tek seferlik satın alma. Abonelik değildir.",
    comingSubmit: "Satışa çıktığında haber ver",
    comingTrust:
      "Katılım ücretsizdir. Ayrıca Aida’nın atölyesinden ara sıra hikâyeler ve güncellemeler alırsın.",
    closedEyebrow: "BU EDİSYON SONA ERDİ",
    closedHeading: "Bu Mystery Mail atölyeden ayrıldı.",
    closedBody:
      "Bu sınırlı edisyon artık satışta değil. Yeni Mystery Mail açılmadan önce haberdar olmak için ücretsiz Stüdyo Mektubu’na katıl.",
    closedSubmit: "İlk öğrenenlerden ol",
    secondaryHeading:
      "Bir sonraki edisyonu ilk öğrenenlerden olmak ister misin?",
    secondaryBody:
      "Gelecek Mystery Mail edisyonlarından ve atölyedeki yeni çalışmalardan erken haberdar olmak için ücretsiz Stüdyo Mektubu’na katıl.",
    secondarySubmit: "Stüdyo Mektubu’na katıl",
  },
} as const;

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) =>
    element!.setAttribute(name, value),
  );
  return element;
}

function ShopTabs() {
  return <ShopPageHeader region="TR" />;
}

export function CompactCountdown({ remaining }: { remaining: number }) {
  const parts = getMysteryMailCountdown(remaining);
  const urgency = getMysteryMailUrgency(remaining);
  return (
    <div
      className={`mt-5 border-t border-paper/10 pt-4 ${urgency.critical ? "border-t-coral" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`eyebrow ${urgency.closingSoon ? "!text-coral" : "!text-paper/45"}`}
        >
          Time remaining
        </p>
        {urgency.critical ? (
          <span className="text-xs font-semibold text-coral">Closing soon</span>
        ) : urgency.limitedWindow ? (
          <span className="text-xs font-semibold text-paper/60">
            Limited ordering window
          </span>
        ) : null}
      </div>
      <div className="mystery-mail-countdown mt-3 border border-paper/10">
        {(
          [
            ["days", parts.days],
            ["hours", parts.hours],
            ["minutes", parts.minutes],
            ["seconds", parts.seconds],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="border-b border-r border-paper/10 px-2 py-3 text-center last:border-r-0 sm:border-b-0"
          >
            <span
              className={`block font-serif text-2xl leading-none md:text-3xl ${urgency.critical ? "text-coral" : "text-paper"}`}
            >
              {String(value).padStart(2, "0")}
            </span>
            <span className="mt-2 block text-[9px] font-bold uppercase tracking-[.12em] text-paper/45 md:text-[10px]">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {parts.days} days and {parts.hours} hours remaining.
      </p>
    </div>
  );
}

export default function MysteryMail() {
  const settings = useShopSettings();
  const { locale } = useLocale();
  const explicitlyBetweenEditions =
    settings.mysteryMail.storefrontMode === "not-available-yet";
  const selectedEdition = settings.mysteryMail.activeEditionId
    ? settings.studioMailPackages.find(
        (item) => item.id === settings.mysteryMail.activeEditionId,
      )
    : settings.studioMailPackages.find(
        (item) => item.status === "published" || item.status === "sold_out",
      );
  const current =
    !explicitlyBetweenEditions &&
    selectedEdition &&
    ["published", "sold_out"].includes(selectedEdition.status)
      ? selectedEdition
      : undefined;
  const betweenEditions = explicitlyBetweenEditions || !current;
  usePageMeta(
    betweenEditions ? EMPTY_TITLE : TITLE,
    betweenEditions ? EMPTY_DESCRIPTION : DESCRIPTION,
  );
  useEffect(() => setActiveShoppingRegion("TR"), []);
  const now = useServerNow();
  const expiresAt = current?.expiresAt ? Date.parse(current.expiresAt) : 0;
  const remaining = expiresAt - now;
  const soldOut = Boolean(
    current && (current.status === "sold_out" || current.inventory < 1),
  );
  const active = Boolean(
    current && current.status === "published" && !soldOut && expiresAt > now,
  );
  const closed = Boolean(current) && !soldOut && !active;
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const { toast } = useToast();
  const englishDisplayName = current
    ? /^Mystery Mail(?:\s*[—-]|$)/i.test(current.title)
      ? current.vagueSubtitle || current.theme || "A Secret From the Studio"
      : current.title
    : "The next secret is taking shape.";
  const displayName =
    locale === "tr" && current?.titleTr ? current.titleTr : englishDisplayName;
  const localizedTeaser =
    locale === "tr" && current?.shortDescriptionTr
      ? current.shortDescriptionTr
      : current?.shortDescription;
  const displayedCover = mysteryMailCoverImage;
  const image = mysteryMailCoverImage;
  const editionNumber = String(
    Math.max(1, current?.displayOrder || 1),
  ).padStart(2, "0");
  const deadline = current?.expiresAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Istanbul",
      }).format(new Date(current.expiresAt))
    : null;

  useEffect(() => {
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${CANONICAL_PATH}`;
    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: betweenEditions
        ? EMPTY_TITLE
        : "Current Mystery Mail by Aida Ramezani",
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: betweenEditions
        ? EMPTY_DESCRIPTION
        : "A limited sealed art parcel with an exclusive art postcard, stickers and mystery studio objects, delivered free within Türkiye.",
    });
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: betweenEditions ? "website" : "product",
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: new URL(image, origin).href,
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: betweenEditions
        ? EMPTY_TITLE
        : "Current Mystery Mail by Aida Ramezani",
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: betweenEditions ? EMPTY_DESCRIPTION : DESCRIPTION,
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: new URL(image, origin).href,
    });
    const availability = active
      ? "https://schema.org/InStock"
      : soldOut
        ? "https://schema.org/SoldOut"
        : "https://schema.org/Discontinued";
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        {
          "@type": "ListItem",
          position: 2,
          name: "Türkiye Shop",
          item: `${origin}/shop/turkiye`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Mystery Mail",
          item: canonicalUrl,
        },
      ],
    };
    const product = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: displayName,
      description: DESCRIPTION,
      image: new URL(image, origin).href,
      sku: current?.id || "mystery-mail",
      brand: { "@type": "Brand", name: "Aida Ramezani" },
      offers: current
        ? {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "TRY",
            price: (current.priceUsdCents / 100).toFixed(2),
            priceValidUntil: current.expiresAt,
            availability,
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingDestination: {
                "@type": "DefinedRegion",
                addressCountry: "TR",
              },
              shippingRate: {
                "@type": "MonetaryAmount",
                value: "0",
                currency: "USD",
              },
            },
          }
        : undefined,
    };
    const data = betweenEditions
      ? [
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: EMPTY_TITLE,
            description: EMPTY_DESCRIPTION,
            url: canonicalUrl,
          },
          breadcrumb,
        ]
      : [product, breadcrumb];
    let script = document.head.querySelector(
      "script[data-mystery-mail-schema]",
    ) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.mysteryMailSchema = "true";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => {
      script?.remove();
      canonical?.remove();
      document.head.querySelector('meta[property="og:url"]')?.remove();
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[name="twitter:image"]')?.remove();
    };
  }, [active, betweenEditions, current, displayName, image, soldOut]);

  const add = () => {
    if (!current || !active) {
      setMessage("This Mystery Mail is no longer available.");
      return;
    }
    const result = addItemToCart(
      {
        id: current.id,
        kind: "studio-mail",
        title: displayName,
        subtitle: "Limited Mystery Mail",
        imageUrl: displayedCover,
        priceUsdCents: current.priceUsdCents,
        market: "turkiye",
        canonicalCurrency: "TRY",
        canonicalPriceMinor: current.priceUsdCents,
        displayCurrency: "TRY",
        quantity: 1,
        maxQuantity: current.maximumQuantity || current.inventory,
        expiresAt: current.expiresAt,
        shippingRestriction: "Free shipping within Türkiye",
      },
      current.maximumQuantity || current.inventory,
      "TR",
    );
    if (result.ok) {
      setMessage("");
      setAdded(true);
      toast({
        title: "Added to the basket",
        description: displayName,
        duration: 3000,
        className: "border-green/30 bg-[#edf6ed] text-ink",
      });
      window.setTimeout(() => setAdded(false), 2500);
    } else {
      setMessage(result.reason || "This Mystery Mail could not be added.");
    }
  };

  const faq = useMemo(
    () => [
      [
        "Is Mystery Mail a subscription?",
        "No. Each Mystery Mail is a separate one-time edition.",
      ],
      [
        "Where is Mystery Mail delivered?",
        "Mystery Mail is currently available only within Türkiye, with free shipping.",
      ],
      [
        "What happens when the timer ends?",
        "The edition closes and can no longer be added to the basket.",
      ],
      [
        "Is the postcard available separately?",
        "No. The art postcard is created only for that Mystery Mail edition.",
      ],
      [
        "Does adding it to the basket reserve it?",
        "Your selection is confirmed personally with Aida when you continue on WhatsApp.",
      ],
    ],
    [],
  );

  if (betweenEditions || closed || soldOut) {
    const copy = MYSTERY_NEWSLETTER_COPY[locale];
    const isClosed = Boolean(current) && (closed || soldOut);
    return (
      <div>
        <ShopTabs />
        <section className="bg-ink text-paper" data-no-translate>
          <div className="section-shell mystery-mail-hero-grid">
            <div className="self-center">
              <p className="eyebrow !text-coral">
                {isClosed ? copy.closedEyebrow : copy.comingEyebrow}
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl text-paper md:text-7xl">
                {isClosed ? copy.closedHeading : copy.comingHeading}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/75">
                {isClosed ? copy.closedBody : copy.comingBody}
              </p>
              {!isClosed && (
                <p className="mt-5 max-w-xl text-sm font-semibold text-paper/60">
                  {copy.reassurance}
                </p>
              )}
            </div>
            <div className="min-w-0 border border-paper/15 bg-[#24231f]">
              <img
                src={mysteryMailCoverImage}
                alt="A sealed Mystery Mail art parcel from Aida Ramezani’s studio between editions."
                className="aspect-[16/9] w-full object-cover opacity-70 contrast-75"
              />
              <div className="border-t border-paper/15 p-5 md:p-7">
                <StudioLetterSignup
                  variant="compact"
                  context="mystery-mail"
                  dark
                  submitLabel={{
                    en: isClosed
                      ? MYSTERY_NEWSLETTER_COPY.en.closedSubmit
                      : MYSTERY_NEWSLETTER_COPY.en.comingSubmit,
                    tr: isClosed
                      ? MYSTERY_NEWSLETTER_COPY.tr.closedSubmit
                      : MYSTERY_NEWSLETTER_COPY.tr.comingSubmit,
                  }}
                  trustText={{
                    en: MYSTERY_NEWSLETTER_COPY.en.comingTrust,
                    tr: MYSTERY_NEWSLETTER_COPY.tr.comingTrust,
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <ShopTabs />

      <section className="bg-ink text-paper">
        <div className="section-shell mystery-mail-hero-grid">
          <div>
            <p className="eyebrow !text-paper/55">
              Mystery Mail · {editionNumber} · Türkiye only
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl text-paper md:text-7xl">
              {displayName}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper/75">
              {localizedTeaser ||
                "A sealed art parcel from Aida’s Istanbul studio."}
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-paper/75">
              Inside is one exclusive art postcard created only for this
              edition, studio stickers and a few small surprises that remain
              secret until the parcel reaches you.
            </p>
            <p className="mt-5 text-sm font-semibold text-paper/65">
              One-time purchase · Not a subscription · Free shipping within
              Türkiye
            </p>
          </div>

          <div className="min-w-0">
            <img
              src={displayedCover}
              alt="A sealed Mystery Mail art parcel prepared in Aida Ramezani’s Istanbul studio."
              className="aspect-[4/3] w-full border border-paper/15 object-cover shadow-2xl"
            />
            {current && (
              <div className="border-x border-b border-paper/15 bg-[#24231f] p-5 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow !text-paper/45">Edition price</p>
                    <Money
                      baseAmountUsdCents={current.priceUsdCents}
                      canonicalCurrency="TRY"
                      showBase
                      className="mt-2 block font-sans text-3xl font-bold text-paper [&_small]:!text-paper/50"
                    />
                  </div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-paper">
                    <PackageCheck size={18} className="text-coral" />
                    Free Türkiye shipping
                  </p>
                </div>
                {active && <CompactCountdown remaining={remaining} />}
                {deadline && (
                  <p className="mt-4 border-t border-paper/10 pt-4 text-sm text-paper/65">
                    Orders close {deadline} Istanbul time.
                  </p>
                )}
                <button
                  disabled={!active || added}
                  onClick={add}
                  className={`button-primary mt-5 w-auto min-w-64 disabled:opacity-70 ${added ? "!bg-green !text-paper" : ""}`}
                >
                  {added ? "Added to the basket" : "Add Mystery Mail to basket"}
                </button>
                <p className="mt-3 text-xs text-paper/55">
                  Your selection is confirmed personally with Aida on WhatsApp.
                </p>
                <p
                  aria-live="polite"
                  className="mt-2 text-sm font-semibold text-coral"
                >
                  {message}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className="section-shell !py-10"
        aria-labelledby="mystery-next-edition-heading"
        data-no-translate
      >
        <div className="grid items-center gap-7 border-l-2 border-coral bg-ochre/10 p-6 md:grid-cols-[1fr_minmax(320px,.8fr)] md:p-8">
          <div>
            <h2 id="mystery-next-edition-heading" className="text-3xl">
              {MYSTERY_NEWSLETTER_COPY[locale].secondaryHeading}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">
              {MYSTERY_NEWSLETTER_COPY[locale].secondaryBody}
            </p>
          </div>
          <StudioLetterSignup
            variant="compact"
            context="mystery-mail"
            submitLabel={{
              en: MYSTERY_NEWSLETTER_COPY.en.secondarySubmit,
              tr: MYSTERY_NEWSLETTER_COPY.tr.secondarySubmit,
            }}
          />
        </div>
      </section>

      <section className="section-shell">
        <p className="eyebrow">Without spoiling the secret</p>
        <h2 className="mt-4 text-4xl md:text-6xl">
          A few things you can know.
        </h2>
        <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {[
            [
              BadgeCheck,
              "One exclusive art postcard not available anywhere else",
            ],
            [Check, "Studio stickers created for this edition"],
            [ShieldCheck, "A few mystery objects selected from the studio"],
            [
              PackageCheck,
              "Protective packaging and free delivery within Türkiye",
            ],
          ].map(([Icon, label]) => {
            const ItemIcon = Icon as typeof Check;
            return (
              <li
                key={label as string}
                className="flex items-center gap-4 py-5"
              >
                <ItemIcon className="shrink-0 text-coral" size={20} />
                <span className="text-lg">{label as string}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bg-ink text-paper">
        <div className="section-shell">
          <h2 className="max-w-3xl text-4xl text-paper md:text-6xl">
            The rest stays inside the envelope.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/70">
            Mystery Mail is designed to feel like receiving a small piece of the
            studio rather than ordering a predictable product. The theme gives
            you a clue, but the complete edition is revealed only when you open
            it.
          </p>
        </div>
      </section>

      <section className="section-shell">
        <h2 className="text-4xl md:text-6xl">From the studio to your door.</h2>
        <ol className="mt-10 grid gap-px bg-ink/10 md:grid-cols-3">
          {[
            [
              "01",
              "Add it to your basket",
              "Choose the current edition before orders close.",
            ],
            [
              "02",
              "Continue with Aida",
              "Review your basket and confirm your order personally on WhatsApp.",
            ],
            [
              "03",
              "Receive the mystery",
              "Your parcel is prepared in the studio and delivered free within Türkiye.",
            ],
          ].map(([number, title, copy]) => (
            <li key={number} className="bg-card p-7">
              <span className="font-hand text-2xl text-coral">{number}</span>
              <h3 className="mt-5 text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section-shell !pt-0">
        <h2 className="text-4xl md:text-5xl">Mystery Mail questions</h2>
        <div className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
          {faq.map(([question, answer]) => (
            <details key={question} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral">
                {question}
                <span
                  className="text-coral group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-relaxed text-ink/65">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
