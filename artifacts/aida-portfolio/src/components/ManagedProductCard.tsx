import { useState } from "react";
import { Link } from "wouter";
import { PackageCheck } from "lucide-react";
import Money from "@/components/Money";
import { formatArtworkSurface } from "@/lib/artwork-surface";
import { isPurchasable, isSoldOut } from "@/lib/product-status";
import {
  addItemToCart,
  type ManagedProduct,
  type ShoppingRegion,
} from "@/lib/store";
import { getPrintStartingPrice } from "@/lib/turkiye-products";
import { convertUsdCentsToTry, useCurrency } from "@/lib/currency";

function productNeedsOptions(product: ManagedProduct) {
  return (
    product.kind === "print" &&
    (product.category === "print" ||
      product.category === "tshirt" ||
      Boolean(product.printOptions?.sizes.length) ||
      Boolean(product.tshirtOptions?.availableColors.length))
  );
}

function categoryLabel(product: ManagedProduct) {
  if (product.kind === "original") return "Original";
  if (product.category === "tshirt") return "T-shirt";
  if (product.category === "mug") return "Mug";
  if (product.category === "sticker") return "Sticker";
  return "Print";
}

export default function ManagedProductCard({
  product,
  region,
  viewHref,
  onView,
  onChooseOptions,
}: {
  product: ManagedProduct;
  region: ShoppingRegion;
  viewHref?: string;
  onView?: () => void;
  onChooseOptions?: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const { rate, rateDate } = useCurrency();
  const sold = isSoldOut(product);
  const purchasable = isPurchasable(product);
  const original = product.kind === "original";
  const configurable = productNeedsOptions(product);
  const price =
    product.category === "print"
      ? getPrintStartingPrice(product.priceUsdCents, product.printOptions)
      : product.priceUsdCents;

  const add = () => {
    if (original && region === "TR" && !rate) {
      setFeedback("Türkiye pricing is temporarily unavailable. Please try again shortly.");
      return;
    }
    const converted = original && region === "TR" && rate
      ? convertUsdCentsToTry(product.priceUsdCents, rate)
      : undefined;
    const result = addItemToCart(
      {
        id: `${original ? "original" : "product"}-${product.id}`,
        productId: product.id,
        kind: original
          ? "original"
          : product.category === "print"
            ? "print"
            : "product",
        title: product.name,
        subtitle: original
          ? `${formatArtworkSurface(product.artworkSurface)} · ${product.dimension}`
          : product.description,
        imageUrl: product.imageUrl,
        priceUsdCents: converted ?? product.priceUsdCents,
        market: region === "TR" ? "turkiye" : "international",
        canonicalCurrency: original ? "USD" : "TRY",
        canonicalPriceMinor: product.priceUsdCents,
        displayCurrency: region === "TR" ? "TRY" : "USD",
        convertedUnitPriceMinor: converted,
        appliedExchangeRate: converted ? Number(rate) : undefined,
        exchangeRateDate: converted ? rateDate || undefined : undefined,
        quantity: 1,
        maxQuantity: original ? 1 : product.maxPerUser,
        selectedColor: product.category === "mug" ? "white" : undefined,
      },
      original ? 1 : product.maxPerUser,
      region,
    );
    setFeedback(
      result.ok
        ? "Added to basket"
        : result.reason || "This item could not be added.",
    );
    window.setTimeout(() => setFeedback(""), 2600);
  };

  return (
    <article className={`managed-product-card ${sold ? "managed-product-card--sold" : ""}`}>
      <div className={`managed-product-card__media ${original ? "managed-product-card__media--artwork" : "managed-product-card__media--goods"}`}>
        <img
          src={product.imageUrl}
          alt={product.altText || `${product.name}, ${categoryLabel(product)}`}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 640px) calc(100vw - 36px), (max-width: 1100px) 45vw, 280px"
        />
      </div>
      <div className="managed-product-card__body">
        <div className="flex flex-wrap gap-2">
          <span className="badge">{categoryLabel(product)}</span>
          {sold && <span className="badge !border-coral !text-coral">SOLD OUT</span>}
        </div>
        <h3 className="mt-4 text-3xl">{product.name}</h3>
        <p className="mt-3 text-[.68rem] font-bold uppercase tracking-[.16em] text-ink/50">
          {original
            ? formatArtworkSurface(product.artworkSurface)
            : categoryLabel(product)}
        </p>
        {original && <p className="mt-2 text-sm text-ink/55">{product.dimension}</p>}
        <div className="mt-5 flex items-baseline gap-2 font-bold">
          {product.category === "print" && <span className="text-sm">From</span>}
          <Money baseAmountUsdCents={price} canonicalCurrency={original ? "USD" : "TRY"} showBase />
        </div>
        <p className={`mt-4 text-sm font-semibold ${region === "TR" ? "text-green" : "text-ink/60"}`}>
          {region === "TR" ? (
            <span className="flex items-center gap-2"><PackageCheck size={17} aria-hidden="true" />{original ? "Free shipping within Türkiye" : "Shipping price will be calculated based on the package size"}</span>
          ) : (
            "International shipping is calculated separately."
          )}
        </p>
        <div className="managed-product-card__actions">
          <button
            type="button"
            disabled={!purchasable || (original && region === "TR" && !rate)}
            onClick={configurable ? onChooseOptions : add}
            className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-45"
          >
            {sold
              ? "Sold"
              : feedback === "Added to basket"
                ? feedback
                : configurable
                  ? "Choose options"
                  : "Add to basket"}
          </button>
          {viewHref ? (
            <Link href={viewHref} className="button-link">
              {original ? "View painting" : "View details"}
            </Link>
          ) : onView ? (
            <button type="button" onClick={onView} className="button-link">
              {original ? "View painting" : "View details"}
            </button>
          ) : null}
          <p aria-live="polite" className="min-h-4 text-xs font-semibold text-coral">
            {feedback && feedback !== "Added to basket" ? feedback : ""}
          </p>
        </div>
      </div>
    </article>
  );
}
