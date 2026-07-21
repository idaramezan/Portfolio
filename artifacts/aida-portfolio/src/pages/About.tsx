import { assetImages } from "@/lib/assets";

const processPrinciples = [
  "I paint directly with oil pastel.",
  "No sketches. No digital corrections.",
  "Fingerprints stay.",
  "Imperfection is part of the artwork.",
];

export default function About() {
  return (
    <div className="w-full">
      <section className="bg-ink text-paper py-20 md:py-28 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <img src={assetImages[0]} alt="Background texture" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-paper/70 mb-4">About the Artist</p>
          <h1 className="text-5xl md:text-7xl font-serif text-paper mb-8">A studio practice rooted in presence, texture, and honesty.</h1>
          <p className="text-xl md:text-2xl font-serif leading-snug text-paper/90 max-w-3xl mx-auto">
            Aida paints with oil pastel on paper, embracing the marks that come from hands, breath, and the unpredictability of each gesture.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-start">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">About the Artist</p>
            <h2 className="text-4xl font-serif text-ink">A self-taught practice that celebrates the handmade.</h2>
            <p className="text-lg text-ink/80 leading-relaxed">
              She began painting without formal training, drawn to the immediacy and sensitivity of oil pastel. Every mark is a choice, every smudge is kept, and the final work carries the trace of a hand that made it.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-none border border-ink/10 bg-paper p-8">
              <h3 className="font-serif text-2xl text-ink mb-4">Materials</h3>
              <p className="text-ink/80 leading-relaxed">
                Pigment is layered, blended, and pushed into paper. The work is made with oil pastel, textured paper, and simple studio tools — no edits, no filters, no digital smoothing.
              </p>
            </div>
            <div className="rounded-none border border-ink/10 bg-paper p-8">
              <h3 className="font-serif text-2xl text-ink mb-4">Philosophy</h3>
              <p className="text-ink/80 leading-relaxed">
                Aida makes work that feels lived-in, imperfect, and quietly precious. Each piece is offered as a collectible object, not a commodity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper border-t border-b border-ink/10 py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Process</p>
            <h2 className="mt-4 text-4xl font-serif text-ink">A handful of studio principles</h2>
          </div>
          <div className="space-y-4">
            <p className="text-lg text-ink/80 leading-relaxed">
              The work is made with immediacy. It’s not polished. It’s made to feel as if the paper has been pulled from a handmade sketchbook and left to breathe.
            </p>
            <ul className="grid gap-3 text-ink/80 text-sm leading-relaxed list-disc list-inside">
              {processPrinciples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] items-start">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Studio</p>
            <h2 className="text-4xl font-serif text-ink">The room where the work is made</h2>
            <p className="text-lg text-ink/80 leading-relaxed">
              The studio is a quiet place with taped edges, layered paper, and the slow accumulation of material. Every parcel is packed with care, signed, and sent from here.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="overflow-hidden rounded-none border border-ink/10 bg-ink/5">
                <img src={assetImages[idx]} alt={`Studio detail ${idx}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
