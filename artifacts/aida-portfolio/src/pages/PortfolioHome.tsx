import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { heroPortrait } from "@/lib/assets";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import type {
  LimitedEditionGroup,
  ManagedProduct,
  WeeklyLimitedCollection,
} from "@/lib/store";

const fallbackHero = "/assets/aida-green-gallery-hero.png";

export default function PortfolioHome() {
  const settings = useShopSettings();
  const content = settings.homepageContent;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let offset = 0;
    void fetch("/api/time", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const serverNow = Date.parse(data?.now || "");
        if (Number.isFinite(serverNow)) {
          offset = serverNow - Date.now();
          setNow(serverNow);
        }
      })
      .catch(() => undefined);
    const timer = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(timer);
  }, []);
  usePageMeta(
    "Aeda Art | Limited Editions & Original Paintings",
    "Weekly limited editions, available original paintings and art prints by Aida Ramezani.",
  );
  const releases = [...settings.weeklyLimitedCollections].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const active = releases.find((item) => releaseState(item, now) === "active");
  const next = releases
    .filter((item) => releaseState(item, now) === "scheduled")
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))[0];
  const configured = releases.find(
    (item) =>
      item.editionGroupIds.length > 0 &&
      !["closed", "archived"].includes(item.status),
  );
  const release = active || next || configured;
  const releaseIsLive = Boolean(
    release &&
    !["closed", "archived"].includes(release.status) &&
    (!Number.isFinite(Date.parse(release.startAt)) ||
      now >= Date.parse(release.startAt)) &&
    (!Number.isFinite(Date.parse(release.endAt)) ||
      now < Date.parse(release.endAt)),
  );
  const weeklyGroups = (release?.editionGroupIds || [])
    .map((id) => settings.limitedEditionGroups.find((group) => group.id === id))
    .filter(
      (x): x is LimitedEditionGroup =>
        Boolean(x) && x?.editionEnabled !== false,
    )
    .slice(0, 3);
  const eras = [...settings.artEras]
    .filter((era) => era.status === "published" && era.featuredOnHomepage)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="weekly-home">
      <WeeklyHero
        release={release}
        active={releaseIsLive}
        now={now}
        fallback={{
          image: content.hero.image || fallbackHero,
          title: content.hero.headline,
          description: content.hero.supportingText,
        }}
      />
      {weeklyGroups.length > 0 && (
        <section id="weekly-editions" className="weekly-editions section-shell">
          <div className="weekly-editions__features">
            {weeklyGroups.map((group, index) => (
              <EditionFeature
                key={group.id}
                group={group}
                product={settings.printProducts.find(
                  (item) => item.id === group.productId,
                )}
                release={release}
                now={now}
                index={index}
              />
            ))}
          </div>
        </section>
      )}
      {eras.length > 0 && (
        <div className="home-eras">
          {eras.map((era, index) => {
            const previews = era.printIds
              .map((id) =>
                settings.printProducts.find((product) => product.id === id),
              )
              .filter((product): product is ManagedProduct => Boolean(product))
              .slice(0, 3);
            return (
              <section
                key={era.id}
                className={`home-era section-shell ${index % 2 ? "home-era--reverse" : ""}`}
              >
                <Link className="home-era__media" href={`/eras/${era.slug}`}>
                  <img src={era.heroImage} alt={era.title} loading="lazy" />
                </Link>
                <div className="home-era__copy">
                  <p className="portfolio-kicker">
                    {era.eyebrow || "AN ERA IN MY ART JOURNEY"}
                  </p>
                  <h2>{era.title}</h2>
                  {era.shortDescription && <p>{era.shortDescription}</p>}
                  {previews.length > 0 && (
                    <div
                      className="home-era__previews"
                      aria-label={`Explore ${era.title}`}
                    >
                      {previews.map((product) => (
                        <Link
                          key={product.id}
                          href={`/eras/${era.slug}`}
                          aria-label={`View ${era.title}`}
                        >
                          <img
                            src={product.imageUrl}
                            alt={product.altText || product.name}
                            loading="lazy"
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link className="home-era__cta" href={`/eras/${era.slug}`}>
                    View era <ArrowRight />
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
      <section className="home-about-preview section-shell">
        <img
          src={content.about.portrait || heroPortrait}
          alt="Aida Ramezani"
          loading="lazy"
        />
        <div>
          <p className="portfolio-kicker">
            {content.about.eyebrow || "ABOUT AIDA"}
          </p>
          <h2>{content.about.headline}</h2>
          <p>{content.about.paragraph}</p>
          <Link className="portfolio-text-link" href={content.about.ctaUrl}>
            {content.about.cta}
            <ArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}

function releaseState(release: WeeklyLimitedCollection, now: number) {
  if (["draft", "archived"].includes(release.status)) return release.status;
  const start = Date.parse(release.startAt),
    end = Date.parse(release.endAt);
  if (Number.isFinite(end) && now >= end) return "closed";
  if (Number.isFinite(start) && now < start) return "scheduled";
  return release.status === "closed" ? "closed" : "active";
}
function remaining(group: LimitedEditionGroup) {
  return group.units.filter((unit) => unit.status === "available").length;
}
function Countdown({
  to,
  now,
  prefix,
}: {
  to: string;
  now: number;
  prefix: string;
}) {
  const delta = Math.max(0, Date.parse(to) - now),
    days = Math.floor(delta / 86400000),
    hours = Math.floor(delta / 3600000) % 24,
    minutes = Math.floor(delta / 60000) % 60,
    seconds = Math.floor(delta / 1000) % 60;
  return (
    <div
      className="release-countdown"
      role="timer"
      aria-label={`${prefix}: ${days} days, ${hours} hours, ${minutes} minutes`}
    >
      <small>{prefix}</small>
      <div>
        <span>
          <strong>{String(days).padStart(2, "0")}</strong>DAYS
        </span>
        <i>:</i>
        <span>
          <strong>{String(hours).padStart(2, "0")}</strong>HOURS
        </span>
        <i>:</i>
        <span>
          <strong>{String(minutes).padStart(2, "0")}</strong>MIN
        </span>
        <i>:</i>
        <span>
          <strong>{String(seconds).padStart(2, "0")}</strong>SEC
        </span>
      </div>
    </div>
  );
}
function WeeklyHero({
  release,
  active,
  now,
  fallback,
}: {
  release?: WeeklyLimitedCollection;
  active: boolean;
  now: number;
  fallback: { image: string; title: string; description: string };
}) {
  const scheduled = release && !active;
  return (
    <section className="weekly-hero section-shell">
      <div className="weekly-hero__media">
        <img
          src={release?.heroImage || fallback.image}
          alt={release?.title || "Artwork by Aida Ramezani"}
          fetchPriority="high"
        />
      </div>
      <div className="weekly-hero__copy">
        <p className="portfolio-kicker">
          {scheduled
            ? "NEXT LIMITED COLLECTION"
            : release
              ? "THIS WEEK'S LIMITED COLLECTION"
              : "AEDA ART"}
        </p>
        <h1>{release?.title || fallback.title}</h1>
        <p>{release?.shortDescription || fallback.description}</p>
        {release && (
          <>
            <p className="weekly-hero__date">
              {scheduled ? "Launching" : "Available only until"}{" "}
              {new Intl.DateTimeFormat("en", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(scheduled ? release.startAt : release.endAt))}
            </p>
            <Countdown
              to={scheduled ? release.startAt : release.endAt}
              now={now}
              prefix={
                scheduled
                  ? "This collection opens in"
                  : "This release closes in"
              }
            />
            {active && (
              <Link className="portfolio-text-link" href="#weekly-editions">
                Explore this week's editions <ArrowRight />
              </Link>
            )}
          </>
        )}
      </div>
    </section>
  );
}
function editorialExcerpt(value: string) {
  const text = value.trim();
  if (text.length <= 260) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let excerpt = "";
  for (const sentence of sentences) {
    if (excerpt.length + sentence.length <= 260) excerpt += sentence;
  }
  return excerpt.trim() || `${text.slice(0, 257).trimEnd()}…`;
}
function EditionFeature({
  group,
  product,
  release,
  now,
  index,
}: {
  group: LimitedEditionGroup;
  product?: ManagedProduct;
  release?: WeeklyLimitedCollection;
  now: number;
  index: number;
}) {
  const [liveRemaining, setLiveRemaining] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void fetch(
        `/api/limited-editions/${encodeURIComponent(group.slug)}/availability`,
        { cache: "no-store" },
      )
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (active && Number.isFinite(data?.remaining))
            setLiveRemaining(Number(data.remaining));
        })
        .catch(() => undefined);
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [group.slug]);
  const left = liveRemaining ?? remaining(group),
    closed =
      !release ||
      releaseState(release, now) === "closed" ||
      group.status === "closed",
    soldOut = left === 0;
  const title = group.homepageTitleOverride || product?.name || group.title;
  const story = editorialExcerpt(
    group.homepageStoryOverride ||
      product?.description ||
      group.description ||
      group.story,
  );
  const image =
    group.homepageImageOverride ||
    product?.imageUrl ||
    group.image ||
    fallbackHero;
  const href = product
    ? `/shop/prints/${product.slug || product.id}?limited=${encodeURIComponent(group.id)}`
    : `/limited-editions/${group.slug}`;
  return (
    <article
      className={`edition-feature ${index % 2 === 1 ? "edition-feature--reverse" : ""}`}
    >
      <div className="edition-feature__copy">
        <p className="edition-feature__eyebrow">
          LIMITED EDITION · {group.editionSize}
        </p>
        <h2>{title}</h2>
        {story && <p className="edition-feature__story">{story}</p>}
        {(soldOut || closed) && (
          <p className="edition-feature__status">
            {soldOut ? "SOLD OUT" : "EDITION CLOSED"}
          </p>
        )}
        {release?.endAt && !closed && (
          <p className="edition-feature__deadline">
            Available until{" "}
            {new Intl.DateTimeFormat("en", {
              day: "numeric",
              month: "long",
            }).format(new Date(release.endAt))}
          </p>
        )}
        {!closed && !soldOut && (
          <Link className="edition-feature__cta" href={href}>
            {group.homepageCtaLabel || "View this edition"} <ArrowRight />
          </Link>
        )}
      </div>
      <Link className="edition-feature__media" href={href} aria-label={title}>
        <img
          src={image}
          alt={product?.altText || title}
          loading="lazy"
          style={{ objectPosition: group.homepageImageFocalPoint || "center" }}
        />
      </Link>
    </article>
  );
}
