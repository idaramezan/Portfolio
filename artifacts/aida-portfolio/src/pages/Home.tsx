import { Link } from "wouter";
import { assetImages, portrait } from "@/lib/assets";
import MonthlyMailPrintBanner from "@/components/MonthlyMailPrintBanner";

const recentWorks = [
  {
    image: assetImages[1],
    title: "Quiet Studio",
    medium: "Oil pastel on paper",
    dimension: "14 x 18 in",
    availability: "Available",
  },
  {
    image: assetImages[3],
    title: "Evening Window",
    medium: "Oil pastel on paper",
    dimension: "12 x 16 in",
    availability: "Available",
  },
  {
    image: assetImages[4],
    title: "Untitled Study",
    medium: "Oil pastel on paper",
    dimension: "11 x 15 in",
    availability: "Available",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-center">
          <div className="space-y-8">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">A studio story</p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-ink leading-[0.95] tracking-tight max-w-2xl">
              Work that feels handcrafted, unmistakably intimate, and quietly collectible.
            </h1>
            <p className="text-lg md:text-xl text-ink/80 max-w-xl leading-relaxed">
              Each original oil pastel is made in the studio with imperfect edges, fingerprints, and the quiet urgency of an artist who paints from feeling.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/originals"
                className="inline-flex items-center justify-center rounded-none bg-coral px-8 py-3 text-lg font-serif text-paper transition-colors hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
              >
                Shop Originals
              </Link>
              <Link
                href="/about#process"
                className="inline-flex items-center text-sm text-ink underline underline-offset-4 hover:text-coral"
              >
                Learn about my process
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-none border border-ink/10 bg-ink/5 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <img
              src={portrait}
              alt="Aida Ramezani holding artwork in her studio"
              className="w-full h-full object-cover"
            />
            <div className="absolute left-4 bottom-4 rounded-none border border-ink/10 bg-paper/90 px-4 py-3 text-sm uppercase tracking-[0.35em] text-ink">
              Aida in her studio
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 md:px-8 py-16 border-y border-ink/10">
        <div className="space-y-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Limited collections</p>
          <h2 className="text-4xl md:text-5xl font-serif text-ink">Original paintings are released in small collections.</h2>
          <p className="mx-auto max-w-2xl text-lg text-ink/80 leading-relaxed">
            Once sold, they are never recreated. Each piece is made by hand, signed, and offered only a few times in each studio season.
          </p>
        </div>
      </section>

      <section className="px-4 md:px-8">
        <MonthlyMailPrintBanner />
      </section>

      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Recent Work</p>
            <h2 className="mt-3 text-4xl md:text-5xl font-serif text-ink">Featured pieces from the studio</h2>
          </div>
          <Link href="/originals" className="text-sm uppercase tracking-[0.35em] text-ink hover:text-coral underline underline-offset-4">
            View the collection
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {recentWorks.map((work) => (
            <article key={work.title} className="group overflow-hidden rounded-none border border-ink/10 bg-paper shadow-sm transition-shadow hover:shadow-lg">
              <div className="relative overflow-hidden bg-ink/5">
                <img src={work.image} alt={work.title} className="w-full h-[480px] object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <h3 className="font-serif text-2xl text-ink mb-2">{work.title}</h3>
                <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground mb-3">{work.medium}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
                  <span>{work.dimension}</span>
                  <span>{work.availability}</span>
                </div>
                <Link href="/originals" className="mt-6 inline-flex items-center text-sm text-ink underline underline-offset-4 hover:text-coral">
                  View artwork
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
