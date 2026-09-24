import { useEffect, useState } from "react";
import { Link } from "wouter";
import EditorialProductCard from "@/components/EditorialProductCard";
import InternationalProductCard from "@/components/InternationalProductCard";
import ProductPrice from "@/components/ProductPrice";
import { useInternationalProducts } from "@/hooks/use-international";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { trackAnalytics } from "@/lib/analytics";
import { useLocale } from "@/lib/locale";
import { useShippingDestination } from "@/lib/shipping-destination";
import { addItemToCart } from "@/lib/store";
import { isPubliclyVisible } from "@/lib/product-status";
import { isAceoProduct } from "@/lib/turkiye-products";
import { compareProductDisplayOrder } from "@/lib/product-order";
import { useToast } from "@/hooks/use-toast";
import {
  getFourthwallVariants,
  getLowestFourthwallVariant,
  hasConfiguredFourthwallOptions,
} from "@/lib/fourthwall-variants";

const words = {
  en: {
    printsEye: "LIMITED EDITIONS",
    prints: "Prints",
    printsBody: "Art prints made from Aida's original work.",
    printsCta: "View all prints",
    originalsEye: "ONE OF ONE",
    originals: "Originals",
    originalsBody:
      "One-of-one paintings made slowly, with no two quite the same.",
    originalsCta: "View all originals",
    project: "THE PALETTE PROJECT",
    palette: "A palette made around you.",
    paletteBody:
      "Tell Aida how you like to paint and she will create a handmade watercolor palette around your preferences.",
    live: "Your palette can be made during one of Aida's TikTok Live painting sessions, so you can watch it take shape.",
    custom: "CUSTOM PALETTE · 1,200 TL",
    shipping: "50 TL SHIPPING · FREE FROM 1,500 TL",
    design: "Design your custom palette",
    available: "AVAILABLE NOW",
    ready: "Ready-made palettes",
    readyBody: "One-of-one handmade palettes ready to ship.",
    add: "Add to bag",
    sold: "Sold",
    mailIntro:
      "A small collection of things I made for this month, sent only to the people who choose to keep a piece of it.",
    mailAdd: "Add this edition to bag",
    inside: "Inside this edition",
    once: "Made once, then gone.",
    collectible:
      "The pieces inside each Mail Club are created for that edition only. I do not plan to repeat them in future months or add them to the regular shop. Mail Club is my way of keeping a smaller circle around the work. Little pieces of what I am making, thinking about and living through, shared with the people who choose to keep them.",
    closed: "This edition has closed.",
    until: "Available only until",
    mailShipping: "Free shipping in Türkiye",
    contents: [
      [
        "Exclusive print",
        "A print created only for this Mail Club. It will not be released in the shop later.",
      ],
      [
        "Personal letter",
        "A letter from me with thoughts and stories I do not share publicly online.",
      ],
      ["Sticker sheet", "A small sticker sheet made for this month's edition."],
      ["Habit tracker", "An illustrated page to use throughout the month."],
      ["Bookmark", "A bookmark made for this edition."],
      ["One surprise", "One piece stays secret until your envelope arrives."],
    ],
    merchEye: "FROM THE ANIMATION SERIES",
    merch: "Animation Merch",
    merchBody: "Wearable and useful little pieces from Aida's animation world.",
  },
  tr: {
    printsEye: "SINIRLI EDİSYONLAR",
    prints: "Baskılar",
    printsBody: "Aida'nın orijinal eserlerinden hazırlanan sanat baskıları.",
    printsCta: "Tüm baskıları gör",
    originalsEye: "TEK VE ÖZGÜN",
    originals: "Orijinaller",
    originalsBody: "Her biri tek ve özgün, elde üretilmiş orijinal eserler.",
    originalsCta: "Tüm orijinalleri gör",
    project: "PALET PROJESİ",
    palette: "Sana özel bir palet.",
    paletteBody:
      "Nasıl resim yaptığını ve paletinden ne beklediğini anlat. Aida, tercihlerin doğrultusunda sana özel bir suluboya paleti hazırlasın.",
    live: "Paletin Aida'nın TikTok canlı yayınlarından birinde hazırlanabilir. Böylece yapım sürecini canlı olarak izleyebilirsin.",
    custom: "KİŞİYE ÖZEL PALET · 1.200 TL",
    shipping: "50 TL KARGO · 1.500 TL'DEN İTİBAREN ÜCRETSİZ",
    design: "Kendi paletini tasarla",
    available: "ŞU ANDA MEVCUT",
    ready: "Hazır paletler",
    readyBody: "Gönderime hazır, elde hazırlanmış özgün paletler.",
    add: "Sepete ekle",
    sold: "Satıldı",
    mailIntro:
      "Bu ay için hazırladığım küçük bir koleksiyon, ondan bir parça saklamayı seçen insanlara gönderiliyor.",
    mailAdd: "Bu edisyonu sepete ekle",
    inside: "Bu edisyonun içinde",
    once: "Bir kez hazırlanır, sonra biter.",
    collectible:
      "Her Mail Club'ın içindeki parçalar yalnızca o aya özel hazırlanır. Gelecek aylarda tekrar etmeyi veya normal mağazaya eklemeyi planlamıyorum. Mail Club, yaptıklarımı, düşündüklerimi ve hayatımdan küçük parçaları daha küçük bir çevreyle paylaşma şeklim. Onları saklamak isteyen insanlara ait küçük parçalar.",
    closed: "Bu edisyon sona erdi.",
    until: "Yalnızca şu tarihe kadar mevcut:",
    mailShipping: "Türkiye'de ücretsiz kargo",
    contents: [
      [
        "Özel baskı",
        "Yalnızca bu Mail Club için hazırlanan ve daha sonra mağazada yayınlanmayacak bir baskı.",
      ],
      [
        "Kişisel mektup",
        "Herkese açık olarak paylaşmadığım düşünce ve hikâyelerden bir mektup.",
      ],
      [
        "Sticker sayfası",
        "Bu ayın edisyonu için hazırlanan küçük bir sticker sayfası.",
      ],
      [
        "Alışkanlık takip çizelgesi",
        "Ay boyunca kullanabileceğin illüstrasyonlu bir sayfa.",
      ],
      ["Kitap ayracı", "Bu edisyon için hazırlanan bir kitap ayracı."],
      ["Bir sürpriz", "Zarfın gelene kadar bir parça gizli kalır."],
    ],
    merchEye: "ANİMASYON SERİSİNDEN",
    merch: "Animasyon Ürünleri",
    merchBody:
      "Aida'nın animasyon dünyasından giyilebilir ve kullanışlı küçük parçalar.",
  },
} as const;

export default function HomeCommerce() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const t = words[locale];
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { destination, loading } = useShippingDestination();
  if (loading && !destination)
    return (
      <div
        className="commerce-loading section-shell"
        aria-label="Loading shop"
      />
    );
  const local = destination?.countryCode === "TR";
  const newest = <T,>(values: T[]) =>
    [...values]
      .sort(
        (a: any, b: any) =>
          Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""),
      )
      .slice(0, 4);
  const prints = [...settings.printProducts]
    .filter(
      (p) =>
        isPubliclyVisible(p) &&
        !isAceoProduct(p) &&
        (local || hasConfiguredFourthwallOptions(p)),
    )
    .sort(compareProductDisplayOrder)
    .slice(0, 4);
  const originals = newest(settings.originalProducts.filter(isPubliclyVisible));
  const currentMail = settings.mailClubEditions.find(
    (e) => e.current && e.enabled,
  );
  const readyPalettes = newest(
    settings.readyMadePalettes.filter(
      (p) => p.status === "available" && p.stock > 0,
    ),
  );
  const paletteAvailable =
    settings.paletteSettings.enabled &&
    settings.paletteSettings.types.some((type) => type.enabled);
  const merch = international.products.filter(
    (p) =>
      settings.animationMerchProductIds.includes(p.id) &&
      p.available &&
      p.externalUrl,
  );
  const add = (
    item: Parameters<typeof addItemToCart>[0],
    max = 1,
    confirm = false,
  ) => {
    const result = addItemToCart(item, max, "TR");
    if (result.ok) {
      if (confirm)
        toast({
          title: locale === "tr" ? "Sepete eklendi" : "Added to the basket",
          description: item.title,
          duration: 3000,
          className: "border-green/30 bg-[#edf6ed] text-ink",
        });
      window.dispatchEvent(new Event("cart:open"));
    }
  };
  const mailClubSection = local && currentMail && (
    <section className="commerce-feature commerce-feature--mail section-shell">
      <img
        src={currentMail.coverImage}
        alt={
          locale === "tr" && currentMail.altTextTr
            ? currentMail.altTextTr
            : currentMail.altText
        }
        width="1355"
        height="1824"
        loading="lazy"
      />
      <MailClubPanel
        edition={currentMail}
        locale={locale}
        text={t}
        onAdd={() =>
          add(
            {
              id: `mail-club-${currentMail.id}`,
              productId: currentMail.id,
              kind: "mail-club",
              title: currentMail.title,
              imageUrl: currentMail.coverImage,
              priceUsdCents: currentMail.priceMinor,
              canonicalCurrency: "TRY",
              canonicalPriceMinor: currentMail.priceMinor,
              quantity: 1,
              metadata: {
                editionTitle: currentMail.title,
                editionMonth: currentMail.monthYear,
              },
            },
            currentMail.stock,
            true,
          )
        }
      />
    </section>
  );
  return (
    <>
      {mailClubSection}
      <ProductSection
        eyebrow={t.printsEye}
        title={t.prints}
        body={t.printsBody}
        cta={t.printsCta}
        href="/shop?category=prints"
      >
        {prints.map((p) => {
          const linkedFormats = getFourthwallVariants(
            p,
            international.products,
            international.shopUrl,
          );
          const linked = getLowestFourthwallVariant(linkedFormats)?.product;
          const availableInternational = linkedFormats.some(
            (format) => format.available && format.product?.available,
          );
          return (
            <EditorialProductCard
              key={p.id}
              href={`/shop/prints/${p.slug || p.id}`}
              image={p.imageUrl}
              alt={p.altText || p.name}
              title={p.name}
              price={
                local ? (
                  <ProductPrice
                    regularPriceMinor={p.priceMinor ?? p.priceUsdCents}
                    currency="TRY"
                    sale={p.sale}
                    compact
                  />
                ) : (
                  linked?.price.formatted
                )
              }
              metadata={locale === "tr" ? "BASKI" : "PRINT"}
              status={
                p.status === "sold_out" ||
                (!local &&
                  linkedFormats.length > 0 &&
                  !international.loading &&
                  !availableInternational)
                  ? "sold"
                  : availableInternational || local
                    ? "available"
                    : "loading"
              }
            />
          );
        })}
      </ProductSection>
      {local && (
        <ProductSection
          eyebrow={t.originalsEye}
          title={t.originals}
          body={t.originalsBody}
          cta={t.originalsCta}
          href="/shop?category=originals"
        >
          {originals.map((p) => (
            <EditorialProductCard
              key={p.id}
              href={`/shop/originals/${p.slug || p.id}`}
              image={p.imageUrl}
              alt={p.altText || p.name}
              title={p.name}
              price={
                <ProductPrice
                  regularPriceMinor={p.priceUsdCents}
                  currency="USD"
                  sale={p.sale}
                  compact
                />
              }
              metadata={locale === "tr" ? "ORİJİNAL" : "ORIGINAL"}
              status="available"
            />
          ))}
        </ProductSection>
      )}
      {local && settings.paletteSettings.enabled && (
        <section className="commerce-feature section-shell">
          <img
            src={settings.paletteSettings.coverImage}
            alt="Blue and pink handmade watercolor palette"
            width="1200"
            height="1800"
            loading="lazy"
          />
          <div className="commerce-feature__panel">
            <p className="eyebrow">{t.project}</p>
            <h2>{t.palette}</h2>
            <p>{t.paletteBody}</p>
            <p>{t.live}</p>
            <ProductPrice
              regularPriceMinor={settings.paletteSettings.priceMinor}
              currency="TRY"
              sale={settings.paletteSettings.sale}
            />
            {paletteAvailable ? (
              <Link
                href="/shop/palettes/custom"
                onClick={() =>
                  trackAnalytics("custom_palette_started", {
                    metadata: { locale, shippingCountry: "TR" },
                  })
                }
              >
                {t.design} →
              </Link>
            ) : (
              <p>
                {locale === "tr"
                  ? "Kişiye özel paletlere kısa bir ara verildi."
                  : "Custom palettes are taking a short pause."}
              </p>
            )}
          </div>
        </section>
      )}
      {local && readyPalettes.length > 0 && (
        <ProductSection
          eyebrow={t.available}
          title={t.ready}
          body={t.readyBody}
        >
          {readyPalettes.map((p) => (
            <article className="ready-palette" key={p.id}>
              <img src={p.imageUrl} alt={p.altText || p.name} loading="lazy" />
              <div>
                <p className="eyebrow">{t.available}</p>
                <h3>{locale === "tr" && p.nameTr ? p.nameTr : p.name}</h3>
                <p>
                  {p.colors ||
                    (locale === "tr" && p.descriptionTr
                      ? p.descriptionTr
                      : p.description)}
                </p>
                {p.note && <p>{p.note}</p>}
                <ProductPrice
                  regularPriceMinor={p.priceMinor}
                  currency="TRY"
                  sale={p.sale}
                />
                <span>{t.shipping}</span>
                <button
                  onClick={() =>
                    add(
                      {
                        id: `ready-palette-${p.id}`,
                        productId: p.id,
                        kind: "ready-palette",
                        title: p.name,
                        imageUrl: p.imageUrl,
                        priceUsdCents: p.priceMinor,
                        canonicalCurrency: "TRY",
                        canonicalPriceMinor: p.priceMinor,
                        quantity: 1,
                      },
                      p.stock,
                    )
                  }
                >
                  {t.add}
                </button>
              </div>
            </article>
          ))}
        </ProductSection>
      )}
      <ProductSection eyebrow={t.merchEye} title={t.merch} body={t.merchBody}>
        {merch.map((p) => (
          <div
            key={p.id}
            onClick={() =>
              trackAnalytics("animation_merch_clicked", {
                entityId: p.id,
                metadata: {
                  locale,
                  shippingCountry: destination?.countryCode || "unknown",
                },
              })
            }
          >
            <InternationalProductCard product={p} />
          </div>
        ))}
      </ProductSection>
    </>
  );
}

function MailClubPanel({
  edition,
  locale,
  text,
  onAdd,
}: {
  edition: ReturnType<typeof useShopSettings>["mailClubEditions"][number];
  locale: "en" | "tr";
  text: typeof words.en | typeof words.tr;
  onAdd: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!edition.availabilityEnd) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [edition.availabilityEnd]);
  const start = edition.availabilityStart
    ? Date.parse(edition.availabilityStart)
    : null;
  const end = edition.availabilityEnd
    ? Date.parse(edition.availabilityEnd)
    : null;
  const open =
    edition.status === "published" &&
    edition.enabled &&
    edition.stock > 0 &&
    (!start || now >= start) &&
    (!end || now < end);
  const remaining = end ? Math.max(0, end - now) : 0;
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const endLabel = end
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
        day: "numeric",
        month: "long",
      }).format(end)
    : "";
  return (
    <div className="commerce-feature__panel">
      <h2>
        {locale === "tr" && edition.titleTr ? edition.titleTr : edition.title}
      </h2>
      <p>
        {locale === "tr" && edition.descriptionTr
          ? edition.descriptionTr
          : text.mailIntro}
      </p>
      <h3>{text.inside}</h3>
      <div className="mail-club-contents">
        {text.contents.map(([title, body]) => (
          <div key={title}>
            <strong>{title}</strong>
            <p>{body}</p>
          </div>
        ))}
      </div>
      <div className="mail-club-note">
        <strong>{text.once}</strong>
        <p>{text.collectible}</p>
      </div>
      {end && remaining > 0 && (
        <div className="mail-club-countdown">
          <span>
            {text.until} {endLabel}
          </span>
          <strong>
            {days} {locale === "tr" ? "gün" : "days"} · {hours}{" "}
            {locale === "tr" ? "saat" : "hours"}
          </strong>
        </div>
      )}
      <div className="mail-club-price-block">
        <ProductPrice
          regularPriceMinor={edition.priceMinor}
          currency="TRY"
          sale={edition.sale}
          presentation="mail-club"
        />
        <p>{text.mailShipping}</p>
      </div>
      {open ? (
        <button onClick={onAdd}>{text.mailAdd}</button>
      ) : (
        <span>{end && now >= end ? text.closed : text.sold}</span>
      )}
    </div>
  );
}

function ProductSection({
  eyebrow,
  title,
  body,
  cta,
  href,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  cta?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="commerce-section section-shell">
      <header>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {body && <p>{body}</p>}
      </header>
      <div className="commerce-grid">{children}</div>
      {cta && href && (
        <Link className="home-green-rule-link" href={href}>
          {cta} →
        </Link>
      )}
    </section>
  );
}
