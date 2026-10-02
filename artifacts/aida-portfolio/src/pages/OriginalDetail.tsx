import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import type { Market } from "@/lib/market";
import RelatedProducts from "@/components/RelatedProducts";
import { useShippingDestination } from "@/lib/shipping-destination";
import { useLocale } from "@/lib/locale";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import { trackAnalytics } from "@/lib/analytics";
import ProductImageLightbox from "@/components/ProductImageLightbox";
import EnquiryForm from "@/components/EnquiryForm";

export default function OriginalDetail({
  market: _market,
}: {
  market: Market;
}) {
  const [, params] = useRoute("/shop/:market/originals/:slug");
  const canonicalMatch = useRoute("/shop/originals/:slug")[1];
  const artworkMatch = useRoute("/artworks/:slug")[1];
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { isTürkiye } = useShippingDestination();
  const { locale } = useLocale();
  const slug = artworkMatch?.slug || canonicalMatch?.slug || params?.slug;
  const product = settings.originalProducts.find(
    (item) => (item.slug || item.id) === slug && isPubliclyVisible(item),
  );
  usePageMeta(
    product
      ? `${product.name} | Original Painting | Aeda Art`
      : "Original painting unavailable | Aeda Art",
    product?.description || "View original paintings by Aeda Art.",
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
  useEffect(() => {
    if (product)
      trackAnalytics("product_view", {
        metadata: { productId: product.id, productType: "original" },
      });
  }, [product?.id]);
  if (!product)
    return (
      <section className="section-shell">
        <p className="eyebrow">Original painting</p>
        <h1 className="mt-4 text-5xl">
          {locale === "tr"
            ? "Bu eser şu anda mevcut değil."
            : "This work is not currently available."}
        </h1>
        <Link
          href={
            isTürkiye ? "/shop?category=originals" : "/shop?category=prints"
          }
          className="button-primary mt-7"
        >
          {isTürkiye
            ? locale === "tr"
              ? "Orijinal eserlere dön"
              : "Browse originals"
            : locale === "tr"
              ? "Baskıları gör"
              : "View prints"}
        </Link>
      </section>
    );
  const regionalGallery = isTürkiye
    ? (product.galleryImagesTurkiye ?? product.galleryImages ?? [])
    : (product.galleryImagesInternational ?? product.galleryImages ?? []);
  const artworkImages = [product.imageUrl, ...regionalGallery]
    .filter((src, index, all) => Boolean(src) && all.indexOf(src) === index)
    .map((src) => ({
      src,
      highResolutionSrc: src,
      alt: product.altText || product.name,
    }));
  return (
    <>
      <section className="section-shell original-unified-detail">
        <Link
          href={
            isTürkiye ? "/shop?category=originals" : "/shop?category=prints"
          }
          className="button-link"
        >
          ←{" "}
          {isTürkiye
            ? locale === "tr"
              ? "Orijinal eserlere dön"
              : "Back to originals"
            : locale === "tr"
              ? "Baskılara dön"
              : "Back to prints"}
        </Link>
        <div className="product-detail-layout">
          <div className="product-detail-media">
            <ProductImageLightbox
              images={artworkImages}
              imageClassName="w-full object-contain"
            />
          </div>
          <div className="product-detail-info">
            <p className="eyebrow">
              {sold ? "ORIGINAL · SOLD" : "ORIGINAL · AVAILABLE"}
            </p>
            <h1 className="mt-3 text-5xl">{product.name}</h1>
            <dl className="artwork-metadata">
              {product.year && (
                <>
                  <dt>Year</dt>
                  <dd>{product.year}</dd>
                </>
              )}
              <dt>Medium</dt>
              <dd>
                {product.artworkSurface === "canvas"
                  ? "Oil pastel on canvas"
                  : "Oil pastel on paper"}
              </dd>
              {product.dimension && (
                <>
                  <dt>Dimensions</dt>
                  <dd>{product.dimension}</dd>
                </>
              )}
            </dl>
            <div className="artwork-story">
              <p>
                {product.story ||
                  product.fullDescription ||
                  product.description}
              </p>
              {product.inspiredBySong && (
                <small>
                  Inspired while listening to: {product.inspiredBySong}
                </small>
              )}
            </div>
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
            ) : (
              <details className="artwork-enquiry">
                <summary>
                  Enquire about this artwork <ArrowUpRight />
                </summary>
                <p>
                  Aida will reply personally with availability, shipping and
                  collection details. Original prices are shared privately.
                </p>
                <EnquiryForm
                  kind="artwork"
                  subjectId={product.id}
                  subjectName={product.name}
                />
              </details>
            )}
          </div>
        </div>
      </section>
      <RelatedProducts currentProduct={product} />
    </>
  );
}
