import { useEffect, useState } from "react";
import { ExternalLink, PackageCheck, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import Money from "@/components/Money";
import InternationalProductCard from "@/components/InternationalProductCard";
import TurkeyProductDialog from "@/components/TurkeyProductDialog";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useToast } from "@/hooks/use-toast";
import {
  addItemToCart,
  setActiveShoppingRegion,
  type ManagedProduct,
  type ShoppingRegion,
} from "@/lib/store";
import { useShopSettings } from "@/hooks/use-shop-settings";
import {
  getPrintStartingPrice,
  formatPrintSize,
  type TurkeyProductCategory,
} from "@/lib/turkiye-products";
import {
  isPubliclyVisible,
  isPurchasable,
  isSoldOut,
} from "@/lib/product-status";
import { formatArtworkSurface } from "@/lib/artwork-surface";
import ManagedProductCard from "@/components/ManagedProductCard";
import { originalDetailHref } from "@/lib/market";

export type ShopCategory = "originals" | "prints" | "mystery-mail";

const copy = {
  TR: {
    eyebrow: "Türkiye Shop",
    heading: "Art collected directly from Aida’s Istanbul studio.",
    description:
      "Browse original paintings, Prints & Goods and the current Mystery Mail. Every selection is confirmed personally with Aida.",
  },
  INTERNATIONAL: {
    eyebrow: "International Shop",
    heading: "Two ways to collect from outside Türkiye.",
    description:
      "Choose an original painting directly from Aida or shop international print editions through Fourthwall.",
  },
} as const;

export function ShopPageHeader({ region }: { region: ShoppingRegion }) {
  return (
    <section className="section-shell !pb-8">
      <p className="eyebrow">{copy[region].eyebrow}</p>
      <h1 className="mt-4 max-w-5xl text-5xl md:text-7xl">
        {copy[region].heading}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
        {copy[region].description}
      </p>
      {region === "TR" ? (
        <div className="shipping-banner !mx-0 !mt-8 !max-w-none">
          <PackageCheck aria-hidden="true" />
          <p>
            <strong>Free shipping within Türkiye</strong>
            <br />
            Add your chosen pieces to the Collection Basket, then continue on
            WhatsApp to confirm availability and details.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-px bg-ink/10 sm:grid-cols-2">
          <div className="bg-card p-5">
            <p className="eyebrow">Originals</p>
            <p className="mt-2 text-sm">
              Collected directly from Aida. Shipping is calculated separately
              for your destination.
            </p>
          </div>
          <div className="bg-card p-5">
            <p className="eyebrow">Prints</p>
            <p className="mt-2 text-sm">
              Ordered, paid for and fulfilled through Fourthwall.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function LocalProductCard({
  product,
  region,
  onViewImage,
}: {
  product: ManagedProduct;
  region: ShoppingRegion;
  onViewImage: () => void;
}) {
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const { toast } = useToast();
  const available = isPurchasable(product);
  const soldOut = isSoldOut(product);
  const add = () => {
    const result = addItemToCart(
      {
        id: `original-${product.id}`,
        kind: "original",
        title: product.name,
        subtitle: product.dimension,
        imageUrl: product.imageUrl,
        priceUsdCents: product.priceUsdCents,
        quantity: 1,
        maxQuantity: 1,
      },
      1,
      region,
    );
    if (result.ok) {
      setMessage("");
      setAdded(true);
      toast({
        title: "Added to the basket",
        description: product.name,
        duration: 3000,
        className: "border-green/30 bg-[#edf6ed] text-ink",
      });
      window.setTimeout(() => setAdded(false), 2500);
    } else {
      setMessage(result.reason || "Unable to add this artwork.");
    }
  };
  return (
    <article className="relative border border-ink/10 bg-card">
      <button
        type="button"
        onClick={onViewImage}
        className="group block w-full overflow-hidden bg-ink/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2"
        aria-label={`View full-size image of ${product.name}`}
      >
        <img
          src={product.imageUrl}
          alt={product.altText || product.name}
          className={`aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${soldOut ? "opacity-65 grayscale-[.65]" : ""}`}
        />
      </button>
      <div className="p-6">
        <div className="flex flex-wrap gap-2">
          <span className="badge">Certificate included</span>
          <span className="badge">
            {soldOut ? "SOLD OUT" : available ? "Available" : "Unavailable"}
          </span>
        </div>
        <h2 className="mt-5 text-3xl">{product.name}</h2>
        <p className="mt-3 text-[.68rem] font-bold uppercase tracking-[.16em] text-ink/50">
          {formatArtworkSurface(product.artworkSurface)}
        </p>
        <p className="mt-2 text-sm text-ink/55">{product.dimension}</p>
        <Money
          baseAmountUsdCents={product.priceUsdCents}
          showBase
          className="mt-5 block font-sans text-2xl font-bold"
        />
        {region === "TR" ? (
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-green">
            <PackageCheck size={17} aria-hidden="true" />
            Free shipping within Türkiye
          </p>
        ) : (
          <p className="mt-4 text-sm font-semibold text-ink/60">
            International shipping is not included.
          </p>
        )}
        <button
          type="button"
          disabled={!available || added}
          onClick={add}
          className={`button-primary mt-5 w-full disabled:opacity-70 ${added ? "!bg-green !text-paper" : ""}`}
        >
          {added
            ? "Added to the basket"
            : soldOut
              ? "Sold out"
              : "Add to collection"}
        </button>
        <p aria-live="polite" className="mt-3 text-xs font-semibold text-coral">
          {message}
        </p>
      </div>
    </article>
  );
}

export default function RegionalShop({
  region,
  category,
}: {
  region: ShoppingRegion;
  category: ShopCategory;
}) {
  const settings = useShopSettings();
  const [selected, setSelected] = useState<ManagedProduct | null>(null);
  const [selectedTurkeyProduct, setSelectedTurkeyProduct] =
    useState<ManagedProduct | null>(null);
  useLocation();
  const [filterSearch, setFilterSearch] = useState(
    () => window.location.search,
  );
  const international = useInternationalProducts();
  const slug = region === "TR" ? "turkiye" : "international";
  usePageMeta(
    region === "TR"
      ? "Türkiye Shop — Aida Ramezani"
      : "International Shop — Aida Ramezani",
    region === "TR"
      ? "Shop original oil pastel paintings, Prints & Goods and Mystery Mail from Aida Ramezani with free shipping within Türkiye."
      : "Collect original paintings directly from Aida Ramezani or shop international prints through Fourthwall.",
  );
  useEffect(() => {
    setActiveShoppingRegion(region);
    const requested = new URLSearchParams(window.location.search).get(
      "product",
    );
    if (requested) {
      if (category === "prints")
        setSelectedTurkeyProduct(
          settings.printProducts.find((product) => product.id === requested) ||
            null,
        );
      else
        setSelected(
          settings.originalProducts.find(
            (product) => product.id === requested,
          ) || null,
        );
    }
  }, [region]);

  const originals = settings.originalProducts.filter(
    (product) =>
      isPubliclyVisible(product) &&
      (region === "TR"
        ? product.availableInTurkiye !== false
        : product.availableInternationally !== false),
  );
  const filterValues: TurkeyProductCategory[] = [
    "tshirt",
    "mug",
    "print",
    "sticker",
  ];
  useEffect(() => {
    const sync = () => setFilterSearch(window.location.search);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const requestedFilter = new URLSearchParams(filterSearch).get(
    "category",
  ) as TurkeyProductCategory | null;
  const activeFilter =
    requestedFilter && filterValues.includes(requestedFilter)
      ? requestedFilter
      : null;
  const products = settings.printProducts
    .filter(
      (product) =>
        isPubliclyVisible(product) && product.availableInTurkiye !== false,
    )
    .filter(
      (product) =>
        !activeFilter || (product.category || "print") === activeFilter,
    )
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <div>
      <ShopPageHeader region={region} />
      <section className="section-shell !pt-10">
        {category === "originals" &&
          (originals.length ? (
            <div className="managed-product-grid">
              {originals.map((product) => (
                <ManagedProductCard
                  key={product.id}
                  product={product}
                  region={region}
                  viewHref={originalDetailHref(region === "TR" ? "turkiye" : "international", product.slug || product.id)}
                />
              ))}
            </div>
          ) : (
            <p className="border border-ink/10 bg-card p-10 text-center">
              {region === "TR"
                ? "No originals are currently available."
                : "No originals are currently available for international collecting."}
            </p>
          ))}
        {region === "TR" && category === "prints" && (
          <>
            <div className="mb-10">
              <p className="eyebrow">Prints & Studio Goods</p>
              <h2 className="mt-3 text-4xl md:text-5xl">
                Art made to live with.
              </h2>
              <p className="mt-4 max-w-2xl text-ink/65">
                Browse signed prints and small studio goods prepared by Aida,
                including T-shirts, mugs and stickers.
              </p>
              <nav
                aria-label="Filter Prints and Goods"
                className="shop-category-tabs mt-7"
              >
                {[
                  { value: null, label: "All" },
                  { value: "tshirt", label: "T-shirts" },
                  { value: "mug", label: "Mugs" },
                  { value: "print", label: "Prints" },
                  { value: "sticker", label: "Stickers" },
                ].map((filter) => (
                  <Link
                    key={filter.label}
                    onClick={() =>
                      setFilterSearch(
                        filter.value ? `?category=${filter.value}` : "",
                      )
                    }
                    href={
                      filter.value
                        ? `/shop/turkiye/prints?category=${filter.value}`
                        : "/shop/turkiye/prints"
                    }
                    aria-current={
                      activeFilter === filter.value ? "page" : undefined
                    }
                  >
                    {filter.label}
                  </Link>
                ))}
              </nav>
            </div>
            {products.length ? (
              <div className="managed-product-grid">
                {products.map((product) => (
                  <ManagedProductCard
                    key={product.id}
                    product={product}
                    region="TR"
                    onChooseOptions={() => setSelectedTurkeyProduct(product)}
                    onView={() => setSelectedTurkeyProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <p className="border border-ink/10 p-10 text-center">
                {activeFilter === "tshirt"
                  ? "No T-shirts are currently available."
                  : activeFilter === "mug"
                    ? "No mugs are currently available."
                    : activeFilter === "print"
                      ? "No signed prints are currently available."
                      : activeFilter === "sticker"
                        ? "No stickers are currently available."
                        : "No Prints & Goods are currently available."}
              </p>
            )}
          </>
        )}
        {region === "INTERNATIONAL" && category === "prints" && (
          <>
            {international.loading ? (
              <div className="p-10 text-center">
                Loading international prints…
              </div>
            ) : international.products.length ? (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {international.products.map((product) => (
                    <InternationalProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
                <p className="mt-8 text-sm text-ink/60">
                  Final product options, shipping and checkout are completed
                  through Fourthwall.
                </p>
              </>
            ) : (
              <div className="border border-ink/10 bg-card p-8">
                <h2 className="text-3xl">
                  The international print collection is temporarily unavailable
                  here.
                </h2>
                {international.shopUrl && (
                  <a
                    href={international.shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-primary mt-6"
                  >
                    Visit the Fourthwall shop <ExternalLink size={15} />
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </section>
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.name} full-size artwork image`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 md:p-8"
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center bg-paper text-ink md:right-8 md:top-8"
            aria-label="Close full-size image"
          >
            <X size={22} />
          </button>
          <img
            src={selected.imageUrl}
            alt={selected.altText || selected.name}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
      <TurkeyProductDialog
        product={selectedTurkeyProduct}
        onClose={() => setSelectedTurkeyProduct(null)}
      />
    </div>
  );
}
