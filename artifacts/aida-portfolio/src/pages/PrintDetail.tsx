import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Check, Minus, PackageCheck, Plus } from "lucide-react";
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
import {
  calculatePrintPrice,
  calculateTurkiyeOrderShipping,
  formatPrintSize,
  getFinishPriceDifference,
  getPrintConfigurationKey,
  isAceoProduct,
  TURKIYE_FLAT_SHIPPING_MINOR,
  type PrintFraming,
} from "@/lib/turkiye-products";
import InternationalFormatSelector from "@/components/InternationalFormatSelector";
import Money from "@/components/Money";
import { addItemToCart } from "@/lib/store";
import { calculateProductSale } from "@/lib/product-sale";
import { useToast } from "@/hooks/use-toast";

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
    trBody: "Order directly from Aida.",
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
    trBody: "Doğrudan Aida'dan sipariş ver.",
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
  const [sizeId, setSizeId] = useState("");
  const [framing, setFraming] = useState<PrintFraming>("unframed");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const { toast } = useToast();
  const { destination, isTürkiye, openDestination } = useShippingDestination();
  const product = settings.printProducts.find(
    (item) =>
      (item.slug || item.id) === params?.slug &&
      isPubliclyVisible(item) &&
      !isAceoProduct(item),
  );
  const availableSizes = useMemo(
    () =>
      [...(product?.printOptions?.sizes || [])]
        .filter((size) => size.available)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [product],
  );
  useEffect(() => {
    if (!product) return;
    setSizeId(
      availableSizes.find((size) => size.isBaseSize)?.id ||
        availableSizes[0]?.id ||
        "",
    );
    setFraming(product.printOptions?.framing.unframedAvailable ? "unframed" : "framed");
    setQuantity(1);
    setAdded(false);
    setPurchaseError("");
  }, [product?.id, availableSizes]);
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
      ? `${product.name} | Art Print | Aeda Art`
      : "Print unavailable | Aeda Art",
    product?.fullDescription ||
      product?.description ||
      "View prints and studio goods by Aeda Art.",
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
  const size =
    availableSizes.find((option) => option.id === sizeId) ||
    availableSizes.find((option) => option.isBaseSize) ||
    availableSizes[0];
  const formattedSize = size ? formatPrintSize(size) : null;
  const baseSale = calculateProductSale(product.priceUsdCents, product.sale);
  const frameAdditional = product.printOptions?.framing.frameAdditionalPriceUsdCents || 0;
  const sizeAdditional = size?.additionalPriceUsdCents || 0;
  const originalPrintUnit = product.priceUsdCents + sizeAdditional;
  const discountedPrintUnit = baseSale.finalPriceMinor + sizeAdditional;
  const pricing = size && product.printOptions
    ? calculatePrintPrice({
        basePriceCents: baseSale.finalPriceMinor,
        sizePriceDifferenceCents: sizeAdditional,
        finishPriceDifferenceCents: getFinishPriceDifference(product.printOptions, framing),
        quantity,
      })
    : { unitPriceCents: 0, lineTotalCents: 0 };
  const shipping = calculateTurkiyeOrderShipping(pricing.lineTotalCents);
  const shippingSavings = pricing.lineTotalCents > 0 && shipping === 0
    ? TURKIYE_FLAT_SHIPPING_MINOR
    : 0;
  const productSavings = baseSale.discountAmountMinor * quantity;
  const totalSavings = productSavings + shippingSavings;
  const orderTotal = pricing.lineTotalCents + shipping;
  const maximum = Math.max(1, Math.min(product.maxPerUser || 1, product.inventory ?? product.maxPerUser));
  const canAdd = !sold && product.available && Boolean(size) && quantity <= maximum;
  const addConfiguredPrint = () => {
    if (!canAdd || !size || !product.printOptions) {
      setPurchaseError(locale === "tr" ? "Bu baskı bu seçeneklerle sipariş edilemiyor." : "This print cannot be ordered with these options.");
      return;
    }
    const result = addItemToCart({
      id: `product-${product.id}`,
      productId: product.id,
      kind: "print",
      title: product.name,
      subtitle: `${formattedSize?.primary} · ${framing === "framed" ? "Framed" : "Unframed"}`,
      imageUrl: product.imageUrl,
      priceUsdCents: product.priceUsdCents,
      market: "turkiye",
      canonicalCurrency: "TRY",
      canonicalPriceMinor: product.priceUsdCents,
      displayCurrency: "TRY",
      quantity,
      maxQuantity: maximum,
      configurationKey: getPrintConfigurationKey(size.id, framing),
      selectedSizeId: size.id,
      selectedFinishId: framing,
      calculatedUnitPriceUsdCents: pricing.unitPriceCents,
      calculatedLineTotalUsdCents: pricing.lineTotalCents,
      printConfiguration: {
        sizeId: size.id,
        sizeLabel: formattedSize!.primary,
        sizeSecondaryLabel: formattedSize!.secondary,
        framing,
        basePriceUsdCents: product.priceUsdCents,
        sizeDifferenceUsdCents: sizeAdditional,
        frameDifferenceUsdCents: framing === "framed" ? frameAdditional : 0,
        finalUnitPriceUsdCents: pricing.unitPriceCents,
        lineTotalUsdCents: pricing.lineTotalCents,
      },
    }, maximum, "TR");
    if (!result.ok) {
      setPurchaseError(result.reason || (locale === "tr" ? "Baskı sepete eklenemedi." : "The print could not be added."));
      return;
    }
    setPurchaseError("");
    setAdded(true);
    trackAnalytics("local_purchase_selected", { metadata: { productId: product.id, framing, sizeId: size.id, quantity } });
    toast({
      title: locale === "tr" ? "Sepete eklendi" : "Added to basket",
      description: product.name,
      duration: 2500,
      className: "border-green/30 bg-[#edf6ed] text-ink",
    });
    window.setTimeout(() => setAdded(false), 1800);
  };
  const regionalGallery = isTürkiye
    ? (product.galleryImagesTurkiye ?? product.galleryImages ?? [])
    : (product.galleryImagesInternational ?? product.galleryImages ?? []);
  const productImages = [product.imageUrl, ...regionalGallery]
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
            <ProductImageLightbox
              images={productImages}
              framedPreview={framing === "framed" && isTürkiye}
            />
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
                  className="button-primary product-detail__cta"
                  onClick={() =>
                    openDestination((next) => {
                      if (next.countryCode !== "TR" && internationalHref)
                        window.location.assign(internationalHref);
                    })
                  }
                >
                  {c.buy}
                </button>
              ) : isTürkiye ? (
                <div className="print-detail-purchase">
                  {availableSizes.length > 1 ? (
                    <fieldset>
                      <legend className="eyebrow">{locale === "tr" ? "BOYUT" : "SIZE"}</legend>
                      <div className="mt-3 grid gap-2">
                        {availableSizes.map((option) => {
                          const label = formatPrintSize(option);
                          const selectedSize = option.id === size?.id;
                          const optionSale = calculateProductSale(product.priceUsdCents, product.sale);
                          const optionPrice = optionSale.finalPriceMinor + option.additionalPriceUsdCents;
                          return (
                            <label key={option.id} className={`flex min-h-14 cursor-pointer items-center gap-3 border p-3 transition-colors focus-within:ring-2 focus-within:ring-coral ${selectedSize ? "border-green bg-green/5" : "border-ink/15"}`}>
                              <input type="radio" name="detail-print-size" checked={selectedSize} onChange={() => setSizeId(option.id)} />
                              <span className="min-w-0 flex-1">
                                <strong className="block">{label.primary}</strong>
                                {label.secondary && <span className="mt-1 block text-xs text-ink/50">{label.secondary}</span>}
                              </span>
                              <Money baseAmountUsdCents={optionPrice} canonicalCurrency="TRY" className="text-sm font-semibold" />
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : formattedSize ? (
                    <div>
                      <p className="eyebrow">{locale === "tr" ? "BOYUT" : "SIZE"}</p>
                      <p className="mt-2 font-semibold">{formattedSize.primary}</p>
                      {formattedSize.secondary && <p className="mt-1 text-sm text-ink/50">{formattedSize.secondary}</p>}
                    </div>
                  ) : (
                    <p role="alert" className="mt-3 text-sm font-semibold text-coral">{locale === "tr" ? "Şu anda kullanılabilir baskı boyutu yok." : "No print size is currently available."}</p>
                  )}

                  {size && <section className="mt-6 border-t border-ink/10 pt-6">
                    <p className="eyebrow">{locale === "tr" ? "FİYAT" : "PRICE"}</p>
                    {baseSale.status === "active" ? <div className="mt-2">
                      <Money baseAmountUsdCents={originalPrintUnit} canonicalCurrency="TRY" className="block text-sm text-ink/45 line-through" />
                      <Money baseAmountUsdCents={discountedPrintUnit} canonicalCurrency="TRY" className="mt-1 block font-sans text-3xl font-bold text-green" />
                      <p className="mt-1 text-sm font-semibold text-coral">{baseSale.percentage}% {locale === "tr" ? "indirim" : "off"} · {locale === "tr" ? "Tasarruf" : "Save"} <Money baseAmountUsdCents={baseSale.discountAmountMinor} canonicalCurrency="TRY" /></p>
                    </div> : <Money baseAmountUsdCents={discountedPrintUnit} canonicalCurrency="TRY" className="mt-2 block font-sans text-3xl font-bold" />}
                  </section>}

                  {size && product.printOptions?.framing.unframedAvailable && product.printOptions.framing.framedAvailable && (
                    <fieldset className="mt-6 border-t border-ink/10 pt-6">
                      <legend className="eyebrow">{locale === "tr" ? "ÇERÇEVE" : "FRAMING"}</legend>
                      <label className={`mt-3 flex min-h-16 cursor-pointer items-center gap-3 border p-4 transition-colors focus-within:ring-2 focus-within:ring-coral ${framing === "framed" ? "border-green bg-green/5" : "border-ink/15"}`}>
                        <input type="checkbox" className="sr-only" checked={framing === "framed"} onChange={(event) => setFraming(event.target.checked ? "framed" : "unframed")} aria-describedby="detail-frame-description" />
                        <span className={`grid h-6 w-6 shrink-0 place-items-center border ${framing === "framed" ? "border-green bg-green text-paper" : "border-ink/30"}`} aria-hidden="true">{framing === "framed" && <Check size={15} />}</span>
                        <span className="min-w-0 flex-1">
                          <strong className="block">{locale === "tr" ? "Siyah çerçeve ekle" : "Add a black frame"}</strong>
                          <span id="detail-frame-description" className="mt-1 block text-xs text-ink/50">{locale === "tr" ? "Teslimattan önce siyah çerçeveyle hazırlanır." : "Prepared in a black frame before delivery."}</span>
                        </span>
                        <strong className="shrink-0 text-sm">+<Money baseAmountUsdCents={frameAdditional} canonicalCurrency="TRY" /></strong>
                      </label>
                    </fieldset>
                  )}

                  <section className="mt-6 border-t border-ink/10 pt-6">
                    <p className="eyebrow">{locale === "tr" ? "ADET" : "QUANTITY"}</p>
                    <div className="mt-3 inline-flex items-center border border-ink/15">
                      <button type="button" className="grid h-11 w-11 place-items-center disabled:opacity-30" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label={locale === "tr" ? "Adedi azalt" : "Decrease quantity"}><Minus size={16} /></button>
                      <span className="grid h-11 min-w-12 place-items-center border-x border-ink/15 font-semibold" aria-live="polite">{quantity}</span>
                      <button type="button" className="grid h-11 w-11 place-items-center disabled:opacity-30" disabled={quantity >= maximum} onClick={() => setQuantity((value) => Math.min(maximum, value + 1))} aria-label={locale === "tr" ? "Adedi artır" : "Increase quantity"}><Plus size={16} /></button>
                    </div>
                  </section>

                  <section className="mt-6 border-t border-ink/10 pt-6" aria-live="polite">
                    <p className="eyebrow">{locale === "tr" ? "SİPARİŞ ÖZETİ" : "ORDER SUMMARY"}</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <p className="flex justify-between gap-4"><span>{locale === "tr" ? "Baskı" : "Print"}</span><Money baseAmountUsdCents={discountedPrintUnit * quantity} canonicalCurrency="TRY" /></p>
                      {framing === "framed" && <p className="flex justify-between gap-4"><span>{locale === "tr" ? "Siyah çerçeve" : "Black frame"}</span><span>+<Money baseAmountUsdCents={frameAdditional * quantity} canonicalCurrency="TRY" /></span></p>}
                      <p className="flex justify-between gap-4"><span>{locale === "tr" ? "Kargo" : "Shipping"}</span>{shippingSavings ? <span className="flex items-baseline gap-2"><Money baseAmountUsdCents={TURKIYE_FLAT_SHIPPING_MINOR} canonicalCurrency="TRY" className="text-ink/45 line-through" /><strong className="text-green">{locale === "tr" ? "ÜCRETSİZ" : "FREE"}</strong></span> : <Money baseAmountUsdCents={shipping} canonicalCurrency="TRY" />}</p>
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t border-ink/15 pt-4"><strong>{locale === "tr" ? "TOPLAM" : "TOTAL"}</strong><Money baseAmountUsdCents={orderTotal} canonicalCurrency="TRY" className="font-sans text-2xl font-bold" /></div>
                    {totalSavings > 0 && <div className="mt-4 border-l-2 border-green pl-3 text-green"><strong>{locale === "tr" ? "Tasarrufunuz" : "You save"} <Money baseAmountUsdCents={totalSavings} canonicalCurrency="TRY" /></strong><p className="mt-1 text-xs text-ink/55">{[productSavings ? `${locale === "tr" ? "Ürün indirimi" : "Product discount"} ${(productSavings / 100).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")} TL` : "", shippingSavings ? `${locale === "tr" ? "Kargo" : "Delivery"} 50 TL` : ""].filter(Boolean).join(" · ")}</p></div>}
                  </section>

                  <button type="button" className={`button-primary mt-6 w-full ${added ? "!bg-green !text-paper" : ""}`} disabled={!canAdd || added} onClick={addConfiguredPrint}>{added ? <><Check size={17} />{locale === "tr" ? "Sepete eklendi" : "Added to basket"}</> : locale === "tr" ? "Sepete ekle" : "Add to basket"}</button>
                  {purchaseError && <p role="alert" className="mt-3 text-sm font-semibold text-coral">{purchaseError}</p>}
                  <p className="mt-4 flex items-center gap-2 text-sm text-ink/60"><PackageCheck size={17} />{locale === "tr" ? "Türkiye teslimatı otomatik hesaplanır." : "Türkiye delivery is calculated automatically."}</p>
                </div>
              ) : international.loading ? (
                <p>
                  {locale === "tr"
                    ? "Uluslararası mağaza yükleniyor…"
                    : "Loading international shop…"}
                </p>
              ) : internationalAvailable ||
                product.fourthwallVariantGroupEnabled ? (
                <InternationalFormatSelector
                  product={product}
                  catalogue={international.products}
                  shopUrl={international.shopUrl}
                  countryCode={destination.countryCode}
                  locale={locale}
                />
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
            {fullDescription && fullDescription !== shortDescription && (
              <div className="print-story-detail__full">
                <h2>{c.short}</h2>
                <p>{fullDescription}</p>
              </div>
            )}
          </article>
        </div>
      </section>
      <RelatedProducts currentProduct={product} />
    </>
  );
}
