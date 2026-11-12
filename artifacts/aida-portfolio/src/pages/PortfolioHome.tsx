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
import { isPurchasable } from "@/lib/product-status";

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
  const originals = selectShowcaseProducts(
    settings.originalProducts.filter(
      (product) =>
        product.kind === "original" &&
        product.availableInTurkiye !== false &&
        isPurchasable(product),
    ),
    [
      ...(content.featuredOriginalId ? [content.featuredOriginalId] : []),
      ...(content.supportingOriginalIds || content.featuredOriginalIds),
    ],
  );
  const limitedPrints = selectShowcaseProducts(
    settings.printProducts.filter(
      (product) =>
        product.kind === "print" &&
        (product.category || "print") === "print" &&
        product.availableInTurkiye !== false &&
        isPurchasable(product),
    ),
    [
      ...(content.featuredPrintId ? [content.featuredPrintId] : []),
      ...(content.supportingPrintIds || content.featuredPrintIds),
    ],
  );

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
      {(originals.length > 0 || limitedPrints.length > 0) && (
        <div className="home-showcases">
          {originals.length > 0 && (
            <CommerceShowcase
              kind="original"
              eyebrow="ONE OF A KIND"
              title="Originals"
              description="One painting, one home. Original works made by Aida, available as individual pieces."
              products={originals}
              listingHref="/paintings"
              cta="View originals"
            />
          )}
          {limitedPrints.length > 0 && (
            <CommerceShowcase
              kind="print"
              eyebrow="SIGNED ART PRINTS"
              title="Limited Prints"
              description="Signed prints made from Aida’s original work, produced in limited editions for collectors."
              products={limitedPrints}
              listingHref="/shop?category=prints"
              cta="View limited prints"
            />
          )}
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

function newestFirst(a: ManagedProduct, b: ManagedProduct) {
  const aDate = Date.parse(a.createdAt || a.updatedAt || "") || 0;
  const bDate = Date.parse(b.createdAt || b.updatedAt || "") || 0;
  return bDate - aDate || (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
}

function selectShowcaseProducts(
  available: ManagedProduct[],
  selectedIds: string[],
) {
  const selected = selectedIds
    .map((id) => available.find((product) => product.id === id))
    .filter((product): product is ManagedProduct => Boolean(product))
    .filter(
      (product, index, all) =>
        all.findIndex((item) => item.id === product.id) === index,
    );
  const candidates = [...available]
    .sort(newestFirst)
    .filter(
      (product) =>
        !selected.some((item) => item.id === product.id) &&
        !selected.some((item) => item.imageUrl === product.imageUrl),
    );
  return [...selected, ...candidates].slice(0, 4);
}

function CommerceShowcase({
  kind,
  eyebrow,
  title,
  description,
  products,
  listingHref,
  cta,
}: {
  kind: "original" | "print";
  eyebrow: string;
  title: string;
  description: string;
  products: ManagedProduct[];
  listingHref: string;
  cta: string;
}) {
  const featured = products[0];
  const supporting = products.slice(1, 4);
  const productHref = (product: ManagedProduct) =>
    kind === "original"
      ? `/artworks/${product.slug || product.id}`
      : `/shop/prints/${product.slug || product.id}`;
  return (
    <section
      className={`home-showcase home-showcase--${kind} section-shell`}
    >
      <div className="home-showcase__copy">
        <p className="portfolio-kicker">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Link
        className="home-showcase__media"
        href={productHref(featured)}
        aria-label={`${title}: ${featured.name}`}
      >
        <img
          src={featured.imageUrl}
          alt={featured.altText || featured.name}
          loading="lazy"
        />
      </Link>
      <div className="home-showcase__footer">
        {supporting.length > 0 && (
          <div
            className="home-showcase__previews"
            aria-label={`${title} artwork previews`}
          >
            {supporting.map((product) => (
              <Link
                key={product.id}
                href={productHref(product)}
                aria-label={`View ${product.name}`}
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
        <Link className="home-showcase__cta" href={listingHref}>
          {cta} <ArrowRight />
        </Link>
      </div>
    </section>
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
              <Link
                className="portfolio-text-link"
                href={`/limited-collections/${release.slug}`}
              >
                Explore this month&apos;s editions <ArrowRight />
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
