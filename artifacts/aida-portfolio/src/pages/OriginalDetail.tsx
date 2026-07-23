import { Link, useRoute } from "wouter";
import ManagedProductCard from "@/components/ManagedProductCard";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isPubliclyVisible } from "@/lib/product-status";
import type { Market } from "@/lib/market";

export default function OriginalDetail({ market }: { market: Market }) {
  const [, params] = useRoute("/shop/:market/originals/:slug");
  const settings = useShopSettings();
  const product = settings.originalProducts.find((item) =>
    (item.slug || item.id) === params?.slug && isPubliclyVisible(item) &&
    (market === "turkiye" ? item.availableInTurkiye !== false : item.availableInternationally !== false));
  usePageMeta(product ? `${product.name} — Original Painting | Aida Ramezani` : "Original painting unavailable | Aida Ramezani", product?.description || "View original paintings by Aida Ramezani.");
  const base = `/shop/${market}/originals`;
  if (!product) return <section className="section-shell"><p className="eyebrow">Original painting</p><h1 className="mt-4 text-5xl">This work is not available in this market.</h1><Link href={base} className="button-primary mt-7">Browse available originals</Link></section>;
  return <section className="section-shell"><Link href={base} className="button-link">← Back to originals</Link><div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_.8fr]"><img src={product.imageUrl} alt={product.altText || product.name} className="w-full bg-ink/5 object-contain"/><div><p className="eyebrow">One-of-one original</p><ManagedProductCard product={product} region={market === "turkiye" ? "TR" : "INTERNATIONAL"}/><p className="mt-5 text-sm text-ink/60">Certificate of authenticity included. {market === "turkiye" ? "Free delivery within Türkiye." : "International shipping is quoted separately after your destination is confirmed."}</p></div></div></section>;
}
