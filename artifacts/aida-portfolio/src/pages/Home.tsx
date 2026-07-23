import { ArrowRight, PackageCheck } from "lucide-react";
import { Link } from "wouter";
import { homeAboutImage, heroPortrait } from "@/lib/assets";
import { productRepository } from "@/lib/productRepository";
import { usePageMeta } from "@/hooks/use-page-meta";
import ArtistPhotoFrame from "@/components/ArtistPhotoFrame";
import TikTokLiveSection from "@/components/TikTokLiveSection";
import StudioLetterSignup from "@/components/StudioLetterSignup";
import turkiyeFlagBackground from "@assets/home-turkiye-flag.jpg";
import internationalFlagsBackground from "@assets/home-international-flags.jpg";

const SEO_TITLE =
  "Original Art, Prints & Goods and Mystery Mail | Aida Ramezani";
const SEO_DESCRIPTION =
  "Shop original paintings, Prints & Goods and limited Mystery Mail editions by Istanbul artist Aida Ramezani.";

export default function Home() {
  usePageMeta(SEO_TITLE, SEO_DESCRIPTION);
  const links = productRepository.getSettings().siteLinks;

  return (
    <div className="flex flex-col overflow-hidden">
      <section className="home-hero">
        <div className="section-shell home-hero__inner !py-5 md:!py-8">
          <div className="max-w-2xl">
            <p className="eyebrow">
              Original paintings • Prints & Goods • Mystery Mail
            </p>
            <h1 className="home-hero-title mt-3 font-serif text-ink md:mt-5">
              Original Art, Prints & Goods and Mystery Mail
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/70 md:mt-6 md:text-xl">
              Discover one of a kind paintings, signed art prints and small
              themed art packages created by Istanbul artist Aida Ramezani.
            </p>
            <div className="mt-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center md:mt-8">
              <Link
                href="/shop/turkiye"
                className="button-primary"
                aria-label="Shop originals, Prints and Goods and Mystery Mail in Türkiye"
              >
                Shop in Türkiye <ArrowRight size={17} />
              </Link>
              <Link
                href="/shop/international"
                className="button-secondary"
                aria-label="Shop originals and international prints"
              >
                Shop internationally
              </Link>
            </div>
          </div>
          <div className="home-hero-media relative flex min-h-0 flex-col">
            <ArtistPhotoFrame
              variant="hero"
              src={heroPortrait}
              alt="Istanbul artist Aida Ramezani smiling and holding one of her artworks"
              caption="Aida in her Istanbul studio"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-card">
        <div className="section-shell">
          <div className="section-heading">
            <p className="eyebrow">Shopping location</p>
            <h2>Choose Your Shop</h2>
          </div>
          <div className="mt-10 grid gap-px bg-ink/10 md:grid-cols-2">
            <article className="relative isolate overflow-hidden bg-paper p-7 md:p-10">
              <img
                src={turkiyeFlagBackground}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.11]"
              />
              <div className="flex h-full flex-col items-start">
                <p className="eyebrow">Türkiye</p>
                <h3 className="mt-3 text-3xl">Shop within Türkiye</h3>
                <p className="mt-4 flex-1 leading-relaxed text-ink/70">
                  Browse original paintings, signed prints, T-shirts, mugs,
                  stickers and the current Mystery Mail. Add your selections to
                  your basket and continue personally with Aida on WhatsApp.
                </p>
                <p className="mt-5 text-sm font-semibold">
                  Originals · Prints & Goods · Mystery Mail
                </p>
                <Link href="/shop/turkiye" className="button-primary mt-7">
                  Enter the Türkiye Shop <ArrowRight size={16} />
                </Link>
              </div>
            </article>
            <article className="relative isolate overflow-hidden bg-paper p-7 md:p-10">
              <img
                src={internationalFlagsBackground}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.1]"
              />
              <div className="flex h-full flex-col items-start">
                <p className="eyebrow">International</p>
                <h3 className="mt-3 text-3xl">Shop internationally</h3>
                <p className="mt-4 flex-1 leading-relaxed text-ink/70">
                  Collect an original directly from Aida or explore
                  international prints available through Fourthwall.
                </p>
                <p className="mt-5 text-sm font-semibold">
                  Originals · International Prints
                </p>
                <p className="mt-2 text-sm text-ink/60">
                  Original shipping is quoted separately. Print shipping is
                  calculated by Fourthwall.
                </p>
                <Link
                  href="/shop/international"
                  className="button-secondary mt-7"
                >
                  Enter the International Shop <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <TikTokLiveSection tiktokUrl={links.tiktokUrl} />

      <StudioLetterSignup variant="story-preview" context="home" />

      <section className="border-y border-ink/10 bg-ochre/10">
        <div className="section-shell grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <ArtistPhotoFrame
            src={homeAboutImage}
            alt="Aida Ramezani holding a carefully packed artwork in her Istanbul studio"
          />
          <div className="section-heading">
            <p className="eyebrow">About the artist</p>
            <h2>Made by Aida Ramezani in Istanbul</h2>
            <p>
              Every original painting, studio good and Mystery Mail package is
              created, selected or prepared personally in the studio.
            </p>
            <p>
              The goal is to make collecting art feel personal, approachable and
              connected to the artist who created it.
            </p>
            <Link href="/about" className="button-link mt-2">
              Meet the artist <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <p className="eyebrow">Ordering</p>
          <h2>How Turkey Orders Work</h2>
        </div>
        <ol className="mt-10 grid gap-px bg-ink/10 md:grid-cols-3">
          {[
            [
              "01",
              "Choose your artwork",
              "Explore the available originals, Prints & Goods and Mystery Mail.",
            ],
            [
              "02",
              "Add items to your basket",
              "Select your preferred products and framing options.",
            ],
            [
              "03",
              "Continue to WhatsApp",
              "Send your basket through WhatsApp to confirm availability, delivery and payment details.",
            ],
          ].map(([number, title, copy]) => (
            <li key={number} className="bg-card p-7">
              <span className="font-hand text-2xl text-coral">{number}</span>
              <h3 className="mt-5 text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{copy}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 border-l-2 border-coral pl-5 text-sm leading-relaxed text-ink/65">
          <p>No online payment is collected through this website.</p>
          <p>
            International originals are arranged with Aida. International prints
            are completed through Fourthwall.
          </p>
        </div>
      </section>

      <section className="bg-blue text-paper">
        <div className="section-shell text-center">
          <p className="eyebrow !text-paper/55">Social</p>
          <h2 className="mt-4 text-4xl text-paper md:text-6xl">
            Follow the Studio
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-paper/70">
            See new paintings, behind the scenes studio moments, packaging
            videos and upcoming releases.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              ["Instagram", links.instagramUrl],
              ["TikTok", links.tiktokUrl],
              ["YouTube", links.youtubeUrl],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="button-secondary !border-paper/40 !text-paper hover:!bg-paper hover:!text-ink"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
