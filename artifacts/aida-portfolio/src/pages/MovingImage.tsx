import { Link, useRoute } from "wouter";
import { ArrowRight } from "lucide-react";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";

function youtubeEmbed(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return value;
      const id =
        url.searchParams.get("v") ||
        url.pathname.match(/^\/(?:shorts|live)\/([^/]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    return value;
  } catch {
    return "";
  }
}

export function MovingImage() {
  const settings = useShopSettings();
  const publishedProjects = [...settings.movingImageProjects]
    .filter((item) => item.status === "published")
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.displayOrder - b.displayOrder,
    );
  const videoProjects = publishedProjects.filter((project) =>
    youtubeEmbed(project.videoUrl),
  );
  const galleryMedia = Array.from(
    new Set([
      ...settings.animationGalleryMedia,
      ...settings.movingImageProjects.flatMap((project) => [
        ...project.stillImages,
        ...(!project.videoUrl && project.thumbnail ? [project.thumbnail] : []),
      ]),
    ]),
  ).filter(Boolean);
  usePageMeta(
    "Animation | Aeda Art",
    "Animation, music visuals and moving worlds by Aida Ramezani.",
  );
  return (
    <main className="animation-page">
      <header className="animation-hero section-shell">
        <p className="portfolio-kicker">SELECTED WORK</p>
        <h1>Animation</h1>
        <p>Moving worlds shaped by music, memory and imagination.</p>
      </header>
      {videoProjects.length > 0 && (
        <section className="animation-films section-shell">
          <div className="animation-section-heading">
            <p className="portfolio-kicker">PROJECTS</p>
            <h2>Selected films</h2>
          </div>
          {videoProjects.map((project) => (
            <article className="animation-film" key={project.id}>
              <iframe
                src={youtubeEmbed(project.videoUrl)}
                title={`${project.title} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <div className="animation-film__caption">
                <div>
                  <small>
                    {project.projectType} · {project.year}
                  </small>
                  <h3>{project.title}</h3>
                  {(project.artistName || project.client) && (
                    <p>{project.artistName || project.client}</p>
                  )}
                </div>
                <Link href={`/moving-image/${project.slug}`}>
                  View project <ArrowRight />
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
      {galleryMedia.length > 0 ? (
        <section className="animation-samples section-shell">
          <div className="animation-section-heading">
            <p className="portfolio-kicker">EXPERIMENTS &amp; STUDIES</p>
            <h2>Animation gallery</h2>
          </div>
          <div className="animation-samples__grid">
            {galleryMedia.map((src, index) => (
              <figure key={`${src}-${index}`}>
                <img
                  src={src}
                  alt={`Animation work sample ${index + 1}`}
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        </section>
      ) : videoProjects.length === 0 ? (
        <section className="portfolio-empty section-shell">
          <p>New animation work is being prepared for this space.</p>
        </section>
      ) : null}
      <section className="animation-commission section-shell">
        <div>
          <p className="portfolio-kicker">COMMISSIONS</p>
          <h2>Looking for a moving world of your own?</h2>
        </div>
        <Link href="/commissions/moving-image" className="portfolio-text-link">
          Commission an animation <ArrowRight />
        </Link>
      </section>
    </main>
  );
}

export function MovingImageDetail() {
  const [, params] = useRoute("/moving-image/:slug");
  const settings = useShopSettings();
  const project = settings.movingImageProjects.find(
    (item) => item.slug === params?.slug && item.status === "published",
  );
  usePageMeta(
    project?.seoTitle || `${project?.title || "Animation"} | Aeda Art`,
    project?.seoDescription || project?.shortDescription || "",
  );
  if (!project)
    return (
      <section className="portfolio-empty section-shell">
        <h1>Project not found.</h1>
        <Link href="/moving-image">Animation</Link>
      </section>
    );

  const embed = youtubeEmbed(project.videoUrl);
  return (
    <article className="animation-detail">
      <header className="animation-detail__hero section-shell">
        <div>
          <p className="portfolio-kicker">
            {project.projectType} · {project.year}
          </p>
          <h1>{project.title}</h1>
          {(project.artistName || project.client) && (
            <p className="animation-detail__artist">
              For {project.artistName || project.client}
            </p>
          )}
          <p>{project.shortDescription}</p>
        </div>
        {project.thumbnail && (
          <img src={project.thumbnail} alt={project.title} />
        )}
      </header>
      {embed && (
        <section className="animation-detail__video section-shell">
          <iframe
            src={embed}
            title={`${project.title} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </section>
      )}
      {project.story && (
        <section className="animation-detail__story section-shell">
          <p className="portfolio-kicker">THE PROJECT</p>
          <p>{project.story}</p>
          {project.credits && <small>{project.credits}</small>}
        </section>
      )}
      {project.stillImages.length > 0 && (
        <section className="animation-stills section-shell">
          {project.stillImages.map((src, index) => (
            <img
              src={src}
              alt={`${project.title} still ${index + 1}`}
              loading="lazy"
              key={`${src}-${index}`}
            />
          ))}
        </section>
      )}
      <section className="animation-commission section-shell">
        <h2>Looking for visuals for your music?</h2>
        <Link href="/commissions/moving-image">
          Commission an animation <ArrowRight />
        </Link>
      </section>
    </article>
  );
}
