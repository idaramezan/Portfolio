import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { InternationalProduct } from "@/lib/fourthwall";
import { addFourthwallCartItem } from "@/lib/fourthwall-cart";
import {
  getDefaultFourthwallVariant,
  getFourthwallVariants,
} from "@/lib/fourthwall-variants";
import type { ManagedProduct } from "@/lib/store";
import { trackAnalytics } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

const words = {
  en: {
    format: "CHOOSE FORMAT",
    variant: "CHOOSE SIZE / OPTION",
    quantity: "QUANTITY",
    poster: "Print only",
    framed: "Ready framed",
    unavailable: "This format is currently unavailable",
    add: "ADD TO BASKET",
    adding: "ADDING…",
    added: "ADDED TO BASKET",
    error: "Couldn't add this piece to your basket. Please try again.",
  },
  tr: {
    format: "FORMAT SEÇ",
    variant: "BOYUT / SEÇENEK",
    quantity: "ADET",
    poster: "Yalnızca baskı",
    framed: "Çerçeveli, hazır",
    unavailable: "Bu seçenek şu anda mevcut değil",
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
  const variants = useMemo(
    () => getFourthwallVariants(product, catalogue, shopUrl),
    [product, catalogue, shopUrl],
  );
  const queryFormat = new URLSearchParams(window.location.search).get("format");
  const initial =
    variants.find((variant) => variant.variantType === queryFormat) ||
    getDefaultFourthwallVariant(variants);
  const [selectedId, setSelectedId] = useState(initial?.id || "");
  const selected =
    variants.find((variant) => variant.id === selectedId) || initial;
  const availableOptions = (selected?.product?.variants || []).filter(
    (variant) => variant.available,
  );
  const [optionId, setOptionId] = useState(availableOptions[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!variants.some((variant) => variant.id === selectedId))
      setSelectedId(getDefaultFourthwallVariant(variants)?.id || "");
  }, [variants, selectedId]);
  useEffect(() => {
    setOptionId(availableOptions[0]?.id || "");
    const image = selected?.product?.primaryImage;
    onImageChange?.(
      image
        ? {
            src: image.url,
            alt: image.alt || `${product.name} ${selected?.label || ""}`,
          }
        : undefined,
    );
  }, [selected?.id]);

  if (!selected) return null;
  const option =
    availableOptions.find((variant) => variant.id === optionId) ||
    availableOptions[0];
  const formatDescription =
    selected.variantType === "framed" ? text.framed : text.poster;
  const add = async () => {
    if (!selected.product || !option || busy) return;
    setBusy(true);
    setError("");
    try {
      await addFourthwallCartItem({
        id: `fourthwall-${option.id}`,
        variantId: option.id,
        productId: selected.product.id,
        title: product.name,
        format: selected.label,
        variantName: option.name,
        imageUrl: selected.product.primaryImage?.url,
        quantity,
        unitAmountMinor: Math.round(option.price.amount * 100),
        currency: option.price.currency,
      });
      setAdded(true);
      toast({
        title: text.added,
        description: product.name,
        duration: 2500,
        className: "border-green/30 bg-[#edf6ed] text-ink",
      });
      trackAnalytics("add_to_basket", {
        entityId: product.id,
        entityName: product.name,
        metadata: {
          productType: "fourthwall",
          format: selected.variantType,
          variantId: option.id,
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

  return (
    <div className="international-formats">
      <fieldset>
        <legend>{text.format}</legend>
        <div className="international-formats__cards" role="radiogroup">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={variant.id === selected.id}
              disabled={!variant.available}
              onClick={() => {
                setSelectedId(variant.id);
                setQuantity(1);
                setError("");
                trackAnalytics("format_selected", {
                  entityId: product.id,
                  metadata: {
                    productId: product.id,
                    format: variant.variantType,
                    country: countryCode,
                    fourthwallProductId: variant.fourthwallProductId,
                  },
                });
              }}
            >
              <span className="international-formats__radio" aria-hidden="true">
                {variant.id === selected.id && <Check size={14} />}
              </span>
              <span>
                <strong>{variant.label}</strong>
                <small>
                  {variant.variantType === "framed" ? text.framed : text.poster}
                </small>
              </span>
              <b>
                {variant.product?.price.formatted ||
                  (variant.available ? "—" : text.unavailable)}
              </b>
            </button>
          ))}
        </div>
      </fieldset>
      {availableOptions.length > 1 && (
        <fieldset className="international-formats__options">
          <legend>{text.variant}</legend>
          <div>
            {availableOptions.map((variant) => (
              <label
                key={variant.id}
                className={variant.id === option?.id ? "is-selected" : ""}
              >
                <input
                  type="radio"
                  name={`fourthwall-option-${product.id}`}
                  checked={variant.id === option?.id}
                  onChange={() => setOptionId(variant.id)}
                />
                <span>
                  <strong>{variant.name}</strong>
                  <small>{variant.price.formatted}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {option && (
        <>
          <strong className="international-formats__price">
            {option.price.formatted}
          </strong>
          <p className="international-formats__selection">
            {selected.label} · {formatDescription}
            {option.name && option.name !== "Standard"
              ? ` · ${option.name}`
              : ""}
          </p>
          <div className="international-formats__quantity">
            <span>{text.quantity}</span>
            <div>
              <button
                type="button"
                disabled={quantity <= 1 || busy}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label={
                  locale === "tr" ? "Adedi azalt" : "Decrease quantity"
                }
              >
                <Minus size={15} />
              </button>
              <strong aria-live="polite">{quantity}</strong>
              <button
                type="button"
                disabled={quantity >= 99 || busy}
                onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                aria-label={
                  locale === "tr" ? "Adedi artır" : "Increase quantity"
                }
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
          <button
            type="button"
            className="button-primary product-detail__cta"
            disabled={busy || added}
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
      {!option && (
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
