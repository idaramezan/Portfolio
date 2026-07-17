import { assetImages } from "@/lib/assets";

export default function About() {
  return (
    <div className="w-full">
      {/* Header section */}
      <section className="bg-ink text-paper py-20 md:py-32 overflow-hidden relative">
        <div className="absolute right-[-10%] top-[-10%] opacity-10 rotate-[15deg] pointer-events-none mix-blend-overlay">
          <img src={assetImages[0]} alt="Background texture" className="w-[800px] h-[800px] object-cover blur-sm" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-8xl font-serif text-paper mb-12">About the Artist</h1>
          <p className="text-2xl md:text-4xl font-serif leading-snug text-paper/90 mb-8 max-w-3xl mx-auto italic">
            "Aida Ramezani is a self-taught artist working in oil pastel. Her work celebrates the beauty of imperfection — every smudge, every uneven line is intentional. She calls it imperfection art."
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-32">
        <div className="flex flex-col md:flex-row gap-16 md:gap-24 items-center">
          <div className="flex-1 w-full order-2 md:order-1 relative">
            <div className="absolute inset-0 bg-blue/10 transform rotate-3 scale-105 torn-edge-3 -z-10"></div>
            <img 
              src={assetImages[1]} 
              alt="Artist workspace" 
              className="w-full aspect-[4/5] object-cover torn-edge shadow-xl transform -rotate-2"
            />
          </div>
          
          <div className="flex-1 order-1 md:order-2">
            <h2 className="text-4xl md:text-6xl font-serif text-ink mb-8">The Process</h2>
            <div className="space-y-6 font-sans text-xl text-ink/80 leading-relaxed">
              <p>
                "I've never had formal training. I paint from feeling, not technique. The oil pastel is unforgiving and immediate — you can't undo it. That's what I love about it."
              </p>
              <p>
                Every piece begins as an emotional impulse. I don't sketch perfectly measured outlines or mix pristine colors on a palette. I push raw pigment directly onto paper, using my hands to blend, smudge, and scrape.
              </p>
              <p>
                The resulting textures, the accidental color mixes, the fingerprints left behind — these aren't mistakes to be covered up. They are the record of a human being making something. In a world increasingly obsessed with flawless digital generation, I want to make art that is stubbornly, irreducibly analog.
              </p>
            </div>
            
            <div className="mt-16">
              <h3 className="font-serif text-2xl font-bold mb-6">Follow the Studio</h3>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="flex items-center justify-center gap-3 bg-paper border-2 border-ink px-6 py-4 font-serif text-xl torn-edge hover:bg-ink hover:text-paper transition-colors">
                  Instagram
                </a>
                <a href="#" className="flex items-center justify-center gap-3 bg-paper border-2 border-ink px-6 py-4 font-serif text-xl torn-edge-2 hover:bg-ink hover:text-paper transition-colors">
                  TikTok
                </a>
              </div>
              <p className="mt-4 font-hand text-2xl text-muted-foreground">@aidaramezani</p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Texture Grid */}
      <section className="bg-ochre py-24 px-4 md:px-8 overflow-hidden relative border-t-8 border-ink">
        {/* Wavy edge top using SVG */}
        <div className="absolute top-0 left-0 w-full h-8 overflow-hidden leading-[0] -mt-[1px]">
          <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[32px] transform rotate-180">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-ink"></path>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-hand text-5xl text-ink mb-16 rotate-[-2deg]">Details & Textures</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[3, 4, 7, 8].map((imgIndex, i) => {
              const rotations = ["rotate-3", "-rotate-6", "rotate-2", "-rotate-2"];
              return (
                <div key={i} className={`aspect-square overflow-hidden border-4 border-paper shadow-2xl transform ${rotations[i]}`}>
                  <img 
                    src={assetImages[imgIndex]} 
                    alt={`Texture detail ${i+1}`} 
                    className="w-full h-full object-cover scale-150 transform hover:scale-100 transition-transform duration-1000"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
