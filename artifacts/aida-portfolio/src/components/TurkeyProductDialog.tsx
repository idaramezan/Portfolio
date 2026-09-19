import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, PackageCheck, Plus, X } from "lucide-react";
import Money from "@/components/Money";
import { useToast } from "@/hooks/use-toast";
import { addItemToCart, type ManagedProduct } from "@/lib/store";
import {
  calculateTurkiyeOrderShipping,
  calculatePrintPrice,
  formatPrintSize,
  getFinishPriceDifference,
  getPrintConfigurationKey,
  TURKIYE_FLAT_SHIPPING_MINOR,
  type PrintFraming,
  type TshirtColor,
} from "@/lib/turkiye-products";
import { isSoldOut } from "@/lib/product-status";
import { useLocale } from "@/lib/locale";
import { calculateProductSale } from "@/lib/product-sale";

export default function TurkeyProductDialog({
  product,
  onClose,
}: {
  product: ManagedProduct | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const availableSizes = useMemo(
    () =>
      [...(product?.printOptions?.sizes || [])]
        .filter((size) => size.available)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [product],
  );
  const [sizeId, setSizeId] = useState("");
  const [framing, setFraming] = useState<PrintFraming>("unframed");
  const [color, setColor] = useState<TshirtColor>("black");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const { toast } = useToast();
  const { locale } = useLocale();

  useEffect(() => {
    if (!product) return;
    previousFocus.current = document.activeElement as HTMLElement;
    setSizeId(
      availableSizes.find((size) => size.isBaseSize)?.id ||
        availableSizes[0]?.id ||
        "",
    );
    setFraming(
      product.printOptions?.framing.unframedAvailable
        ? "unframed"
        : "framed",
    );
    setColor(product.tshirtOptions?.availableColors[0] || "black");
    setQuantity(1);
    setMessage("");
    setAdded(false);
    setImageReady(false);
    setImageFailed(false);
    document.body.style.overflow = "hidden";
    const appRoot = document.getElementById("root");
    if (appRoot) appRoot.inert = true;
    requestAnimationFrame(() => closeRef.current?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = "";
      if (appRoot) appRoot.inert = false;
      document.removeEventListener("keydown", keydown);
      previousFocus.current?.focus();
    };
  }, [product, availableSizes]);

  if (!product) return null;
  const category = product.category || "print";
  const size = availableSizes.find((option) => option.id === sizeId);
  const framingOptions: PrintFraming[] = product.printOptions
    ? [
        ...(product.printOptions.framing.unframedAvailable
          ? (["unframed"] as const)
          : []),
        ...(product.printOptions.framing.framedAvailable
          ? (["framed"] as const)
          : []),
      ]
    : [];
  const frameAdditional =
    product.printOptions?.framing.frameAdditionalPriceUsdCents || 0;
  const baseSale = calculateProductSale(product.priceUsdCents, product.sale);
  const sizeAdditional = size?.additionalPriceUsdCents || 0;
  const originalPrintUnit = product.priceUsdCents + sizeAdditional;
  const discountedPrintUnit = baseSale.finalPriceMinor + sizeAdditional;
  const productSavings = baseSale.discountAmountMinor * quantity;
  const pricing =
    category === "print" && size && product.printOptions
      ? calculatePrintPrice({
          basePriceCents: baseSale.finalPriceMinor,
          sizePriceDifferenceCents: size.additionalPriceUsdCents,
          finishPriceDifferenceCents: getFinishPriceDifference(
            product.printOptions,
            framing,
          ),
          quantity,
        })
      : {
          unitPriceCents: baseSale.finalPriceMinor,
          lineTotalCents: baseSale.finalPriceMinor * quantity,
        };
  const unitPrice = pricing.unitPriceCents;
  const maximum = Math.max(
    1,
    Math.min(product.maxPerUser || 1, product.inventory ?? product.maxPerUser),
  );
  const inventoryAvailable =
    product.inventory === undefined || product.inventory > 0;
  const soldOut = isSoldOut(product);
  const valid =
    !soldOut &&
    product.available &&
    inventoryAvailable &&
    quantity >= 1 &&
    quantity <= maximum &&
    (category !== "print" ||
      (Boolean(size) && framingOptions.includes(framing)));
  const selectedColor =
    category === "tshirt" ? color : category === "mug" ? "white" : undefined;
  const formattedSize = size ? formatPrintSize(size) : null;
  const shipping = calculateTurkiyeOrderShipping(pricing.lineTotalCents);
  const orderTotal = pricing.lineTotalCents + shipping;
  const shippingSavings =
    pricing.lineTotalCents > 0 && shipping === 0
      ? TURKIYE_FLAT_SHIPPING_MINOR
      : 0;
  const totalSavings = productSavings + shippingSavings;
  const supportsFramedPreview =
    category === "print" &&
    Boolean(product.printOptions?.framing.framedAvailable);
  const showFramedPreview = supportsFramedPreview && framing === "framed";

  const add = () => {
    if (!valid) {
      setMessage(
        !availableSizes.length
          ? "This print has no available sizes."
          : "Choose an available configuration before adding it.",
      );
      return;
    }
    const configurationKey =
      category === "print"
        ? getPrintConfigurationKey(size!.id, framing)
        : selectedColor || "standard";
    const result = addItemToCart(
      {
        id: `product-${product.id}`,
        productId: product.id,
        kind: category === "print" ? "print" : "product",
        title: product.name,
        subtitle:
          category === "print"
            ? `${formattedSize?.primary} · ${framing === "framed" ? "Framed" : "Unframed"}`
            : category === "tshirt"
              ? `T-shirt · ${color[0].toUpperCase() + color.slice(1)}`
              : category === "mug"
                ? "Mug · White"
                : product.stickerOptions?.formatDescription || "Sticker",
        imageUrl: product.imageUrl,
        priceUsdCents: product.priceUsdCents,
        market: "turkiye",
        canonicalCurrency: "TRY",
        canonicalPriceMinor: product.priceUsdCents,
        displayCurrency: "TRY",
        quantity,
        maxQuantity: maximum,
        configurationKey,
        selectedSizeId: category === "print" ? size?.id : undefined,
        selectedFinishId: category === "print" ? framing : undefined,
        calculatedUnitPriceUsdCents: unitPrice,
        calculatedLineTotalUsdCents: pricing.lineTotalCents,
        selectedColor,
        printConfiguration:
          category === "print" && size && product.printOptions
            ? {
                sizeId: size.id,
                sizeLabel: formattedSize!.primary,
                sizeSecondaryLabel: formattedSize!.secondary,
                framing,
                basePriceUsdCents: product.priceUsdCents,
                sizeDifferenceUsdCents: size.additionalPriceUsdCents,
                frameDifferenceUsdCents:
                  framing === "framed" ? frameAdditional : 0,
                finalUnitPriceUsdCents: unitPrice,
                lineTotalUsdCents: pricing.lineTotalCents,
              }
            : undefined,
      },
      maximum,
      "TR",
    );
    if (result.ok) {
      setMessage("");
      setAdded(true);
      toast({
        title: locale === "tr" ? "Sepetine eklendi" : "Added to your basket",
        description:
          locale === "tr"
            ? "Kargo ücreti sepetinde otomatik olarak güncellenir."
            : "Shipping is updated automatically in your basket.",
        duration: 3000,
        className: "border-green/30 bg-[#edf6ed] text-ink",
      });
      window.setTimeout(onClose, 1400);
    } else setMessage(result.reason || "This product could not be added.");
  };

  const categoryLabel =
    category === "print"
      ? locale === "tr" ? "İmzalı baskı" : "Signed print"
      : category === "tshirt"
        ? "T-shirt"
        : category === "mug"
          ? "Mug"
          : "Sticker";

  return createPortal(
    <div
      className="print-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="turkey-product-title"
        aria-describedby="turkey-product-description"
        className="print-modal"
      >
        <button
          ref={closeRef}
          onClick={onClose}
          className="print-modal__close"
          aria-label="Close product options"
        >
          <X />
        </button>
        <div className="print-modal__media">
          <div
            className={`artwork-finish-preview ${showFramedPreview ? "artwork-finish-preview--framed" : "artwork-finish-preview--unframed"} ${imageReady ? "is-ready" : "is-loading"}`}
          >
            {imageFailed ? (
              <div
                className="artwork-finish-preview__fallback"
                role="img"
                aria-label={product.name}
              >
                Image unavailable
              </div>
            ) : (
              <div className="artwork-finish-preview__frame">
                <div className="artwork-finish-preview__mat">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    onLoad={() => setImageReady(true)}
                    onError={() => {
                      setImageFailed(true);
                      setImageReady(true);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="print-modal__content">
          <p className="eyebrow pr-14">{categoryLabel}</p>
          <h2
            id="turkey-product-title"
            className="mt-3 pr-14 text-4xl md:text-5xl"
          >
            {product.name}
          </h2>
          <p
            id="turkey-product-description"
            className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65"
          >
            {product.description}
          </p>

          {category === "print" && product.printOptions && (
            <>
              <section className="mt-5">
                {availableSizes.length > 1 ? (
                  <fieldset>
                    <legend className="font-semibold">{locale === "tr" ? "Boyut seç" : "Choose a size"}</legend>
                    <div className="mt-3 grid gap-2">
                      {availableSizes.map((option) => {
                        const label = formatPrintSize(option);
                        const selected = sizeId === option.id;
                        return (
                          <label
                            key={option.id}
                            className={`flex min-h-14 cursor-pointer items-center gap-3 border p-3 transition-colors focus-within:ring-2 focus-within:ring-coral ${selected ? "border-coral bg-coral/5" : "border-ink/15"}`}
                          >
                            <input
                              type="radio"
                              name="print-size"
                              value={option.id}
                              checked={selected}
                              onChange={() => setSizeId(option.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <strong className="block">{label.primary}</strong>
                              {label.secondary && (
                                <span className="mt-1 block text-xs text-ink/50">
                                  {label.secondary}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : availableSizes.length === 1 ? (
                  <div>
                    <p className="eyebrow">{locale === "tr" ? "BOYUT" : "SIZE"}</p>
                    <p className="mt-2 font-semibold">
                      {formattedSize?.primary}
                    </p>
                    {formattedSize?.secondary && (
                      <p className="mt-1 text-sm text-ink/50">
                        {formattedSize.secondary}
                      </p>
                    )}
                  </div>
                ) : (
                  <p
                    role="alert"
                    className="border border-coral/30 bg-coral/5 p-4 text-sm font-semibold text-coral"
                  >
                    This print has no available sizes.
                  </p>
                )}
              </section>

              {size && (
                <section className="mt-5">
                  <p className="eyebrow">{locale === "tr" ? "FİYAT" : "PRICE"}</p>
                  {baseSale.status === "active" ? (
                    <div className="mt-2">
                      <Money baseAmountUsdCents={originalPrintUnit} canonicalCurrency="TRY" className="block text-sm text-ink/45 line-through" />
                      <Money baseAmountUsdCents={discountedPrintUnit} canonicalCurrency="TRY" className="mt-1 block font-sans text-2xl font-bold text-green" />
                      <p className="mt-1 text-sm font-semibold text-coral">
                        {baseSale.percentage}% {locale === "tr" ? "indirim" : "off"} · {locale === "tr" ? "Tasarruf" : "Save"}{" "}
                        <Money baseAmountUsdCents={baseSale.discountAmountMinor} canonicalCurrency="TRY" />
                      </p>
                    </div>
                  ) : (
                    <Money baseAmountUsdCents={discountedPrintUnit} canonicalCurrency="TRY" className="mt-2 block font-sans text-2xl font-bold" />
                  )}
                </section>
              )}

              {size &&
                product.printOptions.framing.unframedAvailable &&
                product.printOptions.framing.framedAvailable && (
                <section className="mt-5">
                  <fieldset>
                    <legend className="eyebrow">{locale === "tr" ? "ÇERÇEVE" : "FRAMING"}</legend>
                    <label className={`mt-3 flex min-h-16 cursor-pointer items-center gap-3 border p-4 transition-colors focus-within:ring-2 focus-within:ring-coral ${framing === "framed" ? "border-green bg-green/5" : "border-ink/15 bg-paper"}`}>
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={framing === "framed"}
                        onChange={(event) => setFraming(event.target.checked ? "framed" : "unframed")}
                        aria-describedby="frame-option-description"
                      />
                      <span className={`grid h-6 w-6 shrink-0 place-items-center border ${framing === "framed" ? "border-green bg-green text-paper" : "border-ink/30"}`} aria-hidden="true">
                        {framing === "framed" && <Check size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block">{locale === "tr" ? "Siyah çerçeve ekle" : "Add a black frame"}</strong>
                        <span id="frame-option-description" className="mt-1 block text-xs text-ink/50">
                          {locale === "tr" ? "Teslimattan önce siyah çerçeveyle hazırlanır." : "Prepared in a black frame before delivery."}
                        </span>
                      </span>
                      <strong className="shrink-0 text-sm">+<Money baseAmountUsdCents={frameAdditional} canonicalCurrency="TRY" /></strong>
                    </label>
                  </fieldset>
                </section>
              )}
            </>
          )}

          {category === "tshirt" && (
            <fieldset className="mt-7">
              <legend className="font-semibold">Choose a color</legend>
              <div className="mt-3 flex gap-2">
                {product.tshirtOptions?.availableColors.map((option) => (
                  <label
                    key={option}
                    className={`flex min-h-11 items-center gap-2 border px-4 ${color === option ? "border-coral bg-coral/5" : "border-ink/15"}`}
                  >
                    <input
                      type="radio"
                      name="color"
                      checked={color === option}
                      onChange={() => setColor(option)}
                    />
                    <span
                      className={`h-4 w-4 border border-ink/30 ${option === "black" ? "bg-ink" : "bg-white"}`}
                    />
                    {option[0].toUpperCase() + option.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {category === "mug" && (
            <p className="mt-7">
              <strong>Color:</strong> White
            </p>
          )}
          {category === "sticker" &&
            product.stickerOptions?.formatDescription && (
              <p className="mt-7">
                <strong>Format:</strong>{" "}
                {product.stickerOptions.formatDescription}
              </p>
            )}

          <section className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-semibold">{locale === "tr" ? "Adet" : "Quantity"}</p>
              <div className="mt-2 flex items-center border border-ink/15">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                  className="h-11 w-11 disabled:opacity-30"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} className="mx-auto" />
                </button>
                <input
                  aria-label="Quantity"
                  type="number"
                  min="1"
                  max={maximum}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(maximum, Number(event.target.value) || 1),
                      ),
                    )
                  }
                  className="h-11 w-14 border-x border-ink/15 bg-paper text-center"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.min(maximum, value + 1))
                  }
                  disabled={quantity >= maximum}
                  className="h-11 w-11 disabled:opacity-30"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} className="mx-auto" />
                </button>
              </div>
            </div>
            {category !== "print" && <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-ink/45">
                Unit price
              </p>
              <Money
                baseAmountUsdCents={unitPrice}
                canonicalCurrency="TRY"
                showBase
                className="mt-1 block font-sans text-xl font-bold"
              />
              {baseSale.status === "active" && (
                <span className="mt-1 block text-xs text-coral">
                  {baseSale.percentage}% off base price
                </span>
              )}
            </div>}
          </section>

          <section className="mt-5 bg-card p-4" aria-live="polite">
            <p className="eyebrow">{locale === "tr" ? "SİPARİŞ ÖZETİ" : "ORDER SUMMARY"}</p>
            {formattedSize && (
              <p className="mt-3 text-sm">
                {formattedSize.primary}
                {formattedSize.secondary && (
                  <span className="block text-ink/50">
                    {formattedSize.secondary}
                  </span>
                )}
              </p>
            )}
            {category === "print" && (
              <p className="mt-2 text-sm">
                {framing === "framed"
                  ? locale === "tr" ? "Siyah çerçeve" : "Black frame"
                  : locale === "tr" ? "Çerçevesiz" : "Unframed"}
              </p>
            )}
            <p className="mt-2 text-sm">{locale === "tr" ? "Adet" : "Quantity"} {quantity}</p>
            {category === "print" && (
              <div className="mt-4 space-y-2 border-t border-ink/10 pt-3 text-sm">
                <p className="flex justify-between gap-4">
                  <span>{baseSale.status === "active" ? locale === "tr" ? "Baskının normal fiyatı" : "Original print" : locale === "tr" ? "Baskı" : "Print"}</span>
                  <Money baseAmountUsdCents={(baseSale.status === "active" ? originalPrintUnit : discountedPrintUnit) * quantity} canonicalCurrency="TRY" />
                </p>
                {baseSale.status === "active" && (
                  <p className="flex justify-between gap-4 text-green">
                    <span>{baseSale.percentage}% {locale === "tr" ? "indirim" : "discount"}</span>
                    <strong>−<Money baseAmountUsdCents={productSavings} canonicalCurrency="TRY" /></strong>
                  </p>
                )}
                {framing === "framed" && frameAdditional > 0 && (
                  <p className="flex justify-between gap-4">
                    <span>{locale === "tr" ? "Siyah çerçeve" : "Black frame"}</span>
                    <span>+<Money baseAmountUsdCents={frameAdditional * quantity} canonicalCurrency="TRY" /></span>
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
              <p className="flex items-center justify-between">
                <span>{locale === "tr" ? "Ara toplam" : "Subtotal"}</span>
                <Money
                  baseAmountUsdCents={pricing.lineTotalCents}
                  canonicalCurrency="TRY"
                  showBase
                />
              </p>
              <p className="flex items-center justify-between">
                <span>{locale === "tr" ? "Kargo" : "Shipping"}</span>
                {shippingSavings > 0 ? (
                  <span className="flex items-baseline gap-2">
                    <Money baseAmountUsdCents={TURKIYE_FLAT_SHIPPING_MINOR} canonicalCurrency="TRY" className="text-ink/45 line-through" />
                    <strong className="text-green">{locale === "tr" ? "ÜCRETSİZ" : "FREE"}</strong>
                  </span>
                ) : (
                  <Money baseAmountUsdCents={shipping} canonicalCurrency="TRY" showBase />
                )}
              </p>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-ink/10 pt-3">
              <strong>{locale === "tr" ? "TOPLAM" : "TOTAL"}</strong>
              <Money
                baseAmountUsdCents={orderTotal}
                canonicalCurrency="TRY"
                showBase
                className="font-sans text-2xl font-bold"
              />
            </div>
            {totalSavings > 0 && (
              <div className="mt-4 border-l-2 border-green bg-green/5 px-3 py-2 text-green">
                <p className="text-xs font-bold uppercase tracking-wider">{locale === "tr" ? "TASARRUFUNUZ" : "YOU SAVE"}</p>
                <Money baseAmountUsdCents={totalSavings} canonicalCurrency="TRY" className="mt-1 block font-sans text-xl font-bold" />
                <p className="mt-1 text-xs text-ink/55">
                  {[
                    productSavings > 0 ? `${locale === "tr" ? "Ürün indirimi" : "Product discount"} ${(productSavings / 100).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")} TL` : "",
                    shippingSavings > 0 ? `${locale === "tr" ? "Kargo" : "Delivery"} 50 TL` : "",
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink/60">
              <PackageCheck size={17} aria-hidden="true" />
              {locale === "tr"
                ? "Türkiye içi kargo sabit 50 TL'dir. 1.500 TL ve üzeri siparişlerde kargo ücretsizdir."
                : "Shipping is a flat 50 TL within Türkiye. Orders of 1,500 TL or more ship free."}
            </p>
          </section>

          {!valid && (
            <p
              id="product-option-error"
              role="alert"
              className="mt-4 text-sm font-semibold text-coral"
            >
              {soldOut
                ? "This product is sold out."
                : !availableSizes.length && category === "print"
                  ? "No print size is currently available."
                  : "This product cannot be ordered in this configuration."}
            </p>
          )}
          <button
            onClick={add}
            disabled={!valid || added}
            aria-describedby={!valid ? "product-option-error" : undefined}
            className={`button-primary mt-5 hidden w-full disabled:opacity-70 md:flex ${added ? "!bg-green !text-paper" : ""}`}
          >
            {added ? (
              <>
                <Check size={17} />
                {locale === "tr" ? "Sepetine eklendi" : "Added to your basket"}
              </>
            ) : soldOut ? (
              "Sold out"
            ) : locale === "tr" ? (
              "Sepete ekle"
            ) : (
              "Add to basket"
            )}
          </button>
          <p
            aria-live="polite"
            className="mt-2 text-sm font-semibold text-coral"
          >
            {message}
          </p>
          <div className="print-modal__mobile-action">
            <button
              onClick={add}
              disabled={!valid || added}
              aria-describedby={!valid ? "product-option-error" : undefined}
              className={`button-primary w-full disabled:opacity-70 ${added ? "!bg-green !text-paper" : ""}`}
            >
              {added
                ? locale === "tr"
                  ? "Sepetine eklendi"
                  : "Added to your basket"
                : soldOut
                  ? "Sold out"
                  : locale === "tr"
                    ? "Sepete ekle"
                    : "Add to basket"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
