import { useEffect, useState } from "react";
import { ExternalLink, PackageCheck } from "lucide-react";
import { Link } from "wouter";
import InternationalProductCard from "@/components/InternationalProductCard";
import Money from "@/components/Money";
import EditorialPhotoFrame from "@/components/EditorialPhotoFrame";
import ManagedProductCard from "@/components/ManagedProductCard";
import TurkeyProductDialog from "@/components/TurkeyProductDialog";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useServerNow } from "@/hooks/use-server-now";
import { useShopSettings } from "@/hooks/use-shop-settings";
import {
  originalsCoverImage,
  printsCoverImage,
  mysteryMailCoverImage,
  heroPortrait,
} from "@/lib/assets";
import { getMysteryMailCountdown } from "@/lib/mystery-mail";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
import {
  setActiveShoppingRegion,
  type ManagedProduct,
  type ShoppingRegion,
} from "@/lib/store";
import { useLocale } from "@/lib/locale";
import { originalDetailHref } from "@/lib/market";
import StudioLetterSignup from "@/components/StudioLetterSignup";

const turkiyeFaq = [
  [
    "How is shipping handled within Türkiye?",
    "Shipping details and any cost are confirmed with Aida based on the selected products and delivery address.",
  ],
  [
    "How do I place an order?",
    "Add the pieces you want to your basket, then continue to WhatsApp. Your selected products, options and total are included automatically.",
  ],
  [
    "Can I order more than one product?",
    "Yes. You can combine available originals, prints, goods and Mystery Mail items in one basket.",
  ],
  [
    "Are original paintings one of a kind?",
    "Yes. Each original painting is unique and cannot be ordered again once sold.",
  ],
  [
    "Can prints be ordered framed?",
    "Selected art prints may be available framed or unframed. Available options and sizes appear when you open the product.",
  ],
  [
    "What is Mystery Mail?",
    "Mystery Mail is a limited one-time art parcel with an exclusive mini print, stickers and unrevealed studio surprises. It is not a subscription.",
  ],
  [
    "When does Mystery Mail close?",
    "Each edition has its own deadline. The active page shows the exact remaining time.",
  ],
  [
    "Can I order internationally from this page?",
    "The Türkiye shop is for delivery within Türkiye. International visitors should use the International shop.",
  ],
] as const;

const internationalFaq = [
  [
    "Can original paintings be shipped internationally?",
    "Yes. Available originals can be sent internationally. Shipping is calculated separately based on the destination.",
  ],
  [
    "Is international shipping included in the original’s price?",
    "No. The displayed original-art price excludes international shipping. Aida confirms the shipping cost after receiving the destination details.",
  ],
  [
    "How do I order an original painting?",
    "Select the artwork and continue through the order flow. Aida will personally confirm availability and international shipping details.",
  ],
  [
    "Where do I buy international prints and goods?",
    "International prints and merchandise are sold through Aida’s Fourthwall shop.",
  ],
  [
    "Why do Fourthwall products open on another website?",
    "Fourthwall handles payment, production and fulfilment for international print and merchandise orders.",
  ],
  [
    "Can I add a Fourthwall item and an original to the same basket?",
    "No. Originals are confirmed directly with Aida, while Fourthwall products are purchased through Fourthwall’s checkout.",
  ],
  [
    "Does Mystery Mail ship internationally?",
    "Mystery Mail is currently available only within Türkiye.",
  ],
] as const;

function sortedPreview(products: ManagedProduct[], region: ShoppingRegion) {
  return products
    .filter(
      (p) =>
        isPubliclyVisible(p) &&
        (region === "TR"
          ? p.availableInTurkiye !== false
          : p.availableInternationally !== false),
    )
    .sort((a, b) => {
      const availability = Number(isSoldOut(a)) - Number(isSoldOut(b));
      if (availability) return availability;
      return (
        Date.parse(b.updatedAt || "1970-01-01") -
        Date.parse(a.updatedAt || "1970-01-01")
      );
    })
    .slice(0, 8);
}

function ProductPreview({
  products,
  region,
  prints = false,
}: {
  products: ManagedProduct[];
  region: ShoppingRegion;
  prints?: boolean;
}) {
  const [selected, setSelected] = useState<ManagedProduct | null>(null);
  return products.length ? (
    <>
      <ul className="managed-product-grid mt-10">
        {products.map((product) => (
          <li key={product.id} className="flex min-w-0">
            <ManagedProductCard
              product={product}
              region={region}
              viewHref={
                prints
                  ? `/shop/turkiye/prints?product=${product.id}`
                  : originalDetailHref(
                      region === "TR" ? "turkiye" : "international",
                      product.slug || product.id,
                    )
              }
              onChooseOptions={() => setSelected(product)}
            />
          </li>
        ))}
      </ul>
      <TurkeyProductDialog
        product={selected}
        onClose={() => setSelected(null)}
      />
    </>
  ) : (
    <p className="mt-10 border border-ink/10 bg-card p-8">
      New pieces are being prepared for the shop.
    </p>
  );
}

function FAQ({
  items,
  international = false,
}: {
  items: readonly (readonly [string, string])[];
  international?: boolean;
}) {
  return (
    <section className="section-shell" aria-labelledby="faq-heading">
      <p className="eyebrow">Questions, answered</p>
      <h2 id="faq-heading" className="mt-3 text-4xl md:text-5xl">
        Frequently asked questions
      </h2>
      <div className="mt-8 border-t border-ink/15">
        {items.map(([question, answer]) => (
          <details key={question} className="group border-b border-ink/15">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between py-4 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-coral">
              {question}
              <span
                aria-hidden="true"
                className="text-coral group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-3xl pb-5 text-ink/65">{answer}</p>
          </details>
        ))}
      </div>
      {!international && (
        <Link href="/shop/international" className="button-link mt-7">
          Shopping from outside Türkiye? Visit the International shop →
        </Link>
      )}
    </section>
  );
}

function MysteryFeature() {
  const settings = useShopSettings();
  const now = useServerNow();
  const { locale } = useLocale();
  const edition = settings.studioMailPackages.find(
    (x) => x.id === settings.mysteryMail.activeEditionId,
  );
  if (settings.mysteryMail.storefrontMode === "not-available-yet" || !edition)
    return (
      <section className="bg-ochre/15">
        <div className="section-shell">
          <p className="eyebrow">The next mystery is forming</p>
          <h2 className="mt-3 text-4xl md:text-5xl">
            A new Mystery Mail is coming to the studio.
          </h2>
          <p className="mt-5 max-w-2xl text-ink/65">
            The next sealed edition is still being prepared. Follow Aida or join
            the Studio Letter to hear when it is revealed.
          </p>
          <a
            href={settings.siteLinks.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button-primary mt-7"
          >
            Follow the studio <ExternalLink size={15} />
          </a>
        </div>
      </section>
    );
  if (edition.status === "archived" || edition.status === "draft") return null;
  const remaining = Date.parse(edition.expiresAt || "") - now;
  const active =
    edition.status === "published" && edition.inventory > 0 && remaining > 0;
  const parts = getMysteryMailCountdown(remaining);
  const deadline = edition.expiresAt
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Istanbul",
      }).format(new Date(edition.expiresAt))
    : "the date shown on the edition page";
  const localizedTitle =
    locale === "tr" && edition.titleTr ? edition.titleTr : edition.title;
  const localizedTeaser =
    locale === "tr" && edition.shortDescriptionTr
      ? edition.shortDescriptionTr
      : edition.shortDescription;
  return (
    <section className="bg-ink text-paper">
      <div className="section-shell grid gap-10 lg:grid-cols-2 lg:items-center">
        <img
          src={mysteryMailCoverImage}
          alt="Mystery Mail sealed art parcel"
          className="aspect-[4/3] w-full object-cover"
        />
        <div>
          <p className="eyebrow !text-coral">Limited Mystery Mail</p>
          <h2 className="mt-3 text-4xl text-paper md:text-6xl">
            {localizedTitle}
          </h2>
          <p className="mt-5 text-paper/70">{localizedTeaser}</p>
          {active && (
            <>
              <Money
                baseAmountUsdCents={edition.priceUsdCents}
                canonicalCurrency="TRY"
                className="mt-5 block text-2xl font-bold"
              />
              <p className="eyebrow mt-7 !text-paper/60">Ends in</p>
              <div className="mt-3 grid grid-cols-2 border border-paper/15 sm:grid-cols-4">
                {Object.entries(parts).map(([label, value]) => (
                  <div
                    key={label}
                    className="border border-paper/10 p-3 text-center"
                  >
                    <span className="block font-serif text-3xl">
                      {String(value).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-paper/50">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {active && (
            <p className="sr-only">Orders close on {deadline} Istanbul time.</p>
          )}
          {active ? (
            <Link
              href="/shop/turkiye/mystery-mail"
              className="button-primary mt-7"
            >
              Discover the Mystery Mail
            </Link>
          ) : (
            <p className="mt-7 font-semibold text-paper/65">
              This edition has closed.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function RegionalLanding({
  region,
}: {
  region: ShoppingRegion;
}) {
  const tr = region === "TR";
  const settings = useShopSettings();
  const international = useInternationalProducts();
  useEffect(() => setActiveShoppingRegion(region), [region]);
  usePageMeta(
    tr
      ? "Aida Ramezani Türkiye Shop | Original Art, Prints & Mystery Mail"
      : "Aida Ramezani International Shop | Original Art & Prints",
    tr
      ? "Shop original oil pastel paintings, signed prints, art goods and limited Mystery Mail editions by Istanbul artist Aida Ramezani."
      : "Collect original oil pastel paintings by Aida Ramezani internationally, or shop prints and art goods through her Fourthwall store.",
  );
  const originals = sortedPreview(settings.originalProducts, region);
  const prints = sortedPreview(settings.printProducts, "TR");
  const base = tr ? "/shop/turkiye" : "/shop/international";
  return (
    <div>
      <section
        className={`regional-shop-hero regional-shop-hero--${tr ? "turkiye" : "international"}`}
      >
        <div className="section-shell regional-shop-hero__inner">
          <div className="regional-shop-hero__content">
            <p className="eyebrow">
              {tr ? "The Türkiye shop" : "International shop"}
            </p>
            <h1 className="regional-shop-hero__title">
              {tr
                ? "Art from Aida’s Istanbul studio, delivered across Türkiye."
                : "Collect Aida’s work wherever you are."}
            </h1>
            <p className="regional-shop-hero__description">
              {tr
                ? "Discover one-of-a-kind original paintings, signed prints, art goods and limited Mystery Mail editions. Every order is prepared personally by Aida."
                : "Explore original oil pastel paintings available for international delivery, or shop prints and art goods through Aida’s international Fourthwall store."}
            </p>
            <div className="regional-shop-hero__actions">
              <Link href={`${base}/originals`} className="button-primary">
                Explore original paintings
              </Link>
              <Link href={`${base}/prints`} className="button-secondary">
                {tr ? "Browse prints & goods" : "Shop prints & goods"}
              </Link>
            </div>
            {tr && (
              <Link
                href={`${base}/mystery-mail`}
                className="button-link regional-shop-hero__mystery-link"
              >
                See the current Mystery Mail →
              </Link>
            )}
            <p className="regional-shop-hero__trust">
              {tr
                ? "Personally confirmed on WhatsApp · Packed by the artist"
                : "Originals confirmed personally · International shipping calculated separately · Prints fulfilled through Fourthwall"}
            </p>
          </div>
          <div className="regional-shop-hero__visual">
            <EditorialPhotoFrame
              priority
              src={tr ? originalsCoverImage : heroPortrait}
              alt={
                tr
                  ? "An original artwork and certificate of authenticity packed in Aida Ramezani’s Istanbul studio"
                  : "Aida Ramezani holding an artwork in her Istanbul studio"
              }
              caption={
                tr
                  ? "Prepared personally in Aida’s Istanbul studio"
                  : "Aida in her Istanbul studio"
              }
              className="regional-shop-hero__main-photo"
            />
            <EditorialPhotoFrame
              src={tr ? printsCoverImage : originalsCoverImage}
              alt={
                tr
                  ? "Stacks of signed art prints prepared in the studio"
                  : "An original artwork being prepared with its certificate of authenticity"
              }
              caption={
                tr
                  ? "Signed prints, ready to collect"
                  : "Original works prepared for their journey"
              }
              className="regional-shop-hero__secondary-photo"
            />
          </div>
        </div>
      </section>
      {tr && <MysteryFeature />}
      <section className="section-shell">
        <p className="eyebrow">{tr ? "New from the studio" : "Original art"}</p>
        <h2 className="mt-3 text-4xl md:text-5xl">
          {tr
            ? "Latest original paintings"
            : "Original paintings available internationally"}
        </h2>
        <p className="mt-4 max-w-2xl text-ink/65">
          {tr
            ? "One-of-a-kind oil pastel works, signed by Aida and available only once."
            : "One-of-a-kind works sent from Aida’s Istanbul studio. International shipping is calculated separately after your location is confirmed."}
        </p>
        <ProductPreview products={originals} region={region} />
        <Link href={`${base}/originals`} className="button-primary mt-9">
          {tr ? "View all originals" : "View all original paintings"}
        </Link>
      </section>
      {tr ? (
        <section className="section-shell bg-ochre/10">
          <p className="eyebrow">Prints & goods</p>
          <h2 className="mt-3 text-4xl md:text-5xl">
            Art made easier to collect
          </h2>
          <p className="mt-4 text-ink/65">
            Signed prints, T-shirts, mugs and stickers featuring Aida’s studio
            artwork.
          </p>
          <ProductPreview products={prints} region="TR" prints />
          <Link href="/shop/turkiye/prints" className="button-primary mt-9">
            View all prints & goods
          </Link>
        </section>
      ) : (
        <section className="section-shell bg-ochre/10">
          <p className="eyebrow">International prints & goods</p>
          <h2 className="mt-3 text-4xl md:text-5xl">
            Studio art, fulfilled internationally
          </h2>
          <p className="mt-4 max-w-2xl text-ink/65">
            Browse prints, apparel and art goods available through Aida’s
            Fourthwall shop. Product payment, fulfilment and international
            delivery are completed securely on Fourthwall.
          </p>
          {international.loading ? (
            <div
              className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Loading international products"
            >
              {[1, 2, 3, 4].map((x) => (
                <div key={x} className="animate-pulse border border-ink/10">
                  <div className="aspect-square bg-ink/10" />
                  <div className="m-5 h-16 bg-ink/10" />
                </div>
              ))}
            </div>
          ) : international.products.length ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {international.products.slice(0, 8).map((p) => (
                <InternationalProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="mt-10 border border-ink/10 bg-card p-8">
              <h3 className="text-3xl">
                {international.error
                  ? "The international print shop is temporarily unavailable."
                  : "New international editions are being prepared."}
              </h3>
              <p className="mt-3 text-ink/60">
                {international.error
                  ? "The Fourthwall collection could not be loaded right now. You can still open the full international shop directly."
                  : "Follow the studio or check back soon for upcoming prints and art goods."}
              </p>
              {international.shopUrl && (
                <a
                  href={international.shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary mt-6"
                >
                  Open the Fourthwall shop <ExternalLink size={15} />
                </a>
              )}
            </div>
          )}
          <Link
            href="/shop/international/prints"
            className="button-primary mt-9"
          >
            View all prints & goods
          </Link>
        </section>
      )}
      <StudioLetterSignup
        variant="story-preview"
        context={tr ? "turkiye" : "international"}
      />
      {tr ? (
        <section className="section-shell">
          <p className="eyebrow">How collecting works</p>
          <h2 className="mt-3 text-4xl md:text-5xl">
            A personal way to collect
          </h2>
          <ol className="mt-9 grid gap-px bg-ink/10 md:grid-cols-3">
            {[
              [
                "01",
                "Choose your work",
                "Browse originals, prints, goods or the current Mystery Mail.",
              ],
              [
                "02",
                "Add it to your basket",
                "Select any available size, finish, colour or quantity.",
              ],
              [
                "03",
                "Confirm with Aida",
                "Continue to WhatsApp with your order already prepared for personal confirmation.",
              ],
            ].map(([n, h, p]) => (
              <li key={n} className="bg-card p-7">
                <span className="eyebrow text-coral">{n}</span>
                <h3 className="mt-3 text-2xl">{h}</h3>
                <p className="mt-3 text-ink/60">{p}</p>
              </li>
            ))}
          </ol>
          <p className="mt-7 flex gap-2 font-semibold">
            <PackageCheck aria-hidden="true" />
            No online checkout is required. Your order is confirmed directly
            with Aida before anything is prepared.
          </p>
        </section>
      ) : (
        <section className="section-shell">
          <p className="eyebrow">Ordering internationally</p>
          <h2 className="mt-3 text-4xl md:text-5xl">
            Two ways to collect internationally
          </h2>
          <div className="mt-9 grid gap-px bg-ink/10 md:grid-cols-2">
            <div className="bg-card p-8">
              <h3 className="text-3xl">Original paintings</h3>
              <p className="mt-4 leading-8 text-ink/65">
                Ordered directly from Aida · Product price excludes
                international shipping · Shipping quote confirmed after
                destination is provided · Personally packed in Istanbul ·
                Availability confirmed before final order
              </p>
            </div>
            <div className="bg-card p-8">
              <h3 className="text-3xl">Prints & goods</h3>
              <p className="mt-4 leading-8 text-ink/65">
                Purchased through Fourthwall · Payment completed on Fourthwall ·
                Fulfilled and shipped through Fourthwall · Availability and
                shipping shown there
              </p>
            </div>
          </div>
        </section>
      )}
      <FAQ items={tr ? turkiyeFaq : internationalFaq} international={!tr} />
      <section className="bg-coral text-paper">
        <div className="section-shell text-center">
          <h2 className="text-4xl text-paper md:text-6xl">
            {tr
              ? "Find something made for you."
              : "Choose how you would like to collect."}
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`${base}/originals`}
              className="button-primary !bg-paper !text-ink"
            >
              Explore original paintings
            </Link>
            <Link
              href={`${base}/prints`}
              className="button-secondary !border-paper !text-paper"
            >
              {tr
                ? "Browse prints & goods"
                : "Shop prints & goods internationally"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
