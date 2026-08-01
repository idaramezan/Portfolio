import { useMemo, useState } from "react";
import { ExternalLink, Search, Trash2 } from "lucide-react";
import { useInternationalProducts } from "@/hooks/use-international";
import type { ManagedProduct } from "@/lib/store";
import type { FourthwallLinkType } from "@/lib/international-option-copy";

const field = "mt-2 h-11 w-full border border-ink/15 bg-paper px-3 text-sm";

export default function FourthwallProductConnection({ product, onChange }: { product: ManagedProduct; onChange: (patch: Partial<ManagedProduct>) => void }) {
  const international = useInternationalProducts();
  const [search, setSearch] = useState("");
  const options = useMemo(() => international.products.filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [international.products, search]);
  const linked = international.products.find((item) => item.id === product.fourthwallProductId);
  const relationship = (product.fourthwallLinkType || "exact") as FourthwallLinkType;
  const connect = (id: string) => {
    const selected = international.products.find((item) => item.id === id);
    onChange(selected ? { fourthwallProductId: selected.id, fourthwallProductUrl: selected.externalUrl, fourthwallLinkType: product.fourthwallLinkType || "exact" } : { fourthwallProductId: undefined, fourthwallProductUrl: undefined, fourthwallLinkType: undefined });
  };
  const remove = () => onChange({ fourthwallProductId: undefined, fourthwallProductUrl: undefined, fourthwallLinkType: undefined });

  return (
    <section className="border-b border-ink/10 pb-7">
      <h2 className="text-lg font-bold">International availability <span className="font-normal text-ink/45">/ Uluslararası erişim</span></h2>
      <p className="mt-2 text-sm text-ink/60">Optionally connect this Türkiye product to a product in your Fourthwall shop.</p>
      <p className="mt-1 text-xs text-ink/45">Bu Türkiye ürününü isteğe bağlı olarak Fourthwall mağazanızdaki bir ürüne bağlayın.</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold"><span className="flex items-center gap-2"><Search size={15} aria-hidden="true" />Search Fourthwall products</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={field} placeholder="Search by product title" /></label>
        <label className="text-sm font-semibold">Fourthwall product<select value={product.fourthwallProductId || ""} onChange={(event) => connect(event.target.value)} className={field} disabled={international.loading || international.error}><option value="">No connection</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {product.fourthwallProductId && <label className="text-sm font-semibold">Relationship type<select value={relationship} onChange={(event) => onChange({ fourthwallLinkType: event.target.value as FourthwallLinkType })} className={field}><option value="exact">Exact product</option><option value="edition">International edition</option><option value="related">Related product</option></select></label>}
      </div>
      {international.loading && <div className="mt-5 h-28 animate-pulse bg-ink/5" aria-label="Loading Fourthwall products" />}
      {international.error && <p role="alert" className="mt-5 border border-warning/30 bg-[#fff5dc] p-4 text-sm font-semibold text-warning">Fourthwall products could not be loaded. The saved connection has not been changed.</p>}
      {product.fourthwallProductId && !international.loading && !linked && <p role="alert" className="mt-5 border border-warning/30 bg-[#fff5dc] p-4 text-sm font-semibold text-warning">The linked Fourthwall product is unavailable or unpublished. The local product is safe; its public international card will only appear when a usable saved URL is available.</p>}
      {linked && <article className="mt-5 grid gap-4 border border-ink/10 bg-[#e8f2f7] p-4 sm:grid-cols-[88px_1fr]">
        <div className="aspect-square bg-paper">{linked.primaryImage ? <img src={linked.primaryImage.url} alt={linked.primaryImage.alt} className="h-full w-full object-contain" /> : null}</div>
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-ink/45">Fourthwall product · {linked.soldOut ? "Sold out" : linked.available ? "Available" : "Unavailable"}</p><h3 className="mt-1 text-xl">{linked.name}</h3><p className="mt-1 font-bold">{new Set(linked.variants.map((variant) => variant.price.formatted)).size > 1 ? "From " : ""}{linked.price.formatted}</p><p className="mt-1 text-xs text-ink/55">Relationship: {{ exact: "Exact product", edition: "International edition", related: "Related product" }[relationship]}</p><a href={linked.externalUrl} target="_blank" rel="noopener noreferrer" className="button-link mt-3 inline-flex items-center gap-1">Open Fourthwall product <ExternalLink size={14} /></a></div>
      </article>}
      {product.fourthwallProductId && <button type="button" onClick={remove} className="button-secondary mt-4 inline-flex items-center gap-2"><Trash2 size={15} aria-hidden="true" />Remove connection</button>}
    </section>
  );
}
