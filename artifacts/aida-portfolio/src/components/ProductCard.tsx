import Money from "@/components/Money";
import EditorialProductCard from "@/components/EditorialProductCard";
import type { ManagedProduct } from "@/lib/store";
import { isSoldOut } from "@/lib/product-status";
import { trackAnalytics } from "@/lib/analytics";

export default function ProductCard({
  product,
  onClick,
  imagePriority = false,
}: {
  product: ManagedProduct;
  onClick: () => void;
  imagePriority?: boolean;
  variant?: "default" | "original";
}) {
  const sold = isSoldOut(product);
  const type =
    product.kind === "original"
      ? "ORIGINAL"
      : product.category === "print" || !product.category
        ? "PRINT"
        : (product.category || product.printType || "PRINT").toUpperCase();

  return (
    <EditorialProductCard
      image={product.imageUrl}
      alt={product.altText || product.name}
      imagePriority={imagePriority}
      title={product.name}
      price={<Money baseAmountUsdCents={product.priceUsdCents} showBase />}
      metadata={`${type} · ${sold ? "SOLD" : "AVAILABLE"}`}
      status={sold ? "sold" : "available"}
      onClick={() => {
        trackAnalytics("product_view", {
          entityType: product.kind,
          entityId: product.id,
          entityName: product.name,
          metadata: { productType: product.kind },
        });
        onClick();
      }}
    />
  );
}
