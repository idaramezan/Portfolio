import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductDetailsDialog from "@/components/ProductDetailsDialog";
import {
  addItemToCart,
  loadShopSettings,
  type ManagedProduct,
} from "@/lib/store";
import Money from "@/components/Money";

export default function Prints() {
  const [settings, setSettings] = useState(loadShopSettings());
  const [selectedProduct, setSelectedProduct] = useState<ManagedProduct | null>(
    null,
  );

  useEffect(() => {
    const sync = () => setSettings(loadShopSettings());
    window.addEventListener("shop-settings:updated", sync);
    return () => window.removeEventListener("shop-settings:updated", sync);
  }, []);

  const printProducts = settings.printProducts.filter(
    (product) => product.available,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24">
      <div className="max-w-3xl mb-10">
        <p className="eyebrow">Direct collecting · Türkiye</p>
        <h1 className="mt-3 text-5xl md:text-7xl font-serif text-ink mb-6">
          Art from the studio, made easier to collect.
        </h1>
        <p className="text-xl text-ink/80 font-sans leading-relaxed">
          Archival prints created from Aida’s original oil pastel paintings,
          available in sizes designed for easy framing.
        </p>
      </div>

      {printProducts.length === 1 ? (
        (() => {
          const product = printProducts[0];
          return (
            <article className="grid overflow-hidden border border-ink/10 bg-card lg:grid-cols-[1.15fr_.85fr]">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="aspect-[4/3] h-full w-full object-cover"
              />
              <div className="flex flex-col justify-center p-7 md:p-10">
                <span className="badge w-fit">Studio print</span>
                <h2 className="mt-5 text-4xl">{product.name}</h2>
                <p className="mt-4 leading-relaxed text-ink/65">
                  {product.description}
                </p>
                <dl className="mt-6 grid gap-3 text-sm">
                  <div>
                    <dt className="font-semibold">Available size</dt>
                    <dd>
                      {product.dimension || "Shown with the print details"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Edition</dt>
                    <dd>Edition details confirmed directly with Aida</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Framing</dt>
                    <dd>Frame not included · packed flat with care</dd>
                  </div>
                </dl>
                <Money
                  baseAmountUsdCents={product.priceUsdCents}
                  showBase
                  className="mt-7 font-sans text-3xl font-bold"
                />
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      addItemToCart(
                        {
                          id: `print-product-${product.id}`,
                          kind: "print",
                          title: product.name,
                          subtitle: product.dimension,
                          imageUrl: product.imageUrl,
                          priceUsdCents: product.priceUsdCents,
                          quantity: 1,
                        },
                        product.maxPerUser,
                      );
                    }}
                    className="button-primary"
                  >
                    Add to basket
                  </button>
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="button-secondary"
                  >
                    View details
                  </button>
                </div>
              </div>
            </article>
          );
        })()
      ) : printProducts.length > 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {printProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      ) : (
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-paper border border-ink/10 rounded-none">
          <h3 className="font-serif text-3xl text-ink mb-4">
            No studio editions are available yet
          </h3>
          <p className="text-muted-foreground font-sans text-lg">
            Visit the admin panel to add new prints and studio pieces.
          </p>
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
                subtitle: selectedProduct.printType
                  ? `${selectedProduct.printType} • ${selectedProduct.dimension}`
                  : selectedProduct.dimension,
                priceUsdCents: selectedProduct.priceUsdCents,
                quantity: 1,
              },
              selectedProduct.maxPerUser,
            );
            setSelectedProduct(null);
          }
        }}
      />
      <section className="mt-20 grid gap-8 border-y border-ink/10 py-12 md:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Framing guide</p>
          <h2 className="mt-3 text-4xl">Made for easy framing</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 text-sm leading-relaxed text-ink/70">
          <p>
            <strong className="block text-ink">Standard dimensions</strong>Sizes
            are selected to fit readily available frames. The exact size is
            shown on each print.
          </p>
          <p>
            <strong className="block text-ink">Frames are not included</strong>
            Choose a simple wood or slim metal frame, with a mat if you prefer
            extra breathing room.
          </p>
          <p>
            <strong className="block text-ink">Studio-quality paper</strong>
            Print method, paper, border, and edition details are listed with
            each available piece.
          </p>
          <p>
            <strong className="block text-ink">Packed flat with care</strong>
            Each print is protected for its journey from the studio to your
            home.
          </p>
        </div>
      </section>
    </div>
  );
}
