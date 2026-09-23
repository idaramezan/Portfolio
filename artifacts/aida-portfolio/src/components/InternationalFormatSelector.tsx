import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { InternationalProduct } from "@/lib/fourthwall";
import { addFourthwallCartItem } from "@/lib/fourthwall-cart";
import {
  getDefaultOptionForFormat,
  getFourthwallFormats,
  getFourthwallVariants,
  getLowestFourthwallVariant,
  getOptionsForFormat,
} from "@/lib/fourthwall-variants";
import type { ManagedProduct } from "@/lib/store";
import { trackAnalytics } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

const words = {
  en: {
    format: "CHOOSE FORMAT",
    size: "CHOOSE SIZE",
    quantity: "QUANTITY",
    poster: "Print only",
    framed: "Ready framed",
    unavailable: "Unavailable",
    add: "ADD TO BASKET",
    adding: "ADDING…",
    added: "ADDED TO BASKET",
    error: "Couldn't add this piece to your basket. Please try again.",
  },
  tr: {
    format: "FORMAT SEÇ",
    size: "BOYUT SEÇ",
    quantity: "ADET",
    poster: "Yalnızca baskı",
    framed: "Çerçeveli, hazır",
    unavailable: "Mevcut değil",
    add: "SEPETE EKLE",
    adding: "EKLENİYOR…",
    added: "SEPETE EKLENDİ",
    error: "Bu ürün sepete eklenemedi. Lütfen tekrar dene.",
  },
} as const;

export default function InternationalFormatSelector({
  product,
  catalogue,
  shopUrl,
  countryCode,
  locale,
  onImageChange,
}: {
  product: ManagedProduct;
  catalogue: InternationalProduct[];
  shopUrl: string | null;
  countryCode: string;
  locale: "en" | "tr";
  onImageChange?: (image?: { src: string; alt: string }) => void;
}) {
  const text = words[locale];
  const { toast } = useToast();
  const options = useMemo(
    () => getFourthwallVariants(product, catalogue, shopUrl),
    [product, catalogue, shopUrl],
  );
  const formats = getFourthwallFormats(options);
  const availableFormats = formats.filter((item) =>
    Boolean(getDefaultOptionForFormat(options, item)),
  );
  const requested = new URLSearchParams(window.location.search).get("format");
  const initialFormat = availableFormats.includes(requested || "")
    ? requested!
    : availableFormats.includes(product.fourthwallDefaultFormat || "")
      ? product.fourthwallDefaultFormat!
      : availableFormats[0] || formats[0];
  const [format, setFormat] = useState(initialFormat || "");
  const initial = getDefaultOptionForFormat(options, initialFormat || "");
  const [selectedId, setSelectedId] = useState(initial?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const formatOptions = getOptionsForFormat(options, format);
  const selected =
    formatOptions.find(
      (option) =>
        option.id === selectedId &&
        option.available &&
        option.product?.available,
    ) || getDefaultOptionForFormat(options, format);

  useEffect(() => {
    if (!availableFormats.includes(format))
      setFormat(availableFormats[0] || formats[0] || "");
  }, [options, format]);
  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    const image = selected?.product?.primaryImage;
    onImageChange?.(
      image
        ? {
            src: image.url,
            alt: image.alt || `${product.name} ${selected.sizeLabel || ""}`,
          }
        : undefined,
    );
  }, [selected?.id]);

  const chooseFormat = (nextFormat: string) => {
    const sameSize =
      selected?.sizeLabel &&
      getOptionsForFormat(options, nextFormat).find(
        (option) =>
          option.sizeLabel === selected.sizeLabel &&
          option.available &&
          option.product?.available,
      );
    const next = sameSize || getDefaultOptionForFormat(options, nextFormat);
    setFormat(nextFormat);
    setSelectedId(next?.id || "");
    setQuantity(1);
    setError("");
  };
  const add = async () => {
    const fourthwallVariant = selected?.product?.variants.find(
      (variant) => variant.available,
    );
    if (!selected?.product || !fourthwallVariant || busy || !selected.available)
      return;
    setBusy(true);
    setError("");
    try {
      await addFourthwallCartItem({
        id: `fourthwall-${selected.product.id}-${fourthwallVariant.id}`,
        variantId: fourthwallVariant.id,
        productId: selected.product.id,
        title: product.name,
        format: selected.label,
        variantName: selected.sizeLabel || "",
        imageUrl: selected.product.primaryImage?.url,
        quantity,
        unitAmountMinor: Math.round(fourthwallVariant.price.amount * 100),
        currency: fourthwallVariant.price.currency,
      });
      setAdded(true);
      toast({
        title: text.added,
        description: `${product.name} · ${selected.label} · ${selected.sizeLabel}`,
        duration: 2500,
        className: "border-green/30 bg-[#edf6ed] text-ink",
      });
      trackAnalytics("add_to_basket", {
        entityId: product.id,
        entityName: product.name,
        metadata: {
          productType: "fourthwall",
          format,
          size: selected.sizeLabel || "",
          fourthwallProductId: selected.product.id,
          variantId: fourthwallVariant.id,
          quantity,
          country: countryCode,
        },
      });
      window.setTimeout(() => setAdded(false), 1800);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.error);
    } finally {
      setBusy(false);
    }
  };
  if (!formats.length) return null;
  return (
    <div className="international-formats">
      <fieldset>
        <legend>{text.format}</legend>
        <div className="international-formats__cards" role="radiogroup">
          {formats.map((item) => {
            const formatItems = getOptionsForFormat(options, item);
            const lowest = getLowestFourthwallVariant(formatItems);
            const available = Boolean(
              lowest?.available && lowest.product?.available,
            );
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={item === format}
                disabled={!available}
                onClick={() => chooseFormat(item)}
              >
                <span
                  className="international-formats__radio"
                  aria-hidden="true"
                >
                  {item === format && <Check size={14} />}
                </span>
                <span>
                  <strong>{formatItems[0]?.label || item}</strong>
                  <small>{item === "framed" ? text.framed : text.poster}</small>
                </span>
                <b>
                  {available && lowest?.product
                    ? `From ${lowest.product.price.formatted}`
                    : text.unavailable}
                </b>
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="international-formats__sizes">
        <legend>{text.size}</legend>
        <div>
          {formatOptions.map((option) => {
            const available = Boolean(
              option.available && option.product?.available,
            );
            return (
              <button
                key={option.id}
                type="button"
                disabled={!available}
                aria-pressed={option.id === selected?.id}
                onClick={() => {
                  setSelectedId(option.id);
                  setQuantity(1);
                  setError("");
                }}
              >
                <span>
                  {option.id === selected?.id && <Check size={13} />}
                  {option.sizeLabel || option.product?.name}
                </span>
                <small>
                  {available
                    ? option.product?.price.formatted
                    : text.unavailable}
                </small>
              </button>
            );
          })}
        </div>
      </fieldset>
      {selected?.product && (
        <>
          <strong className="international-formats__price">
            {selected.product.price.formatted}
          </strong>
          <p className="international-formats__selection">
            {selected.label} · {selected.sizeLabel}
          </p>
          <div className="international-formats__quantity">
            <span>{text.quantity}</span>
            <div>
              <button
                type="button"
                disabled={quantity <= 1 || busy}
                onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <strong aria-live="polite">{quantity}</strong>
              <button
                type="button"
                disabled={quantity >= 99 || busy}
                onClick={() => setQuantity((v) => Math.min(99, v + 1))}
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
          <button
            type="button"
            className="button-primary product-detail__cta"
            disabled={busy || added || !selected.available}
            onClick={() => void add()}
          >
            {added ? (
              <>
                <Check size={17} />
                {text.added}
              </>
            ) : busy ? (
              text.adding
            ) : (
              text.add
            )}
          </button>
        </>
      )}
      {!selected && (
        <p className="international-formats__unavailable">{text.unavailable}</p>
      )}
      {error && (
        <p role="alert" className="international-formats__error">
          {error}
        </p>
      )}
    </div>
  );
}
