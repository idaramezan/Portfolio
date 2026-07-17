import { useState } from "react";
import { useListArtworks, getListArtworksQueryKey, Artwork, useInitiateCheckout } from "@workspace/api-client-react";
import { getArtworkImage } from "@/lib/assets";
import { cn } from "@/lib/utils";

const SIZES = [
  { id: "8x10", label: "8 x 10 in", price: 45 },
  { id: "11x14", label: "11 x 14 in", price: 65 },
  { id: "16x20", label: "16 x 20 in", price: 95 }
];

function PrintCard({ artwork, index }: { artwork: Artwork, index: number }) {
  const checkout = useInitiateCheckout();
  const [selectedSize, setSelectedSize] = useState(SIZES[1]); // Default 11x14
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOrder = () => {
    checkout.mutate({ data: { type: 'print', artworkId: artwork.id, printSize: selectedSize.id } }, {
      onSuccess: (data) => {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setToastMessage("Online checkout coming soon! Email studio@aidaramezani.com to order.");
          setTimeout(() => setToastMessage(null), 5000);
        }
      },
      onError: () => {
        setToastMessage("Online checkout coming soon! Email studio@aidaramezani.com to order.");
        setTimeout(() => setToastMessage(null), 5000);
      }
    });
  };

  const edgeClass = index % 2 === 0 ? "torn-edge-2" : "torn-edge-3";

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-paper border border-ink/10 relative shadow-sm hover:shadow-md transition-shadow group">
      <div className={cn("w-full aspect-square bg-ink/5 overflow-hidden", edgeClass)}>
        <img 
          src={getArtworkImage(artwork, index)} 
          alt={artwork.title}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700"
        />
      </div>
      
      <div className="flex-1 flex flex-col">
        <h3 className="font-serif text-2xl font-bold text-ink mb-1">{artwork.title}</h3>
        <p className="font-sans text-sm text-muted-foreground mb-6">Archival Giclée Print on Hahnemühle Rag</p>
        
        <div className="mt-auto space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "py-2 font-sans text-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                  selectedSize.id === size.id 
                    ? "bg-ink border-ink text-paper" 
                    : "bg-transparent border-ink/20 text-ink hover:border-ink"
                )}
              >
                {size.id}
              </button>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-hand text-3xl text-ochre">${selectedSize.price}</span>
            <button
              onClick={handleOrder}
              disabled={checkout.isPending}
              className="bg-blue text-paper font-serif font-bold px-6 py-2 torn-edge hover:bg-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
            >
              {checkout.isPending ? "Loading..." : "Order Print"}
            </button>
          </div>
        </div>
        
        {toastMessage && (
          <div className="absolute bottom-full left-0 mb-2 w-full p-3 bg-ochre text-ink font-sans text-xs text-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
            {toastMessage}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-ochre"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Prints() {
  const { data: artworks, isLoading } = useListArtworks({}, { 
    query: { queryKey: getListArtworksQueryKey({}) } 
  });

  // Filter to only artworks that are available as prints on the client side
  // since the API doesn't have an availableAsPrint filter param
  const printArtworks = artworks?.filter(a => a.availableAsPrint) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24">
      <div className="max-w-3xl mb-16">
        <h1 className="text-5xl md:text-7xl font-serif text-ink mb-6">Fine Art Prints</h1>
        <p className="text-xl text-ink/80 font-sans leading-relaxed">
          Museum-quality reproductions of original works. Printed on heavy, textured 100% cotton rag paper to capture every detail of the oil pastel pigment.
        </p>
      </div>

      {isLoading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="font-hand text-3xl text-ink animate-pulse">Loading prints...</div>
        </div>
      ) : printArtworks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {printArtworks.map((artwork, idx) => (
            <PrintCard key={artwork.id} artwork={artwork} index={idx} />
          ))}
        </div>
      ) : (
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-blue/10 torn-edge">
          <h3 className="font-serif text-3xl text-ink mb-4">No prints available yet</h3>
          <p className="text-muted-foreground font-sans text-lg">Check back soon as new prints are added.</p>
        </div>
      )}
    </div>
  );
}
