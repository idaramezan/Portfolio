import { useEffect, useState } from "react";
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
import EnquiryDialog from "@/components/EnquiryDialog";
import { addItemToCart, loadCart } from "@/lib/store";
import {
  convertUsdCentsToTry,
  formatCurrencyMinor,
  useCurrency,
} from "@/lib/currency";
import { calculateProductSale } from "@/lib/product-sale";

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
  const { rate, rateDate, loading: currencyLoading } = useCurrency();
  const [basketVersion, setBasketVersion] = useState(0);
  const [purchaseMessage, setPurchaseMessage] = useState("");
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
  useEffect(() => {
    const sync = () => setBasketVersion((value) => value + 1);
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, []);
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
  const convertedPrice =
    isTürkiye && rate
      ? convertUsdCentsToTry(product.priceUsdCents, rate)
      : null;
  const salePricing =
    convertedPrice == null
      ? null
      : calculateProductSale(convertedPrice, product.sale);
  const basketLineId = `original-${product.id}`;
  const inBasket = isTürkiye
    ? loadCart("TR").some((item) => item.id === basketLineId)
    : false;
  void basketVersion;
  const addOriginal = () => {
    if (!rate || convertedPrice == null) {
      setPurchaseMessage(
        locale === "tr"
          ? "Türkiye fiyatı şu anda kullanılamıyor. Lütfen kısa süre sonra tekrar deneyin."
          : "Türkiye pricing is temporarily unavailable. Please try again shortly.",
      );
      return;
    }
    const result = addItemToCart(
      {
        id: basketLineId,
        productId: product.id,
        kind: "original",
        title: product.name,
        subtitle: [
          product.artworkSurface === "canvas"
            ? "Oil pastel on canvas"
            : "Oil pastel on paper",
          product.dimension,
        ]
          .filter(Boolean)
          .join(" · "),
        imageUrl: product.imageUrl,
        priceUsdCents: convertedPrice,
        market: "turkiye",
        canonicalCurrency: "USD",
        canonicalPriceMinor: product.priceUsdCents,
        displayCurrency: "TRY",
        convertedUnitPriceMinor: convertedPrice,
        appliedExchangeRate: Number(rate),
        exchangeRateDate: rateDate || undefined,
        quantity: 1,
        maxQuantity: 1,
        artworkId: product.id,
        artworkTitle: product.name,
      },
      1,
      "TR",
    );
    setPurchaseMessage(
      result.ok
        ? locale === "tr"
          ? `${product.name} koleksiyon sepetinize eklendi.`
          : `${product.name} was added to your collection basket.`
        : result.reason ||
            (locale === "tr"
              ? "Bu eser sepete eklenemedi."
              : "This artwork could not be added."),
    );
  };
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
            ) : isTürkiye ? (
              <div className="original-purchase">
                <div className="original-purchase__price">
                  <small>{locale === "tr" ? "FİYAT" : "PRICE"}</small>
                  {salePricing && salePricing.percentage > 0 ? (
                    <>
                      <strong>
                        {formatCurrencyMinor(
                          salePricing.finalPriceMinor,
                          "TRY",
                          locale,
                        )}
                      </strong>
                      <p>
                        <s>
                          {formatCurrencyMinor(
                            salePricing.regularPriceMinor,
                            "TRY",
                            locale,
                          )}
                        </s>{" "}
                        · {salePricing.percentage}% {locale === "tr" ? "indirim" : "off"}
                      </p>
                    </>
                  ) : (
                    <strong>
                      {convertedPrice == null
                        ? locale === "tr"
                          ? "Fiyat yükleniyor…"
                          : "Loading price…"
                        : formatCurrencyMinor(convertedPrice, "TRY", locale)}
                    </strong>
                  )}
                </div>
                <p className="original-purchase__availability">
                  {locale === "tr" ? "Mevcut · Tek ve orijinal eser" : "Available · One-of-one original"}
                </p>
                <button
                  type="button"
                  className="button-primary original-purchase__button"
                  disabled={currencyLoading || !rate || inBasket}
                  onClick={addOriginal}
                >
                  {inBasket
                    ? locale === "tr"
                      ? "SEPETİNİZDE"
                      : "IN YOUR BASKET"
                    : locale === "tr"
                      ? "SEPETE EKLE"
                      : "ADD TO BASKET"}
                </button>
                {inBasket && (
                  <button
                    type="button"
                    className="button-link"
                    onClick={() =>
                      window.dispatchEvent(new Event("basket:open"))
                    }
                  >
                    {locale === "tr" ? "Sepeti görüntüle" : "View basket"}
                  </button>
                )}
                <p className="original-purchase__shipping">
                  {locale === "tr"
                    ? "Türkiye içi standart kargo 50 TL'dir; 1.500 TL üzeri siparişlerde ücretsizdir. Sepete eklemek eseri rezerve etmez veya stok durumunu değiştirmez."
                    : "Standard Türkiye shipping is 50 TL and free for orders over 1,500 TL. Adding this work to your basket does not reserve it or change inventory."}
                </p>
                <p aria-live="polite" className="original-purchase__message">
                  {purchaseMessage}
                </p>
              </div>
            ) : (
              <div className="artwork-enquiry">
                <p>
                  Aida will reply personally with availability, shipping and
                  collection details. Original prices are shared privately.
                </p>
                <EnquiryDialog
                  kind="artwork"
                  subjectId={product.id}
                  subjectName={product.name}
                  trigger={
                    <button
                      type="button"
                      className="button-primary artwork-enquiry__button"
                    >
                      Enquire about this artwork <ArrowUpRight />
                    </button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </section>
      <RelatedProducts currentProduct={product} />
    </>
  );
}
