import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { useInternationalProducts } from "@/hooks/use-international";
import InternationalProductCard from "@/components/InternationalProductCard";

export default function InternationalPreview() {
  const { products, shopUrl, loading, error } = useInternationalProducts();
  return (
    <section className="section-shell border-y border-ink/10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="section-heading">
          <p className="eyebrow">International</p>
          <h2>Collect from outside Türkiye.</h2>
          <p>
            A selection of Aida’s products is available internationally through
            Fourthwall.
          </p>
        </div>
        <Link href="/shop/international" className="button-secondary">
          Explore the International Shop
        </Link>
      </div>
      {loading && (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((x) => (
            <div key={x} className="aspect-square animate-pulse bg-ink/10" />
          ))}
        </div>
      )}
      {!loading && products.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((x) => (
            <InternationalProductCard key={x.id} product={x} />
          ))}
        </div>
      )}
      {!loading && error && (
        <p className="mt-7 text-sm text-ink/55">
          The international preview is temporarily unavailable.
        </p>
      )}
      {shopUrl && (
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button-link mt-7"
        >
          Visit Fourthwall <ExternalLink size={14} />
        </a>
      )}
    </section>
  );
}
