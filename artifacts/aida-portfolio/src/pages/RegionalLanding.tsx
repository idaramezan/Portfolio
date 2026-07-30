import { useEffect, useMemo, useState } from "react";
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
import { isPubliclyVisible } from "@/lib/product-status";
import {
  setActiveShoppingRegion,
  type ManagedProduct,
  type ShoppingRegion,
} from "@/lib/store";
import { useLocale } from "@/lib/locale";
import { originalDetailHref } from "@/lib/market";
import StudioLetterSignup from "@/components/StudioLetterSignup";
import IstanbulPaintingEventBanner from "@/components/IstanbulPaintingEventBanner";

const turkiyeFaq = [
  [
    "How is shipping handled within Türkiye?",
    "Shipping details and any cost are confirmed with Aida based on the selected products and delivery address.",
  ],
  [
    "How do I place an order?",
    "Add the pieces you want to your basket, continue to checkout, complete the bank transfer and upload your receipt for review.",
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
      return (
        Date.parse(b.updatedAt || "1970-01-01") -
        Date.parse(a.updatedAt || "1970-01-01")
      );
    });
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
        {products.slice(0, 6).map((product) => (
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
            {locale === "tr"
              ? "Bir sonraki mühürlü edisyon duyurulduğunda ilk sen haberdar ol."
              : "Be the first to hear when the next sealed edition is revealed."}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <a href="#studio-letter" className="button-primary">
              {locale === "tr"
                ? "Bültene katıl"
                : "Join the Newsletter"}
            </a>
            {settings.siteLinks.instagramUrl && (
              <a
                href={settings.siteLinks.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button-link text-sm"
              >
                {locale === "tr"
                  ? "Instagram’da takip et"
                  : "Follow on Instagram"}{" "}
                <ExternalLink size={14} />
              </a>
            )}
          </div>
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

type TurkiyeCategory = "all" | "originals" | "prints" | "stickers" | "goods" | "mystery-mail";
type TurkiyeSort = "newest" | "price-low" | "price-high" | "name";

const turkiyeCatalogueCopy = {
  en: {
    eyebrow: "Türkiye Shop",
    heading: "Art available in Türkiye",
    description: "Original paintings, signed prints, stickers and Mystery Mail, with free delivery across Türkiye.",
    utility: "Shopping in Türkiye",
    change: "Change",
    categories: { all: "All", originals: "Originals", prints: "Prints", stickers: "Stickers", goods: "Goods", "mystery-mail": "Mystery Mail" },
    results: "Available from the studio",
    showing: "currently available pieces",
    sort: "Sort products",
    newest: "Newest",
    low: "Price: low to high",
    high: "Price: high to low",
    name: "Name",
    empty: "No products are currently available in this category.",
    orderTitle: "A personal order, kept simple.",
    orderBody: "Choose a piece or product, review your basket, enter delivery details, complete the bank transfer and upload the receipt. You will receive order updates by email.",
    faqTitle: "Before you order",
  },
  tr: {
    eyebrow: "Türkiye Mağazası",
    heading: "Türkiye’de mevcut sanat eserleri",
    description: "Orijinal resimler, imzalı baskılar, stickerlar ve Mystery Mail; Türkiye’nin her yerine ücretsiz teslimatla.",
    utility: "Türkiye’den alışveriş",
    change: "Değiştir",
    categories: { all: "Tümü", originals: "Orijinaller", prints: "Baskılar", stickers: "Stickerlar", goods: "Ürünler", "mystery-mail": "Mystery Mail" },
    results: "Atölyeden mevcut ürünler",
    showing: "ürün şu anda mevcut",
    sort: "Ürünleri sırala",
    newest: "En yeni",
    low: "Fiyat: düşükten yükseğe",
    high: "Fiyat: yüksekten düşüğe",
    name: "İsim",
    empty: "Bu kategoride şu anda mevcut ürün yok.",
    orderTitle: "Kişisel ve kolay bir sipariş.",
    orderBody: "Eserini veya ürününü seç, sepetini gözden geçir, teslimat bilgilerini gir, banka transferini tamamla ve dekontu yükle. Sipariş güncellemelerini e-postayla alırsın.",
    faqTitle: "Sipariş vermeden önce",
  },
} as const;

function activeMystery(settings: ReturnType<typeof useShopSettings>, now: number) {
  const edition = settings.studioMailPackages.find((item) => item.id === settings.mysteryMail.activeEditionId);
  if (!edition || settings.mysteryMail.storefrontMode === "not-available-yet") return null;
  const remaining = Date.parse(edition.expiresAt || "") - now;
  return edition.status === "published" && edition.inventory > 0 && remaining > 0 ? edition : null;
}

function CompactMysteryFeature({ edition }: { edition: NonNullable<ReturnType<typeof activeMystery>> }) {
  const { locale } = useLocale();
  const title = locale === "tr" && edition.titleTr ? edition.titleTr : edition.title;
  const description = locale === "tr" && edition.shortDescriptionTr ? edition.shortDescriptionTr : edition.shortDescription;
  return (
    <section className="turkiye-catalogue__mystery section-shell" aria-labelledby="turkiye-mystery-heading">
      <div className="turkiye-catalogue__mystery-content">
        <p className="eyebrow">{locale === "tr" ? "Sınırlı stüdyo edisyonu" : "Limited studio edition"}</p>
        <h2 id="turkiye-mystery-heading" className="mt-2 text-3xl md:text-4xl">{title}</h2>
        <p className="mt-3 text-sm text-ink/65">{description}</p>
        <div className="turkiye-catalogue__mystery-action">
          <Money baseAmountUsdCents={edition.priceUsdCents} canonicalCurrency="TRY" className="font-bold" />
          <Link href="/shop/turkiye/mystery-mail" className="button-link">{locale === "tr" ? "Mystery Mail’i keşfet" : "Discover Mystery Mail"} →</Link>
        </div>
      </div>
    </section>
  );
}

function TurkiyeCatalogue() {
  const settings = useShopSettings();
  const now = useServerNow();
  const { locale } = useLocale();
  const text = turkiyeCatalogueCopy[locale];
  const [selected, setSelected] = useState<ManagedProduct | null>(null);
  const readState = () => {
    const query = new URLSearchParams(window.location.search);
    return {
      category: (query.get("category") || "all") as TurkiyeCategory,
      sort: (query.get("sort") || "newest") as TurkiyeSort,
    };
  };
  const [urlState, setUrlState] = useState(readState);
  useEffect(() => {
    const sync = () => setUrlState(readState());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const originals = settings.originalProducts.filter((product) => isPubliclyVisible(product) && product.availableInTurkiye !== false);
  const printProducts = settings.printProducts.filter((product) => isPubliclyVisible(product) && product.availableInTurkiye !== false);
  const mystery = activeMystery(settings, now);
  const availableCategories = useMemo(() => {
    const values: TurkiyeCategory[] = ["all"];
    if (originals.length) values.push("originals");
    if (printProducts.some((product) => (product.category || "print") === "print")) values.push("prints");
    if (printProducts.some((product) => product.category === "sticker")) values.push("stickers");
    if (printProducts.some((product) => product.category === "tshirt" || product.category === "mug")) values.push("goods");
    if (mystery) values.push("mystery-mail");
    return values;
  }, [originals, printProducts, mystery]);
  const activeCategory = availableCategories.includes(urlState.category) ? urlState.category : "all";
  const products = useMemo(() => {
    const all = [...originals, ...printProducts].filter((product) => {
      if (activeCategory === "all") return true;
      if (activeCategory === "originals") return product.kind === "original";
      if (activeCategory === "prints") return product.kind !== "original" && (product.category || "print") === "print";
      if (activeCategory === "stickers") return product.category === "sticker";
      if (activeCategory === "goods") return product.category === "tshirt" || product.category === "mug";
      return false;
    });
    return all.sort((a, b) => {
      if (urlState.sort === "price-low") return a.priceUsdCents - b.priceUsdCents;
      if (urlState.sort === "price-high") return b.priceUsdCents - a.priceUsdCents;
      if (urlState.sort === "name") return a.name.localeCompare(b.name, locale);
      return Date.parse(b.updatedAt || "1970-01-01") - Date.parse(a.updatedAt || "1970-01-01");
    });
  }, [originals, printProducts, activeCategory, urlState.sort, locale]);
  const categoryHref = (category: TurkiyeCategory) => {
    const query = new URLSearchParams();
    if (category !== "all") query.set("category", category);
    if (urlState.sort !== "newest") query.set("sort", urlState.sort);
    return `/shop/turkiye${query.size ? `?${query}` : ""}`;
  };
  const changeSort = (sort: TurkiyeSort) => {
    const query = new URLSearchParams(window.location.search);
    if (sort === "newest") query.delete("sort"); else query.set("sort", sort);
    const href = `/shop/turkiye${query.size ? `?${query}` : ""}`;
    window.history.pushState({}, "", href);
    setUrlState(readState());
  };
  const faq = locale === "tr" ? [
    ["Siparişimi nasıl tamamlarım?", "Ürünleri sepete ekle, teslimat bilgilerini gir, banka transferini tamamla ve ödeme dekontunu yükle."],
    ["Türkiye içinde teslimat nasıl yapılır?", "Orijinaller ücretsiz gönderilir. Baskı teslimatı ilk baskı için 200 TL, her ek baskı için 20 TL’dir."],
    ["Orijinal eserler tek mi?", "Evet. Her orijinal eser benzersizdir ve satıldıktan sonra yeniden sipariş edilemez."],
  ] as const : turkiyeFaq.slice(0, 3);

  return (
    <div className="turkiye-catalogue">
      <IstanbulPaintingEventBanner placement="turkiye-shop" compact />
      <header className="section-shell turkiye-catalogue__intro">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.heading}</h1>
        <p>{text.description}</p>
        <div className="turkiye-catalogue__market"><span>{text.utility}</span><Link href="/">{text.change}</Link></div>
      </header>
      <div className="turkiye-catalogue__controls">
        <nav className="section-shell shop-category-tabs" aria-label={locale === "tr" ? "Ürün kategorileri" : "Product categories"}>
          {availableCategories.map((category) => (
            <Link key={category} href={categoryHref(category)} onClick={() => setUrlState({ ...urlState, category })} aria-current={activeCategory === category ? "page" : undefined}>{text.categories[category]}</Link>
          ))}
        </nav>
      </div>
      {mystery && (activeCategory === "all" || activeCategory === "mystery-mail") && <CompactMysteryFeature edition={mystery} />}
      {activeCategory !== "mystery-mail" && (
        <section className="section-shell turkiye-catalogue__products" aria-labelledby="turkiye-products-heading">
          <div className="turkiye-catalogue__results-head">
            <div><p className="eyebrow">{text.results}</p><h2 id="turkiye-products-heading">{products.length} {text.showing}</h2></div>
            <label><span>{text.sort}</span><select value={urlState.sort} onChange={(event) => changeSort(event.target.value as TurkiyeSort)}><option value="newest">{text.newest}</option><option value="price-low">{text.low}</option><option value="price-high">{text.high}</option><option value="name">{text.name}</option></select></label>
          </div>
          {products.length ? <div className="managed-product-grid">{products.map((product) => <ManagedProductCard key={`${product.kind}-${product.id}`} product={product} region="TR" viewHref={product.kind === "original" ? originalDetailHref("turkiye", product.slug || product.id) : undefined} onView={product.kind === "original" ? undefined : () => setSelected(product)} onChooseOptions={() => setSelected(product)} />)}</div> : <p className="turkiye-catalogue__empty">{text.empty}</p>}
        </section>
      )}
      <section className="turkiye-catalogue__ordering"><div className="section-shell"><PackageCheck aria-hidden="true" /><div><p className="eyebrow">Secure checkout</p><h2>{text.orderTitle}</h2><p>{text.orderBody}</p></div></div></section>
      <section className="section-shell turkiye-catalogue__faq"><p className="eyebrow">FAQ</p><h2>{text.faqTitle}</h2><div>{faq.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div><Link href="/shop/international" className="button-link">{locale === "tr" ? "Türkiye dışında mı alışveriş yapıyorsun? Uluslararası mağazaya git" : "Shopping outside Türkiye? Visit the International shop"} →</Link></section>
      <TurkeyProductDialog product={selected} onClose={() => setSelected(null)} />
    </div>
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
  if (tr) return <TurkiyeCatalogue />;
  return (
    <div>
      <IstanbulPaintingEventBanner
        placement={tr ? "turkiye-shop" : "international-shop"}
      />
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
              <Link href={`${base}/prints`} className="button-primary">
                {tr ? "Browse prints & goods" : "Shop prints & goods"}
              </Link>
              <Link href={`${base}/originals`} className="button-secondary">
                Explore original paintings
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
                ? "Bank-transfer checkout · Packed by the artist"
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
          {prints.length > 6 && (
            <Link href="/shop/turkiye/prints" className="button-primary mt-9">
              See more prints & goods
            </Link>
          )}
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
              {[1, 2, 3, 4, 5, 6].map((x) => (
                <div key={x} className="animate-pulse border border-ink/10">
                  <div className="aspect-square bg-ink/10" />
                  <div className="m-5 h-16 bg-ink/10" />
                </div>
              ))}
            </div>
          ) : international.products.length ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-6 lg:grid-cols-3">
              {international.products.slice(0, 6).map((p) => (
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
          {international.products.length > 6 && (
            <Link
              href="/shop/international/prints"
              className="button-primary mt-9"
            >
              See more prints & goods
            </Link>
          )}
        </section>
      )}
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
        {originals.length > 6 && (
          <Link href={`${base}/originals`} className="button-primary mt-9">
            {tr ? "See more originals" : "See more original paintings"}
          </Link>
        )}
      </section>
      <StudioLetterSignup
        variant="story-preview"
        context={tr ? "turkiye" : "international"}
      />
      {tr && (
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
                "Enter delivery details, complete the bank transfer and upload the receipt for review.",
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
      )}
      <FAQ items={tr ? turkiyeFaq : internationalFaq} international={!tr} />
      {tr && <section className="bg-coral text-paper">
        <div className="section-shell text-center">
          <h2 className="text-4xl text-paper md:text-6xl">
            Find something made for you.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`${base}/prints`}
              className="button-primary !bg-paper !text-ink"
            >
              Browse prints & goods
            </Link>
            <Link
              href={`${base}/originals`}
              className="button-secondary !border-paper !text-paper"
            >
              Explore original paintings
            </Link>
          </div>
        </div>
      </section>}
    </div>
  );
}
