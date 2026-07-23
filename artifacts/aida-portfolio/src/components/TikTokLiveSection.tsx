import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  tiktokLiveSection,
  type TikTokLiveArtwork,
} from "@/config/tiktok-live";
import { formatCompactNumber } from "@/lib/compact-number";

interface TikTokLiveSectionProps {
  tiktokUrl: string;
  enabled?: boolean;
  secondaryCtaLabel?: string;
  artworks?: readonly TikTokLiveArtwork[];
}

export function LiveSocialProof() {
  const { likes, views, comments, newFollowers, liveHours } =
    tiktokLiveSection.stats;

  return (
    <div className="home-live-section__proof">
      <p className="home-live-section__proof-context">
        {tiktokLiveSection.statsLabel}
      </p>
      <p className="home-live-section__proof-value" aria-hidden="true">
        {formatCompactNumber(likes)}
      </p>
      <p className="sr-only">
        {likes.toLocaleString("en-US")} likes during recent LIVE sessions
      </p>
      <p className="home-live-section__proof-label">
        Likes during recent LIVE sessions
      </p>
      <p className="home-live-section__supporting-metrics" aria-hidden="true">
        {formatCompactNumber(views)} views · {formatCompactNumber(comments)}
        comments · {liveHours} hours live
      </p>
      <p className="sr-only">
        {views.toLocaleString("en-US")} views,{" "}
        {comments.toLocaleString("en-US")}
        comments, {liveHours} hours live, and{" "}
        {newFollowers.toLocaleString("en-US")}
        new followers.
      </p>
    </div>
  );
}

function LiveArtworkCard({ artwork }: { artwork: TikTokLiveArtwork }) {
  return (
    <li
      className={`home-live-section__piece home-live-section__piece--${artwork.collageStyleKey}`}
    >
      <img
        src={artwork.imageUrl}
        srcSet={`${artwork.imageUrl} 800w, ${artwork.imageUrlLarge} 1400w`}
        sizes="(max-width: 900px) 80vw, 30vw"
        width={artwork.width}
        height={artwork.height}
        alt={artwork.alt}
        loading="lazy"
        decoding="async"
      />
    </li>
  );
}

export function LiveArtworkComposition({
  artworks,
}: {
  artworks: readonly TikTokLiveArtwork[];
}) {
  return (
    <ul
      className="home-live-section__artworks"
      aria-label="Paintings created during TikTok LIVE sessions"
    >
      {[...artworks]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((artwork) => (
          <LiveArtworkCard key={artwork.id} artwork={artwork} />
        ))}
    </ul>
  );
}

export default function TikTokLiveSection({
  tiktokUrl,
  enabled = tiktokLiveSection.enabled,
  secondaryCtaLabel = tiktokLiveSection.secondaryCtaLabel,
  artworks = tiktokLiveSection.artworks,
}: TikTokLiveSectionProps) {
  if (!enabled) return null;

  return (
    <section
      className="home-live-section"
      aria-labelledby="tiktok-live-heading"
    >
      <div className="section-shell home-live-section__layout">
        <div className="home-live-section__content">
          <div className="home-live-section__identity">
            <span className="home-live-section__logo-badge">
              <img
                src="/assets/tik-tok-logo_578229-290.avif"
                alt=""
                aria-hidden="true"
              />
            </span>
            <p className="eyebrow !text-paper/55">
              {tiktokLiveSection.eyebrow}
            </p>
          </div>
          <h2 id="tiktok-live-heading">{tiktokLiveSection.heading}</h2>
          <p className="home-live-section__description">
            {tiktokLiveSection.description}
          </p>
          <LiveSocialProof />
          <div className="home-live-section__actions">
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary"
            >
              {tiktokLiveSection.primaryCtaLabel}
              <ArrowUpRight size={16} aria-hidden="true" />
              <span className="sr-only"> (opens TikTok in a new tab)</span>
            </a>
            {secondaryCtaLabel && (
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="home-live-section__follow"
              >
                {secondaryCtaLabel} <ArrowRight size={15} aria-hidden="true" />
                <span className="sr-only"> (opens TikTok in a new tab)</span>
              </a>
            )}
          </div>
        </div>
        <LiveArtworkComposition artworks={artworks} />
      </div>
    </section>
  );
}
