import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { heroPortrait, paintingVideoPoster } from "@/lib/assets";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function PersonalAbout() {
  usePageMeta(
    "About Aida Ramezani | Aeda Art",
    "A personal introduction to Aida Ramezani’s painting and moving-image practice.",
  );
  return (
    <article className="personal-about">
      <header className="personal-about__hero section-shell">
        <div>
          <p className="portfolio-kicker">ABOUT AIDA</p>
          <h1>I paint what stays with me.</h1>
          <div className="personal-about__intro">
            <p>
              Sometimes it is a flower I remember differently than it really
              was.
            </p>
            <p>
              Sometimes it is a small moment happening among growing things.
            </p>
            <p>Sometimes it is an image left behind by a song.</p>
            <p>Painting is how I keep those things a little longer.</p>
          </div>
        </div>
        <img
          src={heroPortrait}
          alt="Aida Ramezani with her artwork"
          fetchPriority="high"
        />
      </header>
      <section className="about-chapter section-shell">
        <img
          src={paintingVideoPoster}
          alt="Aida painting with oil pastel"
          loading="lazy"
        />
        <div>
          <p className="portfolio-kicker">PAINTING</p>
          <h2>Memory, nature and music.</h2>
          <p>
            I paint directly with oil pastel, following colour and movement
            before the image is fully clear. Fingerprints, softened edges and
            small irregularities remain because they are part of how the work
            came into being.
          </p>
          <p>
            The subjects change, but I keep returning to what memory alters,
            what living things do when nobody is watching, and the places music
            builds in the mind.
          </p>
          <Link href="/paintings" className="portfolio-text-link">
            See the paintings <ArrowRight />
          </Link>
        </div>
      </section>
      <section className="about-chapter about-chapter--reverse section-shell">
        <div className="about-moving-placeholder">
          AEDA
          <br />
          IN MOTION
        </div>
        <div>
          <p className="portfolio-kicker">MOVING IMAGE</p>
          <h2>Some images need motion.</h2>
          <p>
            Animation gives me another way to work with music, atmosphere and
            time. I create personal visual experiments as well as commissioned
            work for musicians.
          </p>
          <Link href="/moving-image" className="portfolio-text-link">
            Explore Moving Image <ArrowRight />
          </Link>
        </div>
      </section>
      <section className="personal-about__commission section-shell">
        <p className="portfolio-kicker">COMMISSIONS</p>
        <h2>Selected painting and moving-image commissions are accepted.</h2>
        <Link href="/commissions/moving-image" className="portfolio-text-link">
          Start a conversation <ArrowRight />
        </Link>
      </section>
    </article>
  );
}
