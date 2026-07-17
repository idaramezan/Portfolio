import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Artwork, useInitiateCheckout } from "@workspace/api-client-react";
import { getArtworkImage } from "@/lib/assets";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ArtworkModalProps {
  artwork: Artwork | null;
  index: number;
  onClose: () => void;
}

export default function ArtworkModal({ artwork, index, onClose }: ArtworkModalProps) {
  const checkout = useInitiateCheckout();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (artwork) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [artwork, onClose]);

  if (!artwork) return null;

  const handleCheckout = (type: 'original' | 'print') => {
    checkout.mutate({ data: { type, artworkId: artwork.id } }, {
      onSuccess: (data) => {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setToastMessage("Online checkout coming soon! To purchase this piece, email studio@aidaramezani.com");
          setTimeout(() => setToastMessage(null), 5000);
        }
      },
      onError: () => {
        setToastMessage("Online checkout coming soon! To purchase this piece, email studio@aidaramezani.com");
        setTimeout(() => setToastMessage(null), 5000);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="relative w-full max-w-6xl max-h-full bg-paper torn-edge-2 shadow-2xl flex flex-col md:flex-row overflow-hidden z-10 animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-20 bg-paper/50 md:bg-transparent rounded-full p-2 text-ink hover:text-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          aria-label="Close modal"
        >
          <X size={32} />
        </button>

        {/* Image Section */}
        <div className="w-full md:w-3/5 bg-ink/5 p-4 md:p-8 flex items-center justify-center min-h-[40vh] md:min-h-[70vh] overflow-y-auto">
          <img 
            src={getArtworkImage(artwork, index)} 
            alt={artwork.title}
            className="max-w-full max-h-full object-contain shadow-lg"
          />
        </div>

        {/* Details Section */}
        <div className="w-full md:w-2/5 p-6 md:p-10 lg:p-12 flex flex-col overflow-y-auto bg-paper">
          <div className="mb-2 flex items-center gap-3">
            <span className="bg-ochre/20 text-ink/80 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm">
              {artwork.category}
            </span>
            <span className="text-muted-foreground text-sm font-sans">{artwork.year}</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-ink mb-6 leading-tight">
            {artwork.title}
          </h2>
          
          <div className="space-y-4 text-ink font-sans text-lg mb-10 border-l-2 border-ochre pl-4">
            <p><span className="font-bold text-muted-foreground mr-2">Medium:</span> {artwork.medium}</p>
            {artwork.sizeInches && <p><span className="font-bold text-muted-foreground mr-2">Size:</span> {artwork.sizeInches}</p>}
          </div>
          
          {artwork.description && (
            <div className="mb-10 text-ink/80 font-sans leading-relaxed whitespace-pre-wrap">
              {artwork.description}
            </div>
          )}
          
          <div className="mt-auto pt-8 border-t border-ink/10">
            {artwork.status === "SOLD" ? (
              <div className="flex flex-col items-start gap-4">
                <div className="transform -rotate-6 bg-transparent border-4 border-coral text-coral px-6 py-2 mix-blend-multiply self-start">
                  <span className="font-hand text-4xl font-bold tracking-widest uppercase block translate-y-1">Sold Out</span>
                </div>
                {artwork.availableAsPrint && (
                  <div className="mt-6 w-full">
                    <p className="font-sans text-sm text-muted-foreground mb-3">Available as a Fine Art Print</p>
                    <button
                      onClick={() => handleCheckout('print')}
                      disabled={checkout.isPending}
                      className="w-full bg-blue text-paper font-serif font-bold text-xl px-8 py-4 torn-edge hover:bg-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
                    >
                      {checkout.isPending ? "Loading..." : "Order a Print"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex items-end justify-between">
                  <span className="font-sans text-muted-foreground uppercase tracking-widest text-sm font-bold">Original</span>
                  <span className="font-hand text-5xl text-ochre">{artwork.priceCents ? formatPrice(artwork.priceCents) : "Price on Request"}</span>
                </div>
                
                <button
                  onClick={() => handleCheckout('original')}
                  disabled={checkout.isPending}
                  className="w-full bg-coral text-paper font-serif font-bold text-xl px-8 py-4 torn-edge-2 hover:bg-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
                >
                  {checkout.isPending ? "Loading..." : "Buy Original"}
                </button>
                
                {artwork.availableAsPrint && (
                  <button
                    onClick={() => handleCheckout('print')}
                    disabled={checkout.isPending}
                    className="w-full bg-transparent text-ink border-2 border-ink font-serif font-bold text-lg px-8 py-3 torn-edge-3 hover:bg-ink hover:text-paper transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                  >
                    Order a Print Instead
                  </button>
                )}
              </div>
            )}
            
            {toastMessage && (
              <div className="mt-4 p-4 bg-ochre/20 border-l-4 border-ochre text-ink font-sans text-sm animate-in fade-in slide-in-from-bottom-2">
                {toastMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
