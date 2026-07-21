import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductDetailsDialog from "@/components/ProductDetailsDialog";
import { addItemToCart, loadShopSettings, type ManagedProduct } from "@/lib/store";

export default function Prints() {
  const [settings, setSettings] = useState(loadShopSettings());
  const [selectedProduct, setSelectedProduct] = useState<ManagedProduct | null>(null);

  useEffect(() => {
    const sync = () => setSettings(loadShopSettings());
    window.addEventListener("shop-settings:updated", sync);
    return () => window.removeEventListener("shop-settings:updated", sync);
  }, []);

  const printProducts = settings.printProducts.filter((product) => product.available);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-16">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Studio Editions</p>
        <h1 className="mt-3 text-5xl md:text-7xl font-serif text-ink mb-6">Prints from the workbench</h1>
        <p className="text-xl text-ink/80 font-sans leading-relaxed">
          A refined selection of studio prints, stickers, and tactile editions designed to bring the warmth of the studio into your home.
        </p>
      </div>

      {printProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {printProducts.map((product) => (
            <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
          ))}
        </div>
      ) : (
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-paper border border-ink/10 rounded-none">
          <h3 className="font-serif text-3xl text-ink mb-4">No studio editions are available yet</h3>
          <p className="text-muted-foreground font-sans text-lg">Visit the admin panel to add new prints and studio pieces.</p>
        </div>
      )}
      <ProductDetailsDialog
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAdd={() => {
          if (selectedProduct) {
            addItemToCart(
              {
                id: `print-product-${selectedProduct.id}`,
                kind: "print",
                title: selectedProduct.name,
                subtitle: selectedProduct.printType ? `${selectedProduct.printType} • ${selectedProduct.dimension}` : selectedProduct.dimension,
                priceCents: selectedProduct.priceCents,
                quantity: 1,
              },
              selectedProduct.maxPerUser,
            );
            setSelectedProduct(null);
          }
        }}
      />
    </div>
  );
}
