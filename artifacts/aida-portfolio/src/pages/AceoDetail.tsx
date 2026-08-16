import { useState } from "react";
import { Link, useRoute } from "wouter";
import ProductImageLightbox from "@/components/ProductImageLightbox";
import RelatedProducts from "@/components/RelatedProducts";
import Money from "@/components/Money";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useLocale } from "@/lib/locale";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import {
  DestinationControl,
  useShippingDestination,
} from "@/lib/shipping-destination";
import { addItemToCart } from "@/lib/store";
import { ACEO_DIMENSION, isAceoProduct } from "@/lib/turkiye-products";

const copy = {
  en: {
    back: "Back to ACEOs",
    eyebrow: "ACEO ORIGINAL",
    painted: "PAINTED LIVE",
    unique: "ONE OF ONE",
    size: "Size",
    medium: "Medium",
    mediumValue: "Original artwork on paper",
    shipping: "Free delivery within Türkiye",
    available: "1 original available",
    add: "Add to basket",
    added: "Added to basket",
    collected: "Collected",
    collectedBody: "This one-of-one ACEO has found its home.",
    only: "Currently available in Türkiye only",
    onlyBody:
      "This one-of-one ACEO can currently be delivered only to an address in Türkiye.",
    change: "Change shipping country",
    more: "Explore more ACEOs",
  },
  tr: {
    back: "ACEO'lara dön",
    eyebrow: "ACEO ORİJİNAL",
    painted: "CANLI YAYINDA BOYANDI",
    unique: "TEK VE ÖZGÜN",
    size: "Boyut",
    medium: "Teknik",
    mediumValue: "Kağıt üzerine orijinal eser",
    shipping: "Türkiye'de ücretsiz teslimat",
    available: "1 orijinal mevcut",
    add: "Sepete ekle",
    added: "Sepete eklendi",
    collected: "Koleksiyona katıldı",
    collectedBody: "Bu tek ve özgün ACEO yeni evini buldu.",
    only: "Şu anda yalnızca Türkiye'de satışta",
    onlyBody:
      "Bu tek ve özgün ACEO şu anda yalnızca Türkiye'deki bir adrese gönderilebilir.",
    change: "Gönderim ülkesini değiştir",
    more: "Diğer ACEO'ları keşfet",
  },
} as const;

export default function AceoDetail() {
  const [, params] = useRoute("/shop/aceos/:slug");
  const settings = useShopSettings();
  const { locale } = useLocale();
  const c = copy[locale];
  const { destination, isTürkiye, openDestination } = useShippingDestination();
  const [feedback, setFeedback] = useState("");
  const product = settings.printProducts.find(
    (item) =>
      (item.slug || item.id) === params?.slug &&
      isAceoProduct(item) &&
      isPubliclyVisible(item),
  );
  usePageMeta(
    product
      ? `${product.name} | ACEO Original | Aida Ramezani`
      : "ACEO unavailable | Aida Ramezani",
    product?.description ||
      "Tiny one-of-one original artworks painted live by Aida.",
  );

  if (!product)
    return (
      <section className="section-shell">
        <p className="eyebrow">ACEO</p>
        <h1 className="mt-4 text-5xl">
          {locale === "tr"
            ? "Bu minik eser şu anda mevcut değil."
            : "This tiny original is not currently available."}
        </h1>
        <Link href="/shop?category=aceos" className="button-primary mt-7">
          {c.back}
        </Link>
      </section>
    );

  const sold = isSoldOut(product);
  const images = [product.imageUrl, ...(product.galleryImages || [])]
    .filter((src, index, all) => Boolean(src) && all.indexOf(src) === index)
    .map((src) => ({
      src,
      highResolutionSrc: src,
      alt: product.altText || `${product.name}, ACEO original by Aida Ramezani`,
    }));
  const add = () => {
    const result = addItemToCart(
      {
        id: `aceo-${product.id}`,
        productId: product.id,
        kind: "aceo",
        title: product.name,
        subtitle: ACEO_DIMENSION,
        imageUrl: product.imageUrl,
        priceUsdCents: product.priceMinor ?? product.priceUsdCents,
        canonicalCurrency: "TRY",
        canonicalPriceMinor: product.priceMinor ?? product.priceUsdCents,
        displayCurrency: "TRY",
        quantity: 1,
        maxQuantity: 1,
        shippingRestriction: "TR",
      },
      1,
      "TR",
    );
    setFeedback(result.ok ? c.added : result.reason || "");
  };

  return (
    <>
      <section className="section-shell aceo-detail">
        <Link href="/shop?category=aceos" className="button-link">
          ← {c.back}
        </Link>
        <div className="aceo-detail__layout">
          <div className="aceo-detail__artwork">
            <ProductImageLightbox
              images={images}
              imageClassName="object-contain"
            />
          </div>
          <article className="aceo-detail__story">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>{product.name}</h1>
            <div
              className="aceo-detail__badges"
              aria-label={`${c.painted}, ${c.unique}`}
            >
              <span>{c.painted}</span>
              <span>{c.unique}</span>
            </div>
            {product.description && (
              <p className="aceo-detail__description">{product.description}</p>
            )}
            <dl className="aceo-detail__metadata">
              <div>
                <dt>{c.size}</dt>
                <dd>
                  {locale === "tr" ? "6,4 × 8,9 cm" : "6.4 × 8.9 cm"}
                  <br />
                  2.5 × 3.5 in
                </dd>
              </div>
              <div>
                <dt>{c.medium}</dt>
                <dd>{c.mediumValue}</dd>
              </div>
            </dl>
            <DestinationControl compact />
            {sold ? (
              <div className="aceo-detail__state aceo-detail__state--collected">
                <h2>{c.collected}</h2>
                <p>{c.collectedBody}</p>
              </div>
            ) : destination && !isTürkiye ? (
              <div className="aceo-detail__state">
                <h2>{c.only}</h2>
                <p>{c.onlyBody}</p>
                <button
                  type="button"
                  className="button-link"
                  onClick={() => openDestination()}
                >
                  {c.change}
                </button>
                <Link href="/shop?category=aceos" className="button-link">
                  {c.more} →
                </Link>
              </div>
            ) : !destination ? (
              <button
                type="button"
                className="paper-button paper-button--pink paper-button--md"
                onClick={() =>
                  openDestination((next) => next.countryCode === "TR" && add())
                }
              >
                {c.change}
              </button>
            ) : (
              <div className="aceo-detail__purchase">
                <Money
                  baseAmountUsdCents={
                    product.priceMinor ?? product.priceUsdCents
                  }
                  canonicalCurrency="TRY"
                  className="aceo-detail__price"
                />
                <p>{c.shipping}</p>
                <p>{c.available}</p>
                <button
                  type="button"
                  className="paper-button paper-button--pink paper-button--md"
                  onClick={add}
                >
                  {feedback === c.added ? c.added : c.add}
                </button>
                <p aria-live="polite" className="aceo-detail__feedback">
                  {feedback && feedback !== c.added ? feedback : ""}
                </p>
              </div>
            )}
          </article>
        </div>
      </section>
      <RelatedProducts currentProduct={product} />
    </>
  );
}
