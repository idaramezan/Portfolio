import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import TurkeyProductDialog from "@/components/TurkeyProductDialog";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useLocale } from "@/lib/locale";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import { trackAnalytics } from "@/lib/analytics";
import type { Market } from "@/lib/market";
import type { ManagedProduct } from "@/lib/store";
import {
  DestinationControl,
  useShippingDestination,
} from "@/lib/shipping-destination";
import ProductImageLightbox from "@/components/ProductImageLightbox";
import RelatedProducts from "@/components/RelatedProducts";
import { isAceoProduct } from "@/lib/turkiye-products";

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
      "Choose where you’re ordering from and we’ll take you to the right checkout.",
    trLabel: "TÜRKİYE",
    trTitle: "I’m in Türkiye",
    trBody: "Order directly from Aida’s Istanbul studio.",
    trNote: "Prices and delivery will be shown in TRY.",
    trCta: "Continue in Türkiye",
    intLabel: "OUTSIDE TÜRKİYE",
    intTitle: "I’m outside Türkiye",
    intBody: "Order the international version through Aida’s Fourthwall shop.",
    intNote: "International pricing and delivery are shown on Fourthwall.",
    intCta: "Get this print",
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
      "Sipariş verdiğin bölgeyi seç, seni doğru ödeme ve teslimat adımına yönlendirelim.",
    trLabel: "TÜRKİYE",
    trTitle: "Türkiye'deyim",
    trBody: "Aida'nın İstanbul'daki atölyesinden doğrudan sipariş ver.",
    trNote: "Fiyatlar ve teslimat bilgileri TRY olarak gösterilir.",
    trCta: "Türkiye siparişine devam et",
    intLabel: "TÜRKİYE DIŞI",
    intTitle: "Türkiye dışındayım",
    intBody:
      "Uluslararası baskıyı Aida'nın Fourthwall mağazasından sipariş ver.",
    intNote: "Uluslararası fiyatlandırma ve teslimat Fourthwall'da gösterilir.",
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

export default function PrintDetail({ market: _market }: { market: Market }) {
  const [, canonicalParams] = useRoute("/shop/prints/:slug");
  const [, legacyParams] = useRoute("/shop/:market/prints/:slug");
  const params = canonicalParams || legacyParams;
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { locale } = useLocale();
  const c = detailCopy[locale];
  const [selected, setSelected] = useState<ManagedProduct | null>(null);
  const { destination, isTürkiye, openDestination } = useShippingDestination();
  const product = settings.printProducts.find(
    (item) =>
      (item.slug || item.id) === params?.slug &&
      isPubliclyVisible(item) &&
      !isAceoProduct(item),
  );
  const query = new URLSearchParams(window.location.search);
  const fromProject = query.get("from") === "100-windows";
  const projectSection =
    query.get("section") === "archive" ? "project-so-far" : "todays-window";
  const defaultBack = "/shop?category=prints";
  const backHref = fromProject ? `/100-windows#${projectSection}` : defaultBack;
  const backLabel = fromProject ? c.backProject : c.backPrints;
  const day = product ? projectDay(settings.printProducts, product.id) : null;

  usePageMeta(
    product
      ? `${product.name} | Art Print | Aida Ramezani`
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
  const sold = isSoldOut(product);
  const productImages = [product.imageUrl, ...(product.galleryImages || [])]
    .filter((src, index, all) => Boolean(src) && all.indexOf(src) === index)
    .map((src) => ({
      src,
      highResolutionSrc: src,
      alt: product.altText || product.name,
    }));

  return (
    <>
      <section
        className={`section-shell print-story-detail ${fromProject ? "print-story-detail--project" : ""}`}
      >
        <Link href={backHref} className="button-link print-story-detail__back">
          {backLabel}
        </Link>
        <div className="print-story-detail__layout">
          <div className="print-story-detail__media">
            <ProductImageLightbox images={productImages} />
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
              <DestinationControl compact />
              {sold ? (
                <p>
                  <strong>{c.unavailable}</strong>
                </p>
              ) : !destination ? (
                <button
                  type="button"
                  className="paper-button paper-button--pink paper-button--md"
                  onClick={() =>
                    openDestination((next) => {
                      if (next.countryCode === "TR") setSelected(product);
                      else if (internationalHref)
                        window.location.assign(internationalHref);
                    })
                  }
                >
                  {c.buy}
                </button>
              ) : isTürkiye ? (
                <>
                  <p>
                    {locale === "tr"
                      ? "Yerel TRY fiyatı, seçenekler ve Türkiye kargosu bir sonraki adımda gösterilir."
                      : "Local TRY price, options and Türkiye delivery are shown in the next step."}
                  </p>
                  <button
                    type="button"
                    className="paper-button paper-button--pink paper-button--md"
                    disabled={!product.available}
                    onClick={() => {
                      setSelected(product);
                      trackAnalytics("local_purchase_selected", {
                        metadata: { productId: product.id },
                      });
                    }}
                  >
                    {locale === "tr" ? "Seçenekleri gör" : "See print options"}
                  </button>
                </>
              ) : international.loading ? (
                <p>
                  {locale === "tr"
                    ? "Uluslararası mağaza yükleniyor…"
                    : "Loading international shop…"}
                </p>
              ) : internationalAvailable ? (
                <>
                  <p>
                    {locale === "tr"
                      ? "Bu baskının uluslararası siparişleri Aida'nın Fourthwall mağazası üzerinden hazırlanır."
                      : "International orders for this print are fulfilled through Aida's Fourthwall shop."}
                  </p>
                  {linked?.price?.formatted && (
                    <strong>{linked.price.formatted}</strong>
                  )}
                  <a
                    className="paper-button paper-button--pink paper-button--md"
                    href={internationalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackAnalytics("fourthwall_redirect", {
                        metadata: {
                          productId: product.id,
                          countryCode: destination.countryCode,
                        },
                      })
                    }
                  >
                    {locale === "tr" ? "Bu baskıyı edin" : "Get this print"}{" "}
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </>
              ) : (
                <>
                  <h2>{c.coming}</h2>
                  <p>{c.comingBody}</p>
                  <Link href="/newsletter" className="button-link">
                    {locale === "tr" ? "Bültene katıl" : "Join the Newsletter"}{" "}
                    →
                  </Link>
                </>
              )}
            </div>
          </article>
        </div>
      </section>
      <RelatedProducts currentProduct={product} />
      <TurkeyProductDialog
        product={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
