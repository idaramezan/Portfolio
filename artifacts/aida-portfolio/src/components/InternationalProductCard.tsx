import EditorialProductCard from "@/components/EditorialProductCard";
import type { InternationalProduct } from "@/lib/fourthwall";
import { trackAnalytics } from "@/lib/analytics";

export default function InternationalProductCard({
  product,
}: {
  product: InternationalProduct;
  compact?: boolean;
}) {
  const prices = new Set(
    product.variants.map((variant) => variant.price.formatted),
  );
  return (
    <EditorialProductCard
      href={product.externalUrl}
      external
      image={product.primaryImage?.url}
      alt={product.primaryImage?.alt || product.name}
      title={product.name}
      price={product.price.formatted}
      pricePrefix={prices.size > 1 ? "FROM" : undefined}
      metadata={`PRINT · ${product.soldOut ? "SOLD" : "AVAILABLE"}`}
      status={product.soldOut ? "sold" : "available"}
      onNavigate={() =>
        trackAnalytics("fourthwall_product_clicked", {
          entityType: "fourthwall",
          entityId: product.id,
          entityName: product.name,
        })
      }
    />
  );
}
