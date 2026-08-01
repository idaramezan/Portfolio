import { useState } from "react";
import { Link, useRoute } from "wouter";
import ManagedProductCard from "@/components/ManagedProductCard";
import TurkeyProductDialog from "@/components/TurkeyProductDialog";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible } from "@/lib/product-status";
import type { Market } from "@/lib/market";
import type { ManagedProduct } from "@/lib/store";
import InternationalProductOption from "@/components/InternationalProductOption";

export default function PrintDetail({ market }: { market: Market }) {
  const [, params] = useRoute("/shop/:market/prints/:slug");
  const settings = useShopSettings();
  const [selected, setSelected] = useState<ManagedProduct | null>(null);
  const product = settings.printProducts.find(
    (item) =>
      (item.slug || item.id) === params?.slug &&
      isPubliclyVisible(item) &&
      (market === "turkiye"
        ? item.availableInTurkiye !== false
        : item.availableInternationally !== false),
  );
  usePageMeta(
    product ? `${product.name} — Art Print | Aida Ramezani` : "Print unavailable | Aida Ramezani",
    product?.description || "View prints and studio goods by Aida Ramezani.",
  );
  const base = `/shop/${market}/prints`;
  if (!product)
    return <section className="section-shell"><p className="eyebrow">Prints &amp; Studio Goods</p><h1 className="mt-4 text-5xl">This product is not available in this market.</h1><Link href={base} className="button-primary mt-7">Browse available products</Link></section>;

  return (
    <section className="section-shell">
      <Link href={base} className="button-link">← Back to prints &amp; goods</Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_.8fr]">
        <img src={product.imageUrl} alt={product.altText || product.name} className="w-full bg-ink/5 object-contain" />
        <div>
          <p className="eyebrow">Made from Aida’s original art</p>
          <ManagedProductCard product={product} region={market === "turkiye" ? "TR" : "INTERNATIONAL"} hideImage onChooseOptions={() => setSelected(product)} />
          {market === "turkiye" && <InternationalProductOption fourthwallProductId={product.fourthwallProductId} fourthwallProductUrl={product.fourthwallProductUrl} relationshipType={product.fourthwallLinkType} sourceProductId={product.id} sourceProductType={product.category || "print"} displayContext="product_page" />}
        </div>
      </div>
      <TurkeyProductDialog product={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
