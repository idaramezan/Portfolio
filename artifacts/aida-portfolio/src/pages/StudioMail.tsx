import { Link } from "wouter";
import { MapPin, Package } from "lucide-react";
import Money from "@/components/Money";
import { mysteryMailCoverImage } from "@/lib/assets";
import { addItemToCart, loadShopSettings } from "@/lib/store";

export default function StudioMail() {
  const packages = loadShopSettings()
    .studioMailPackages.filter(
      (x) => x.status === "published" || x.status === "sold_out",
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div>
      <section className="section-shell pb-10">
        <p className="eyebrow">Direct collecting · Türkiye</p>
        <h1 className="mt-4 max-w-5xl text-[clamp(3.2rem,7vw,6.6rem)] leading-[.92]">
          Small packages of art, each built around a different theme.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
          Choose from limited Studio Mail editions containing an art postcard, a
          handwritten note, stickers, and small objects selected around each
          theme.
        </p>
        <p className="mt-5 font-semibold">
          One-time selection · Limited quantities · Delivery within Türkiye only
        </p>
        <a href="#editions" className="button-primary mt-7">
          View available editions
        </a>
      </section>
      <section id="editions" className="section-shell pt-8">
        <div className="grid gap-7 md:grid-cols-2">
          {packages.map((pkg) => {
            const sold = pkg.status === "sold_out" || pkg.inventory === 0;
            return (
              <article
                key={pkg.id}
                className="grid border border-ink/10 bg-card sm:grid-cols-[.9fr_1.1fr]"
              >
                <img
                  src={mysteryMailCoverImage}
                  alt={`${pkg.title} Studio Mail package`}
                  className="h-full min-h-72 w-full object-cover"
                />
                <div className="flex flex-col p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="badge">Limited edition</span>
                    <span className="badge !bg-coral/10">
                      <MapPin size={12} /> Türkiye only
                    </span>
                  </div>
                  <p className="eyebrow mt-6">{pkg.theme}</p>
                  <h2 className="mt-2 text-3xl">{pkg.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/65">
                    {pkg.shortDescription}
                  </p>
                  <div className="mt-6 flex items-end justify-between">
                    <Money
                      baseAmountUsdCents={pkg.priceUsdCents}
                      canonicalCurrency="TRY"
                      showBase
                      className="font-sans text-2xl font-bold"
                    />
                    <span className="text-sm font-semibold">
                      {sold
                        ? "Sold out"
                        : pkg.showExactInventory &&
                            pkg.inventory <= pkg.lowStockThreshold
                          ? `Only ${pkg.inventory} left`
                          : "Available"}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/studio-mail/${pkg.slug}`}
                      className="button-secondary"
                    >
                      View package
                    </Link>
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
                      className="button-primary disabled:opacity-40"
                    >
                      {sold ? "Sold out" : "Add to basket"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {packages.length === 0 && (
          <div className="border border-ink/10 p-10 text-center">
            <h2 className="text-3xl">New editions are being prepared.</h2>
            <p className="mt-3 text-ink/65">
              Join the Studio Letter to hear when they arrive.
            </p>
          </div>
        )}
      </section>
      <section className="bg-ink text-paper">
        <div className="section-shell">
          <p className="eyebrow !text-paper/60">How it works</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              [
                "01",
                "Choose an edition",
                "Select the Studio Mail theme you want.",
              ],
              [
                "02",
                "Packed by hand",
                "Aida prepares your package in the studio.",
              ],
              [
                "03",
                "Delivered within Türkiye",
                "Your package is sent to your chosen Turkish address after details are confirmed on WhatsApp.",
              ],
            ].map((x) => (
              <div key={x[0]} className="border-t border-paper/20 pt-5">
                <span className="text-ochre">{x[0]}</span>
                <h2 className="mt-5 text-2xl">{x[1]}</h2>
                <p className="mt-2 text-paper/65">{x[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
