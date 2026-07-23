import { Link } from "wouter";
import { ArrowRight, MapPin } from "lucide-react";
import { loadShopSettings } from "@/lib/store";
import { studioMailImage } from "@/lib/assets";
import Money from "@/components/Money";

export default function StudioMailBanner() {
  const pkg = loadShopSettings().studioMailPackages.find(
    (item) => item.featured && item.status === "published",
  );
  if (!pkg) return null;

  return (
    <section className="section-shell grid gap-8 border-y border-ink/10 lg:grid-cols-2 lg:items-center">
      <img
        src={studioMailImage}
        alt="Aida packing Mystery Mail envelopes in her studio"
        loading="lazy"
        className="aspect-[4/3] w-full object-cover object-center"
      />
      <div>
        <p className="eyebrow">Mystery Mail · Limited edition</p>
        <h2 className="mt-3 text-4xl md:text-5xl">
          A small collection of art, packed by hand.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/70">
          {pkg.shortDescription}
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
          <MapPin size={16} /> Delivery within Türkiye only
        </p>
        <Money
          baseAmountUsdCents={pkg.priceUsdCents}
          canonicalCurrency="TRY"
          showBase
          className="mt-6 block font-sans text-2xl font-bold"
        />
        <Link href="/shop/turkiye/mystery-mail" className="button-primary mt-6">
          Explore Mystery Mail <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
