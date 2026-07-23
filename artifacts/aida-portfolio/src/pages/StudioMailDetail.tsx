import { useRoute, Link } from "wouter";
import { Check, MapPin } from "lucide-react";
import Money from "@/components/Money";
import { mysteryMailCoverImage } from "@/lib/assets";
import { addItemToCart, loadShopSettings } from "@/lib/store";
export default function StudioMailDetail() {
  const [, p] = useRoute("/studio-mail/:slug");
  const pkg = loadShopSettings().studioMailPackages.find(
    (x) => x.slug === p?.slug,
  );
  if (!pkg)
    return (
      <div className="section-shell">
        <h1>Edition not found</h1>
        <Link href="/studio-mail" className="button-link mt-6">
          Browse Studio Mail
        </Link>
      </div>
    );
  const sold = pkg.status !== "published" || pkg.inventory < 1;
  return (
    <div>
      <section className="section-shell grid gap-10 lg:grid-cols-2">
        <div>
          <img
            src={mysteryMailCoverImage}
            alt={`${pkg.title} package`}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
        <div>
          <p className="eyebrow">One-time Studio Mail edition</p>
          <h1 className="mt-4 text-5xl md:text-6xl">{pkg.title}</h1>
          <p className="mt-3 text-lg text-ink/60">Theme: {pkg.theme}</p>
          <p className="mt-6 text-lg leading-relaxed text-ink/75">
            {pkg.fullDescription}
          </p>
          <Money
            baseAmountUsdCents={pkg.priceUsdCents}
            canonicalCurrency="TRY"
            showBase
            className="mt-7 block font-sans text-3xl font-bold"
          />
          <p className="mt-4 flex items-center gap-2 font-semibold text-coral">
            <MapPin size={18} />
            Delivery within Türkiye only
          </p>
          <button
            disabled={sold}
            onClick={() =>
              addItemToCart(
                {
                  id: pkg.id,
                  kind: "studio-mail",
                  title: pkg.title,
                  subtitle: pkg.theme,
                  imageUrl: mysteryMailCoverImage,
                  priceUsdCents: pkg.priceUsdCents,
                  quantity: 1,
                  maxQuantity: pkg.inventory,
                  shippingRestriction: pkg.shippingNote,
                },
                pkg.inventory,
              )
            }
            className="button-primary mt-7 w-full disabled:opacity-40"
          >
            {sold ? "Sold out" : "Add to basket"}
          </button>
          <p className="mt-3 text-sm text-ink/55">
            Limited quantities · Availability confirmed personally
          </p>
        </div>
      </section>
      <section className="bg-ink text-paper">
        <div className="section-shell">
          <p className="eyebrow !text-paper/60">Inside your envelope</p>
          <h2 className="mt-3 text-4xl">Everything in this edition.</h2>
          <div className="mt-8 grid gap-px bg-paper/20 sm:grid-cols-2">
            {pkg.contents.map((x) => (
              <div className="flex gap-3 bg-ink p-5" key={x}>
                <Check className="shrink-0 text-ochre" />
                <span>{x}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
