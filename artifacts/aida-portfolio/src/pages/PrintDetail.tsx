import { useState } from "react";
import { ArrowUpRight, Globe2, MapPin } from "lucide-react";
import { Link, useRoute } from "wouter";
import TurkeyProductDialog from "@/components/TurkeyProductDialog";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useLocale } from "@/lib/locale";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { getPrintStartingPrice } from "@/lib/turkiye-products";
import { trackAnalytics } from "@/lib/analytics";
import type { Market } from "@/lib/market";
import type { ManagedProduct } from "@/lib/store";

const detailCopy = {
  en: {
    backProject: "← Back to 100 Windows",
    backPrints: "← Back to prints",
    eyebrow: "MADE FROM AIDA’S ORIGINAL ART",
    day: "DAY",
    short: "About this window",
    printInfo: "PRINT INFORMATION",
    available:
      "This signed print is available to order in Türkiye and internationally.",
    buy: "Buy this print",
    chooser: "Where should we send your print?",
    chooserBody:
      "Choose where you’re ordering from and I’ll send you to the right checkout.",
    trLabel: "TÜRKİYE",
    trTitle: "I’m in Türkiye",
    trBody: "Order directly from Aida’s Istanbul studio.",
    trCta: "Continue in Türkiye",
    intLabel: "OUTSIDE TÜRKİYE",
    intTitle: "I’m outside Türkiye",
    intBody: "Order the international version through Aida’s Fourthwall shop.",
    intCta: "Continue internationally",
    coming: "International edition coming soon",
    comingBody: "This print isn’t available internationally yet.",
    unavailable: "Currently unavailable",
  },
  tr: {
    backProject: "← 100 Windows’a dön",
    backPrints: "← Baskılara dön",
    eyebrow: "AIDA’NIN ORİJİNAL RESMİNDEN",
    day: "GÜN",
    short: "Bu pencerenin hikâyesi",
    printInfo: "BASKI BİLGİLERİ",
    available:
      "Bu imzalı baskı Türkiye’den ve uluslararası olarak sipariş edilebilir.",
    buy: "Bu baskıyı satın al",
    chooser: "Baskını nereye gönderelim?",
    chooserBody:
      "Sipariş verdiğin yeri seç; seni doğru ödeme sayfasına yönlendireyim.",
    trLabel: "TÜRKİYE",
    trTitle: "Türkiye'deyim",
    trBody: "Aida'nın İstanbul'daki atölyesinden doğrudan sipariş ver.",
    trCta: "Türkiye siparişine devam et",
    intLabel: "TÜRKİYE DIŞI",
    intTitle: "Türkiye dışındayım",
    intBody:
      "Uluslararası baskıyı Aida'nın Fourthwall mağazasından sipariş ver.",
    intCta: "Uluslararası siparişe devam et",
    coming: "Uluslararası baskı yakında",
    comingBody: "Bu baskı henüz uluslararası olarak satışta değil.",
    unavailable: "Şu anda mevcut değil",
  },
} as const;

function projectDay(products: ManagedProduct[], id: string) {
  const ordered = products
    .filter((product) => product.isHundredWindowsProduct)
    .sort(
      (a, b) =>
        Date.parse(a.createdAt || "") - Date.parse(b.createdAt || "") ||
        a.id.localeCompare(b.id),
    );
  const index = ordered.findIndex((product) => product.id === id);
  return index < 0 ? null : index + 1;
}

export default function PrintDetail({ market }: { market: Market }) {
  const [, params] = useRoute("/shop/:market/prints/:slug");
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { locale } = useLocale();
  const c = detailCopy[locale];
  const [selected, setSelected] = useState<ManagedProduct | null>(null);
  const [choosing, setChoosing] = useState(false);
  const product = settings.printProducts.find(
    (item) =>
      (item.slug || item.id) === params?.slug &&
      isPubliclyVisible(item) &&
      (market === "turkiye"
        ? item.availableInTurkiye !== false
        : item.availableInternationally !== false),
  );
  const query = new URLSearchParams(window.location.search);
  const fromProject = query.get("from") === "100-windows";
  const projectSection =
    query.get("section") === "archive" ? "project-so-far" : "todays-window";
  const defaultBack = `/shop/${market}/prints`;
  const backHref = fromProject ? `/100-windows#${projectSection}` : defaultBack;
  const backLabel = fromProject ? c.backProject : c.backPrints;
  const day = product ? projectDay(settings.printProducts, product.id) : null;

  usePageMeta(
    product
      ? `${product.name} — Art Print | Aida Ramezani`
      : "Print unavailable | Aida Ramezani",
    product?.fullDescription ||
      product?.description ||
      "View prints and studio goods by Aida Ramezani.",
  );
  if (!product)
    return (
      <section className="section-shell">
        <p className="eyebrow">Prints &amp; Studio Goods</p>
        <h1 className="mt-4 text-5xl">
          This product is not available in this market.
        </h1>
        <Link href={defaultBack} className="button-primary mt-7">
          Browse available products
        </Link>
      </section>
    );

  const shortDescription = product.description;
  const fullDescription = product.fullDescription || product.description;
  const linked = international.products.find(
    (item) => item.id === product.fourthwallProductId,
  );
  const fallback =
    product.fourthwallProductUrl &&
    isSafeFourthwallUrl(product.fourthwallProductUrl, international.shopUrl)
      ? product.fourthwallProductUrl
      : "";
  const internationalHref = linked?.externalUrl || fallback;
  const internationalAvailable = Boolean(
    internationalHref && (linked ? linked.available : true),
  );
  const startingPrice = getPrintStartingPrice(
    product.priceUsdCents,
    product.printOptions,
  );
  const tryPrice = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(startingPrice / 100);
  const sold = isSoldOut(product);

  return (
    <section
      className={`section-shell print-story-detail ${fromProject ? "print-story-detail--project" : ""}`}
    >
      <Link href={backHref} className="button-link print-story-detail__back">
        {backLabel}
      </Link>
      <div className="print-story-detail__layout">
        <div className="print-story-detail__media">
          <img src={product.imageUrl} alt={product.altText || product.name} />
        </div>
        <article className="print-story-detail__story">
          <p className="eyebrow">
            {day && product.isHundredWindowsProduct
              ? `${c.day} ${String(day).padStart(2, "0")} / 100`
              : c.eyebrow}
          </p>
          <h1>{product.name}</h1>
          {shortDescription && (
            <p className="print-story-detail__intro">{shortDescription}</p>
          )}
          {fullDescription && fullDescription !== shortDescription && (
            <div className="print-story-detail__full">
              <h2>{c.short}</h2>
              <p>{fullDescription}</p>
            </div>
          )}
          <div className="print-story-detail__purchase-intro">
            <p className="eyebrow">{c.printInfo}</p>
            <p>{c.available}</p>
            {!choosing && (
              <button
                type="button"
                className="paper-button paper-button--pink paper-button--md"
                disabled={sold}
                onClick={() => {
                  setChoosing(true);
                  trackAnalytics("product_options_opened", {
                    metadata: {
                      productId: product.id,
                      source: fromProject ? "100-windows" : "print-detail",
                    },
                  });
                }}
              >
                {sold ? c.unavailable : c.buy}
              </button>
            )}
          </div>
          {choosing && (
            <div
              className="print-destination"
              aria-labelledby="print-destination-title"
            >
              <div className="print-destination__heading">
                <h2 id="print-destination-title">{c.chooser}</h2>
                <p>{c.chooserBody}</p>
              </div>
              <div className="print-destination__cards">
                <section className="print-destination-card print-destination-card--turkiye">
                  <MapPin aria-hidden="true" />
                  <p className="eyebrow">{c.trLabel}</p>
                  <h3>{c.trTitle}</h3>
                  <p>{c.trBody}</p>
                  <strong>{tryPrice}</strong>
                  <button
                    type="button"
                    disabled={!product.available || sold}
                    onClick={() => {
                      setSelected(product);
                      trackAnalytics("product_options_opened", {
                        metadata: { productId: product.id, market: "turkiye" },
                      });
                    }}
                  >
                    {c.trCta}
                  </button>
                </section>
                <section className="print-destination-card print-destination-card--international">
                  <Globe2 aria-hidden="true" />
                  <p className="eyebrow">{c.intLabel}</p>
                  <h3>{c.intTitle}</h3>
                  <p>{internationalAvailable ? c.intBody : c.comingBody}</p>
                  {international.loading ? (
                    <span className="print-destination__loading">…</span>
                  ) : internationalAvailable ? (
                    <>
                      <strong>
                        {linked?.price?.formatted || "Fourthwall"}
                      </strong>
                      <a
                        href={internationalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackAnalytics("hundred_windows_fourthwall_click", {
                            metadata: { productId: product.id },
                          })
                        }
                      >
                        {c.intCta} <ArrowUpRight aria-hidden="true" />
                      </a>
                    </>
                  ) : (
                    <>
                      <strong>{c.coming}</strong>
                      <button type="button" disabled>
                        {c.intCta}
                      </button>
                    </>
                  )}
                </section>
              </div>
            </div>
          )}
        </article>
      </div>
      <TurkeyProductDialog
        product={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
