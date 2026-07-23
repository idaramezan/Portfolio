import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "wouter";
import { heroPortrait, paintingVideo, paintingVideoPoster } from "@/lib/assets";
import { usePageMeta } from "@/hooks/use-page-meta";

const principles = [
  "I paint directly with oil pastel.",
  "I begin without a detailed sketch.",
  "I do not digitally correct the finished artwork.",
  "Fingerprints and handmade marks remain visible.",
  "Imperfection is part of the artwork.",
  "Each original is signed by the artist.",
];

function PaintingProcessVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reducedMotion]);

  if (reducedMotion)
    return (
      <img
        src={paintingVideoPoster}
        alt="Aida Ramezani painting with oil pastel in her studio"
        className="about-process__visual"
      />
    );

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={paintingVideoPoster}
      aria-label="Aida Ramezani painting with oil pastel in her studio"
      className="about-process__visual"
    >
      <source src={paintingVideo} type="video/mp4" />
    </video>
  );
}

export default function About() {
  usePageMeta(
    "About Aida Ramezani | Oil Pastel Artist in Istanbul",
    "Meet Aida Ramezani, a self-taught oil pastel artist based in Istanbul. Discover her materials, creative process, studio practice and approach to handmade original art.",
  );

  return (
    <div className="w-full">
      <section className="about-hero">
        <div className="about-hero__content">
          <p className="eyebrow">About Aida Ramezani</p>
          <h1>Art made directly, honestly and by hand.</h1>
          <p>
            Aida Ramezani is a self-taught oil pastel artist based in Istanbul.
            Her work is rooted in texture, instinct and the physical act of
            making.
          </p>
          <p>
            She works directly on paper, allowing fingerprints, smudges and
            unexpected marks to remain visible. Each original carries the trace
            of the hand that made it.
          </p>
        </div>
        <div className="about-hero__media">
          <img
            src={heroPortrait}
            alt="Oil pastel artist Aida Ramezani in her Istanbul studio"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="section-shell">
        <div className="grid gap-12 lg:grid-cols-[.92fr_1.08fr] lg:items-start">
          <div className="section-heading">
            <p className="eyebrow">The Practice</p>
            <h2>Self-taught, instinct-led.</h2>
            <p>
              Aida began painting without formal training, drawn to the
              immediacy and sensitivity of oil pastel.
            </p>
            <p>
              She works intuitively, allowing each layer, mark and texture to
              shape the final piece. Rather than hiding imperfections, she keeps
              them as part of the artwork’s history and character.
            </p>
          </div>
          <div className="grid gap-px bg-ink/10">
            <article className="bg-card p-7 md:p-9">
              <p className="eyebrow">Materials</p>
              <h3 className="mt-3 text-3xl">Oil pastel on textured paper</h3>
              <p className="mt-4 leading-relaxed text-ink/70">
                Aida creates original oil pastel paintings on textured paper
                using simple studio tools.
              </p>
              <p className="mt-3 leading-relaxed text-ink/70">
                Pigment is layered, blended and pressed into the surface by
                hand. The finished artwork is presented without digital editing,
                filters or artificial smoothing.
              </p>
            </article>
            <article className="bg-card p-7 md:p-9">
              <p className="eyebrow">Philosophy</p>
              <h3 className="mt-3 text-3xl">Personal and quietly precious</h3>
              <p className="mt-4 leading-relaxed text-ink/70">
                Aida creates art that feels personal, lived-in and quietly
                precious.
              </p>
              <p className="mt-3 leading-relaxed text-ink/70">
                Each work is made as an individual collectible object rather
                than a mass-produced product. No two original paintings are
                exactly alike.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="process" className="border-y border-ink/10 bg-paper">
        <div className="section-shell">
          <div className="about-process">
            <div className="about-process__content">
              <p className="eyebrow">Process</p>
              <h2>The hand stays visible.</h2>
              <p>
                Each work begins with oil pastel and a blank sheet of paper.
                Aida paints directly, responding to colour, texture and movement
                as the image develops.
              </p>
              <p>
                There are no digital corrections and no attempts to erase every
                irregularity. Fingerprints, softened edges and traces of the
                process remain part of the finished artwork.
              </p>
            </div>
            <div className="about-process__media">
              <PaintingProcessVideo />
            </div>
          </div>
          <div className="mt-12 border border-ink/10 bg-card p-7 md:p-9">
            <h3 className="text-3xl">Studio Principles</h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {principles.map((principle) => (
                <li key={principle} className="flex items-start gap-3">
                  <Check className="mt-0.5 shrink-0 text-coral" size={19} />
                  <span className="text-sm leading-relaxed text-ink/75">
                    {principle}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-blue text-paper">
        <div className="section-shell text-center">
          <p className="eyebrow !text-paper/60">From the Studio to Your Home</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl text-paper md:text-6xl">
            Collect Art Directly from Aida
          </h2>
          <div className="mx-auto mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-paper/75">
            <p>
              From the first mark to the final parcel, every piece remains
              closely connected to the studio.
            </p>
            <p>
              Collectors can contact Aida directly to ask about an artwork,
              confirm availability and discuss delivery before an order is
              completed.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop/turkiye/originals" className="button-primary">
              View available originals <ArrowRight size={16} />
            </Link>
            <Link
              href="/how-to-collect"
              className="button-secondary !border-paper/40 !text-paper hover:!bg-paper hover:!text-ink"
            >
              How to start a collection
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
