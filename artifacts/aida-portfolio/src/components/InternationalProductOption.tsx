import { useState } from "react";
import { ArrowUpRight, Globe2, PackageOpen } from "lucide-react";
import { useInternationalProducts } from "@/hooks/use-international";
import { isSafeFourthwallUrl } from "@/lib/fourthwall";
import { useLocale } from "@/lib/locale";
import { trackAnalytics } from "@/lib/analytics";
import { internationalOptionCopy, type FourthwallLinkType } from "@/lib/international-option-copy";

export default function InternationalProductOption({
  fourthwallProductId,
  fourthwallProductUrl,
  relationshipType = "related",
  sourceProductId,
  sourceProductType,
  displayContext,
}: {
  fourthwallProductId?: string;
  fourthwallProductUrl?: string;
  relationshipType?: FourthwallLinkType;
  sourceProductId: string;
  sourceProductType: string;
  displayContext: "product_page" | "product_modal";
}) {
  const { locale } = useLocale();
  const international = useInternationalProducts();
  const [imageFailed, setImageFailed] = useState(false);
  const text = internationalOptionCopy[locale];
  const relationship = text[relationshipType];
  const linked = international.products.find((product) => product.id === fourthwallProductId);
  const fallbackUrl = fourthwallProductUrl && isSafeFourthwallUrl(fourthwallProductUrl, international.shopUrl) ? fourthwallProductUrl : "";
  const href = linked?.externalUrl || fallbackUrl;

  if (!fourthwallProductId && !fourthwallProductUrl) return null;
  if (international.loading)
    return <aside className="international-option international-option--loading" aria-label={locale === "tr" ? "Uluslararası seçenek yükleniyor" : "Loading international option"}><span /><span /><span /></aside>;
  if (!href) return null;
  const multiplePrices = linked ? new Set(linked.variants.map((variant) => variant.price.formatted)).size > 1 : false;
  const name = linked?.name || text.fallbackTitle;

  return (
    <aside className={`international-option international-option--${displayContext}`} aria-labelledby={`international-option-${sourceProductId}`}>
      <div className="international-option__label"><Globe2 aria-hidden="true" /><span>{relationship.eyebrow}</span></div>
      <h3 id={`international-option-${sourceProductId}`}>{relationship.heading}</h3>
      <p className="international-option__body">{relationship.body}</p>
      <div className="international-option__product">
        <div className="international-option__image">
          {linked?.primaryImage && !imageFailed ? <img src={linked.primaryImage.url} width={linked.primaryImage.width || 240} height={linked.primaryImage.height || 240} alt={linked.primaryImage.alt || name} loading="lazy" decoding="async" onError={() => setImageFailed(true)} /> : <PackageOpen aria-hidden="true" />}
        </div>
        <div><small>{text.shop}</small><strong title={name}>{name}</strong>{linked?.price?.formatted && <span>{multiplePrices ? `${locale === "tr" ? "Başlangıç" : "From"} ` : ""}{linked.price.formatted}</span>}</div>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="international-option__cta" aria-label={text.aria(name)} onClick={() => trackAnalytics("fourthwall_product_click", { metadata: { localProductId: sourceProductId, localProductType: sourceProductType, fourthwallProductId: fourthwallProductId || linked?.id || "fallback", relationshipType, displayContext, locale, shopContext: "turkiye" } })}>
        {text.cta}<ArrowUpRight aria-hidden="true" />
      </a>
      <p className="international-option__trust">{text.trust}</p>
    </aside>
  );
}
