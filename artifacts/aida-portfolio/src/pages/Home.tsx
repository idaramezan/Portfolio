import { Link } from "wouter";
import { assetImages, portrait } from "@/lib/assets";
import Newsletter from "@/components/layout/Newsletter";
import HeroFlipCard from "@/components/HeroFlipCard";

// Use paintings starting from index 1 (skip heroImage at 0, use the rest as the flip deck)
const flipPaintings = assetImages.slice(1, 8);

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12 md:gap-24">
        <div className="flex-1 space-y-8 z-10">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-ink leading-[1.1] tracking-tight">
            Self-taught.<br />
            Unpolished<br />
            <span className="text-coral italic">on purpose.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-lg leading-relaxed">
            Raw, expressive oil pastel paintings celebrating the beauty of imperfection.
          </p>
          <div className="pt-4 flex flex-wrap gap-6">
            <Link 
              href="/prints" 
              className="bg-coral text-paper font-serif text-xl px-8 py-4 torn-edge hover:bg-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
            >
              Enter the Studio
            </Link>
          </div>
        </div>
        
        {/* Paper-flip card: portrait ↔ paintings */}
        <div className="flex-1 relative w-full max-w-lg md:max-w-none pb-16 animate-in fade-in zoom-in-95 duration-1000">
          <HeroFlipCard portrait={portrait} paintings={flipPaintings} />
        </div>
      </section>

      {/* Featured Teaser */}
      <section className="w-full bg-ink text-paper py-24 mt-12 md:mt-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex justify-between items-end mb-16">
            <h2 className="text-4xl md:text-5xl font-serif text-paper">Recent Work</h2>
            <Link href="/gallery" className="hidden md:inline-block font-sans text-lg text-paper/80 hover:text-ochre link-underline">
              View all
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[1, 2, 3].map((idx) => {
              const rotations = ["rotate-2", "-rotate-3", "rotate-1"];
              const edges = ["torn-edge", "torn-edge-2", "torn-edge-3"];
              return (
                <div key={idx} className={`relative flex flex-col gap-4 transform ${rotations[idx-1]} transition-transform hover:rotate-0 duration-500`}>
                  <img 
                    src={assetImages[idx]} 
                    alt="Featured artwork" 
                    className={`w-full aspect-[4/5] object-cover ${edges[idx-1]} shadow-lg`} 
                  />
                </div>
              );
            })}
          </div>
          
          <div className="mt-12 text-center md:hidden">
            <Link href="/gallery" className="font-sans text-lg text-paper/80 hover:text-ochre link-underline">
              View all works
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
