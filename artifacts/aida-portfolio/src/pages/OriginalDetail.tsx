import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import ManagedProductCard from "@/components/ManagedProductCard";
import OriginalRequestDialog from "@/components/OriginalRequestDialog";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import type { Market } from "@/lib/market";
import RelatedProducts from "@/components/RelatedProducts";
import {
  DestinationControl,
  useShippingDestination,
} from "@/lib/shipping-destination";
import { useLocale } from "@/lib/locale";
import Money from "@/components/Money";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import { trackAnalytics } from "@/lib/analytics";
import ProductImageLightbox from "@/components/ProductImageLightbox";

export default function OriginalDetail({
  market: _market,
}: {
  market: Market;
}) {
  const [, params] = useRoute("/shop/:market/originals/:slug");
  const canonicalMatch = useRoute("/shop/originals/:slug")[1];
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { destination, isTürkiye, openDestination } = useShippingDestination();
  const { locale } = useLocale();
  const [requesting, setRequesting] = useState(false);
  const slug = canonicalMatch?.slug || params?.slug;
  const product = settings.originalProducts.find(
    (item) => (item.slug || item.id) === slug && isPubliclyVisible(item),
  );
  usePageMeta(
    product
      ? `${product.name} | Original Painting | Aida Ramezani`
      : "Original painting unavailable | Aida Ramezani",
    product?.description || "View original paintings by Aida Ramezani.",
  );
  const linked = product?.fourthwallProductId
    ? international.products.find(
        (item) => item.id === product.fourthwallProductId,
      )
    : undefined;
  const fallback =
    product?.fourthwallProductUrl &&
    isSafeFourthwallUrl(product.fourthwallProductUrl, international.shopUrl)
      ? product.fourthwallProductUrl
      : "";
  const printHref = linked?.externalUrl || fallback;
  const sold = product ? isSoldOut(product) : false;
  const unavailableUS = destination?.countryCode === "US";
  useEffect(() => {
    if (product && unavailableUS && !sold)
      trackAnalytics("us_original_unavailable_view", {
        metadata: { productId: product.id },
      });
  }, [product?.id, unavailableUS, sold]);
  if (!product)
    return (
      <section className="section-shell">
        <p className="eyebrow">Original painting</p>
        <h1 className="mt-4 text-5xl">
          {locale === "tr"
            ? "Bu eser şu anda mevcut değil."
            : "This work is not currently available."}
        </h1>
        <Link href="/shop?category=originals" className="button-primary mt-7">
          {locale === "tr" ? "Orijinal eserlere dön" : "Browse originals"}
        </Link>
      </section>
    );
  const artworkImages = [product.imageUrl, ...(product.galleryImages || [])]
    .filter((src, index, all) => Boolean(src) && all.indexOf(src) === index)
    .map((src) => ({
      src,
      highResolutionSrc: src,
      alt: product.altText || product.name,
    }));
  return (
    <>
      <section className="section-shell original-unified-detail">
        <Link href="/shop?category=originals" className="button-link">
          ← {locale === "tr" ? "Orijinal eserlere dön" : "Back to originals"}
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_.8fr]">
          <ProductImageLightbox
            images={artworkImages}
            imageClassName="w-full bg-ink/5 object-contain"
          />
          <div>
            <p className="eyebrow">
              {locale === "tr" ? "TEK VE ORİJİNAL" : "ONE-OF-ONE ORIGINAL"}
            </p>
            <h1 className="mt-3 text-5xl">{product.name}</h1>
            <p className="mt-4 leading-relaxed text-ink/65">
              {product.description}
            </p>
            <DestinationControl compact />
            {!sold && destination && !isTürkiye && (
              <Money
                baseAmountUsdCents={product.priceUsdCents}
                canonicalCurrency="USD"
                className="mt-5 block text-2xl font-bold"
              />
            )}
            {sold ? (
              <div className="original-fulfillment-state">
                <strong>SOLD</strong>
                {printHref && (
                  <>
                    <h2>
                      {locale === "tr"
                        ? "Bu eseri sevdin mi?"
                        : "Love this piece?"}
                    </h2>
                    <a
                      href={printHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button-link"
                    >
                      {locale === "tr"
                        ? "Baskıyı edin"
                        : "Get the print instead"}{" "}
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  </>
                )}
              </div>
            ) : !destination ? (
              <button
                type="button"
                className="paper-button paper-button--pink paper-button--md mt-5"
                onClick={() =>
                  openDestination((next) =>
                    next.countryCode !== "TR" && next.countryCode !== "US"
                      ? setRequesting(true)
                      : undefined,
                  )
                }
              >
                {locale === "tr" ? "Bu eseri edin" : "Collect this piece"}
              </button>
            ) : isTürkiye ? (
              <>
                <ManagedProductCard product={product} region="TR" hideImage />
                <p className="mt-4 text-sm font-semibold text-green">
                  {locale === "tr"
                    ? "Türkiye içinde ücretsiz kargo"
                    : "Free shipping within Türkiye"}
                </p>
              </>
            ) : unavailableUS ? (
              <div className="original-fulfillment-state">
                <h2>
                  {locale === "tr"
                    ? "Orijinal eser ABD'ye gönderilemiyor"
                    : "Original unavailable for US delivery"}
                </h2>
                <p>
                  {locale === "tr"
                    ? "Bu orijinal eser şu anda Amerika Birleşik Devletleri'ne gönderilemiyor."
                    : "This original can't currently be shipped to the United States."}
                </p>
                {printHref ? (
                  <a
                    href={printHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paper-button paper-button--pink paper-button--md"
                  >
                    {locale === "tr" ? "Baskıyı edin" : "Get the print instead"}{" "}
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ) : (
                  <Link href="/newsletter" className="button-link">
                    {locale === "tr" ? "Bültene katıl" : "Join the Newsletter"}{" "}
                    →
                  </Link>
                )}
              </div>
            ) : (
              <div className="original-fulfillment-state">
                <h2>
                  {locale === "tr" ? "Teslimat talebi" : "Request delivery"}
                </h2>
                <p>
                  {locale === "tr"
                    ? "Seçili ülkelere teslimat mümkündür. Aida, herhangi bir ödeme yapılmadan önce uygunluk ve kargoyu onaylayacak."
                    : "Delivery is available to selected countries. Aida will confirm availability and shipping before any payment is made."}
                </p>
                <button
                  type="button"
                  className="paper-button paper-button--pink paper-button--md"
                  onClick={() => setRequesting(true)}
                >
                  {locale === "tr"
                    ? "Teslimat talebi gönder"
                    : "Request delivery"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
      <RelatedProducts currentProduct={product} />
      <OriginalRequestDialog
        product={requesting ? product : null}
        onClose={() => setRequesting(false)}
      />
    </>
  );
}
