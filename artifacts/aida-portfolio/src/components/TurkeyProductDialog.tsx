import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, PackageCheck, Plus, X } from "lucide-react";
import Money from "@/components/Money";
import { useToast } from "@/hooks/use-toast";
import { addItemToCart, type ManagedProduct } from "@/lib/store";
import {
  calculatePrintPrice,
  formatPrintSize,
  getFinishPriceDifference,
  getPrintConfigurationKey,
  type PrintFraming,
  type TshirtColor,
} from "@/lib/turkiye-products";
import { isSoldOut } from "@/lib/product-status";

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
  const { toast } = useToast();

  useEffect(() => {
    if (!product) return;
    previousFocus.current = document.activeElement as HTMLElement;
    setSizeId(
      availableSizes.find((size) => size.isBaseSize)?.id ||
        availableSizes[0]?.id ||
        "",
    );
    setFraming(
      product.printOptions?.framing.defaultFinish ||
        (product.printOptions?.framing.unframedAvailable
          ? "unframed"
          : "framed"),
    );
    setColor(product.tshirtOptions?.availableColors[0] || "black");
    setQuantity(1);
    setMessage("");
    setAdded(false);
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
  const pricing =
    category === "print" && size && product.printOptions
      ? calculatePrintPrice({
          basePriceCents: product.priceUsdCents,
          sizePriceDifferenceCents: size.additionalPriceUsdCents,
          finishPriceDifferenceCents: getFinishPriceDifference(
            product.printOptions,
            framing,
          ),
          quantity,
        })
      : {
          unitPriceCents: product.priceUsdCents,
          lineTotalCents: product.priceUsdCents * quantity,
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
        priceUsdCents: unitPrice,
        market: "turkiye",
        canonicalCurrency: "TRY",
        canonicalPriceMinor: unitPrice,
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
        title: "Added to the basket",
        description: `${product.name} · Quantity ${quantity}`,
        duration: 3000,
        className: "border-green/30 bg-[#edf6ed] text-ink",
      });
      window.setTimeout(onClose, 1400);
    } else setMessage(result.reason || "This product could not be added.");
  };

  const categoryLabel =
    category === "print"
      ? "Signed print"
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
          <img src={product.imageUrl} alt={product.name} />
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
                    <legend className="font-semibold">Choose a size</legend>
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
                    <p className="eyebrow">Size</p>
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

              {size && framingOptions.length > 0 && (
                <section className="mt-5">
                  {framingOptions.length > 1 ? (
                    <fieldset>
                      <legend className="font-semibold">Choose a finish</legend>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {framingOptions.map((option) => {
                          const selected = framing === option;
                          return (
                            <label
                              key={option}
                              className={`cursor-pointer border p-3 focus-within:ring-2 focus-within:ring-coral ${selected ? "border-coral bg-coral/5" : "border-ink/15"}`}
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="print-finish"
                                  checked={selected}
                                  onChange={() => setFraming(option)}
                                />
                                <strong>
                                  {option === "framed" ? "Framed" : "Unframed"}
                                </strong>
                              </span>
                              <span className="mt-2 block text-xs text-ink/50">
                                {option === "framed"
                                  ? "Prepared in a frame before delivery."
                                  : "Print only, carefully packed flat."}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : (
                    <div>
                      <p className="eyebrow">Finish</p>
                      <p className="mt-2 font-semibold">
                        {framingOptions[0] === "framed" ? "Framed" : "Unframed"}
                      </p>
                      <p className="mt-1 text-sm text-ink/50">
                        {framingOptions[0] === "framed"
                          ? "Prepared in a frame before delivery."
                          : "This edition is currently offered unframed."}
                      </p>
                    </div>
                  )}
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
              <p className="font-semibold">Quantity</p>
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
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-ink/45">
                Unit price
              </p>
              <Money
                baseAmountUsdCents={unitPrice}
                canonicalCurrency="TRY"
                showBase
                className="mt-1 block font-sans text-xl font-bold"
              />
            </div>
          </section>

          <section className="mt-5 bg-card p-4" aria-live="polite">
            <p className="eyebrow">Order summary</p>
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
                {framing === "framed" ? "Framed" : "Unframed"}
              </p>
            )}
            <p className="mt-2 text-sm">Quantity {quantity}</p>
            {size?.additionalPriceUsdCents ||
            (framing === "framed" && frameAdditional) ? (
              <div className="mt-4 space-y-1 border-t border-ink/10 pt-3 text-xs text-ink/60">
                <p className="flex justify-between">
                  <span>Base print</span>
                  <span>
                    <Money baseAmountUsdCents={product.priceUsdCents} canonicalCurrency="TRY" />
                  </span>
                </p>
                {Boolean(size?.additionalPriceUsdCents) && (
                  <p className="flex justify-between">
                    <span>{formattedSize?.primary} size upgrade</span>
                    <span>
                      +
                      <Money
                        baseAmountUsdCents={size!.additionalPriceUsdCents}
                        canonicalCurrency="TRY"
                      />
                    </span>
                  </p>
                )}
                {framing === "framed" && frameAdditional > 0 && (
                  <p className="flex justify-between">
                    <span>Framed finish</span>
                    <span>
                      +<Money baseAmountUsdCents={frameAdditional} canonicalCurrency="TRY" />
                    </span>
                  </p>
                )}
              </div>
            ) : null}
            <div className="mt-4 flex items-end justify-between border-t border-ink/10 pt-4">
              <strong>Total</strong>
              <Money
                baseAmountUsdCents={pricing.lineTotalCents}
                canonicalCurrency="TRY"
                showBase
                className="font-sans text-2xl font-bold"
              />
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink/60">
              <PackageCheck size={17} aria-hidden="true" />
              Shipping price will be calculated based on the package size
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
                <Check size={17} /> Added to the basket
              </>
            ) : soldOut ? (
              "Sold out"
            ) : (
              "Add to basket"
            )}
          </button>
          <p className="mt-3 text-xs text-ink/50">
            Your selection is confirmed personally with Aida on WhatsApp.
          </p>
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
                ? "Added to the basket"
                : soldOut
                  ? "Sold out"
                  : "Add to basket"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
