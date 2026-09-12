import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { InternationalProduct } from "@/lib/fourthwall";
import {
  getDefaultFourthwallVariant,
  getFourthwallVariants,
} from "@/lib/fourthwall-variants";
import type { ManagedProduct } from "@/lib/store";
import { trackAnalytics } from "@/lib/analytics";

export default function InternationalFormatSelector({
  product,
  catalogue,
  shopUrl,
  countryCode,
  locale,
}: {
  product: ManagedProduct;
  catalogue: InternationalProduct[];
  shopUrl: string | null;
  countryCode: string;
  locale: "en" | "tr";
}) {
  const variants = useMemo(
    () => getFourthwallVariants(product, catalogue, shopUrl),
    [product, catalogue, shopUrl],
  );
  const queryFormat = new URLSearchParams(window.location.search).get("format");
  const initial =
    variants.find((variant) => variant.variantType === queryFormat) ||
    getDefaultFourthwallVariant(variants);
  const [selectedId, setSelectedId] = useState(initial?.id || "");
  useEffect(() => {
    if (!variants.some((variant) => variant.id === selectedId))
      setSelectedId(getDefaultFourthwallVariant(variants)?.id || "");
  }, [variants, selectedId]);
  const selected =
    variants.find((variant) => variant.id === selectedId) || initial;
  if (!selected) return null;
  const optionNames = [
    ...new Set(
      (selected.product?.variants || [])
        .map((variant) => variant.name.trim())
        .filter(Boolean),
    ),
  ];

  return (
    <div className="international-formats">
      {variants.length > 1 ? (
        <fieldset>
          <legend>{locale === "tr" ? "FORMAT SEÇ" : "CHOOSE FORMAT"}</legend>
          <div role="radiogroup">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={variant.id === selected.id}
                onClick={() => {
                  setSelectedId(variant.id);
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
                {variant.label}
                {!variant.available && <small>Unavailable</small>}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="international-formats__single">{selected.label}</p>
      )}
      {selected.product?.primaryImage && (
        <img
          key={selected.product.id}
          src={selected.product.primaryImage.url}
          alt={
            selected.product.primaryImage.alt ||
            `${product.name} ${selected.label}`
          }
          className="international-formats__preview"
        />
      )}
      <strong className="international-formats__price">
        {selected.product?.price?.formatted ||
          (locale === "tr" ? "Fiyat mağazada" : "Price available on shop")}
      </strong>
      <div className="international-formats__information">
        <details open>
          <summary>{locale === "tr" ? "BOYUTLAR" : "SIZE"}</summary>
          {optionNames.length ? (
            <ul>
              {optionNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p>
              {locale === "tr"
                ? "Mevcut boyutlar seçili ürünün mağaza sayfasında gösterilir."
                : "Available sizes are shown on the selected product’s shop page."}
            </p>
          )}
        </details>
        <details>
          <summary>
            {locale === "tr" ? "DAHA FAZLA DETAY" : "MORE DETAILS"}
          </summary>
          <p>
            {selected.product?.description ||
              (locale === "tr"
                ? `${selected.label} baskının tüm malzeme ve üretim detayları mağaza sayfasında yer alır.`
                : `Full material and production details for the ${selected.label.toLowerCase()} print are available on the shop page.`)}
          </p>
        </details>
        <details>
          <summary>
            {locale === "tr"
              ? "KALİTE GARANTİSİ VE İADELER"
              : "QUALITY GUARANTEE & RETURNS"}
          </summary>
          <p>
            {locale === "tr"
              ? "Bu ürünün kalite sorunları ve iade uygunluğu Fourthwall tarafından yönetilir. Güncel koşulları seçili ürünün mağaza sayfasında inceleyin."
              : "Quality issues and return eligibility for this item are handled by Fourthwall. Review the selected product page for the current terms."}
          </p>
          {selected.href && (
            <a href={selected.href} target="_blank" rel="noopener noreferrer">
              {locale === "tr" ? "GÜNCEL KOŞULLARI GÖR" : "VIEW CURRENT TERMS"}{" "}
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </details>
      </div>
      {selected.available ? (
        <a
          className="button-primary product-detail__cta"
          href={selected.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackAnalytics("external_purchase_click", {
              entityId: product.id,
              metadata: {
                productId: product.id,
                format: selected.variantType,
                country: countryCode,
                fourthwallProductId: selected.fourthwallProductId,
              },
            })
          }
        >
          {locale === "tr" ? "BU BASKIYI EDİN" : "GET THIS PRINT"}{" "}
          <ArrowUpRight aria-hidden="true" />
        </a>
      ) : (
        <p className="international-formats__unavailable">
          {locale === "tr" ? "Şu anda mevcut değil" : "Currently unavailable"}
        </p>
      )}
    </div>
  );
}
