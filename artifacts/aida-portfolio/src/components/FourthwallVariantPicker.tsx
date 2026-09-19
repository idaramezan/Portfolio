import { useMemo } from "react";
import type { InternationalProduct } from "@/lib/fourthwall";
import { normalizeFourthwallVariant } from "@/lib/fourthwall-options";

export default function FourthwallVariantPicker({
  product,
  selectedId,
  onSelect,
  locale,
  name,
}: {
  product: InternationalProduct;
  selectedId: string;
  onSelect: (id: string) => void;
  locale: "en" | "tr";
  name: string;
}) {
  const variants = useMemo(
    () =>
      product.variants.map((variant) =>
        normalizeFourthwallVariant(product.name, variant),
      ),
    [product],
  );
  const selected =
    variants.find((variant) => variant.id === selectedId) ||
    variants.find((variant) => variant.available);
  const colors = [
    ...new Set(variants.map((variant) => variant.color).filter(Boolean)),
  ] as string[];
  const sizes = [
    ...new Set(variants.map((variant) => variant.size).filter(Boolean)),
  ] as string[];
  const chooseColor = (color: string) => {
    const match =
      variants.find(
        (variant) =>
          variant.available &&
          variant.color === color &&
          (!selected?.size || variant.size === selected.size),
      ) ||
      variants.find((variant) => variant.available && variant.color === color);
    if (match) onSelect(match.id);
  };
  const chooseSize = (size: string) => {
    const match =
      variants.find(
        (variant) =>
          variant.available &&
          variant.size === size &&
          (!selected?.color || variant.color === selected.color),
      ) ||
      variants.find((variant) => variant.available && variant.size === size);
    if (match) onSelect(match.id);
  };
  if (variants.length <= 1) return null;
  return (
    <div className="fourthwall-option-picker">
      {colors.length === 1 ? (
        <p className="fourthwall-option-picker__meta">
          <span>{locale === "tr" ? "RENK" : "COLOR"}</span>
          {colors[0]}
        </p>
      ) : colors.length > 1 ? (
        <fieldset>
          <legend>{locale === "tr" ? "RENK" : "COLOR"}</legend>
          <div className="fourthwall-option-picker__chips">
            {colors.map((color) => {
              const enabled = variants.some(
                (variant) => variant.available && variant.color === color,
              );
              return (
                <button
                  key={color}
                  type="button"
                  disabled={!enabled}
                  aria-pressed={selected?.color === color}
                  onClick={() => chooseColor(color)}
                >
                  {variants.find((variant) => variant.color === color)
                    ?.swatch && (
                    <i
                      style={{
                        background: variants.find(
                          (variant) => variant.color === color,
                        )?.swatch,
                      }}
                    />
                  )}
                  {color}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {sizes.length ? (
        <fieldset>
          <legend>{locale === "tr" ? "BEDEN" : "SIZE"}</legend>
          <div className="fourthwall-option-picker__sizes">
            {sizes.map((size) => {
              const match = variants.find(
                (variant) =>
                  variant.size === size &&
                  (!selected?.color || variant.color === selected.color),
              );
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!match?.available}
                  aria-pressed={selected?.size === size}
                  onClick={() => chooseSize(size)}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : !colors.length ? (
        <fieldset>
          <legend>{locale === "tr" ? "SEÇENEK" : "OPTION"}</legend>
          <div className="fourthwall-option-picker__chips">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                name={name}
                disabled={!variant.available}
                aria-pressed={variant.id === selected?.id}
                onClick={() => onSelect(variant.id)}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
