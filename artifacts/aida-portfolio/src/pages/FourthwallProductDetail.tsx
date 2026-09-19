import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Link, useRoute } from "wouter";
import ProductImageLightbox from "@/components/ProductImageLightbox";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useToast } from "@/hooks/use-toast";
import { trackAnalytics } from "@/lib/analytics";
import { addFourthwallCartItem } from "@/lib/fourthwall-cart";
import { useLocale } from "@/lib/locale";

const copy = {
  en: {
    back: "← Back to shop",
    eye: "FROM AIDA'S ANIMATED WORLD",
    option: "CHOOSE SIZE / OPTION",
    quantity: "QUANTITY",
    add: "ADD TO BASKET",
    adding: "ADDING…",
    added: "ADDED TO BASKET",
    unavailable: "Currently unavailable",
    missing: "This piece is no longer available.",
  },
  tr: {
    back: "← Mağazaya dön",
    eye: "AIDA'NIN ANİMASYON DÜNYASINDAN",
    option: "BOYUT / SEÇENEK",
    quantity: "ADET",
    add: "SEPETE EKLE",
    adding: "EKLENİYOR…",
    added: "SEPETE EKLENDİ",
    unavailable: "Şu anda mevcut değil",
    missing: "Bu ürün artık mevcut değil.",
  },
} as const;

export default function FourthwallProductDetail() {
  const [, params] = useRoute("/shop/fourthwall/:slug");
  const { locale } = useLocale();
  const text = copy[locale];
  const international = useInternationalProducts();
  const { toast } = useToast();
  const product = international.products.find(
    (item) => item.slug === params?.slug,
  );
  const available =
    product?.variants.filter((variant) => variant.available) || [];
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setVariantId(available[0]?.id || "");
    setQuantity(1);
  }, [product?.id]);
  usePageMeta(
    product ? `${product.name} | Aeda Art` : "Product | Aeda Art",
    product?.description || "Shop pieces from Aeda Art.",
  );
  if (international.loading)
    return (
      <div
        className="section-shell storefront-catalog-skeleton"
        aria-label="Loading product"
      />
    );
  if (!product)
    return (
      <section className="section-shell">
        <h1 className="text-5xl">{text.missing}</h1>
        <Link href="/shop" className="button-link mt-6">
          {text.back}
        </Link>
      </section>
    );
  const variant =
    available.find((item) => item.id === variantId) || available[0];
  const add = async () => {
    if (!variant || busy) return;
    setBusy(true);
    setError("");
    try {
      await addFourthwallCartItem({
        id: `fourthwall-${variant.id}`,
        variantId: variant.id,
        productId: product.id,
        title: product.name,
        format: locale === "tr" ? "Animasyon Ürünü" : "Animation Merch",
        variantName: variant.name,
        imageUrl: product.primaryImage?.url,
        quantity,
        unitAmountMinor: Math.round(variant.price.amount * 100),
        currency: variant.price.currency,
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
          variantId: variant.id,
          quantity,
        },
      });
      window.setTimeout(() => setAdded(false), 1800);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.missing);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="section-shell print-story-detail">
      <Link
        href="/shop?category=animation-merch"
        className="button-link print-story-detail__back"
      >
        {text.back}
      </Link>
      <div className="print-story-detail__layout">
        <div className="print-story-detail__media">
          <ProductImageLightbox
            images={(product.images.length
              ? product.images
              : product.primaryImage
                ? [product.primaryImage]
                : []
            ).map((image) => ({
              src: image.url,
              highResolutionSrc: image.url,
              alt: image.alt || product.name,
            }))}
          />
        </div>
        <article className="print-story-detail__story">
          <p className="eyebrow">{text.eye}</p>
          <h1>{product.name}</h1>
          {product.description && (
            <p className="print-story-detail__intro">{product.description}</p>
          )}
          {variant ? (
            <div className="standalone-fourthwall-purchase">
              {available.length > 1 && (
                <fieldset>
                  <legend>{text.option}</legend>
                  <div>
                    {available.map((item) => (
                      <label
                        key={item.id}
                        className={item.id === variant.id ? "is-selected" : ""}
                      >
                        <input
                          type="radio"
                          name="fourthwall-standalone-variant"
                          checked={item.id === variant.id}
                          onChange={() => setVariantId(item.id)}
                        />
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.price.formatted}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <strong className="standalone-fourthwall-purchase__price">
                {variant.price.formatted}
              </strong>
              <div className="international-formats__quantity">
                <span>{text.quantity}</span>
                <div>
                  <button
                    type="button"
                    disabled={quantity <= 1 || busy}
                    onClick={() =>
                      setQuantity((value) => Math.max(1, value - 1))
                    }
                  >
                    <Minus size={15} />
                  </button>
                  <strong>{quantity}</strong>
                  <button
                    type="button"
                    disabled={quantity >= 99 || busy}
                    onClick={() =>
                      setQuantity((value) => Math.min(99, value + 1))
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
              {error && (
                <p role="alert" className="international-formats__error">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <p className="international-formats__unavailable">
              {text.unavailable}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
