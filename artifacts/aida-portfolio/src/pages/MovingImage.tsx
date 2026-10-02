import { Link, useRoute } from "wouter";
import { ArrowRight } from "lucide-react";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";

export function MovingImage() {
  const settings = useShopSettings();
  const projects = [...settings.movingImageProjects]
    .filter((item) => item.status === "published")
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.displayOrder - b.displayOrder,
    );
  usePageMeta(
    "Moving Image | Aeda Art",
    "Animation, music visuals and moving worlds by Aida Ramezani.",
  );
  return (
    <div className="moving-page">
      <header className="portfolio-page-header section-shell">
        <p className="portfolio-kicker">MOVING IMAGE</p>
        <h1>Stories that move.</h1>
        <p>
          Some images need movement. Music often leaves me with colours, places
          and rhythms that become animation, visual experiments and work for
          musicians.
        </p>
      </header>
      {projects.length ? (
        <div className="moving-projects section-shell">
          {projects.map((project, index) => (
            <Link
              href={`/moving-image/${project.slug}`}
              className={
                index === 0
                  ? "moving-project moving-project--featured"
                  : "moving-project"
              }
              key={project.id}
            >
              <img
                src={project.thumbnail}
                alt={project.title}
                loading={index ? "lazy" : "eager"}
              />
              <span>
                <small>
                  {project.projectType} · {project.year}
                </small>
                <strong>{project.title}</strong>
                <em>{project.client}</em>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="portfolio-empty section-shell">
          <p>New moving-image work is being prepared for this space.</p>
        </section>
      )}
      <section className="moving-commission section-shell">
        <div>
          <p className="portfolio-kicker">COMMISSIONS</p>
          <h2>Looking for visuals for your music?</h2>
        </div>
        <Link href="/commissions/moving-image" className="portfolio-text-link">
          Commission a project <ArrowRight />
        </Link>
      </section>
    </div>
  );
}

export function MovingImageDetail() {
  const [, params] = useRoute("/moving-image/:slug");
  const settings = useShopSettings();
  const project = settings.movingImageProjects.find(
    (item) => item.slug === params?.slug && item.status === "published",
  );
  usePageMeta(
    project?.seoTitle || `${project?.title || "Moving Image"} | Aeda Art`,
    project?.seoDescription || project?.shortDescription || "",
  );
  if (!project)
    return (
      <section className="portfolio-empty section-shell">
        <h1>Project not found.</h1>
        <Link href="/moving-image">Moving Image</Link>
      </section>
    );
  return (
    <article className="moving-detail">
      <header className="portfolio-page-header section-shell">
        <p className="portfolio-kicker">{project.projectType}</p>
        <h1>{project.title}</h1>
        <p>
          {project.client} · {project.role} · {project.year}
        </p>
      </header>
      <div className="moving-detail__video section-shell">
        {project.videoUrl ? (
          <iframe
            src={project.videoUrl}
            title={project.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <img src={project.thumbnail} alt={project.title} />
        )}
      </div>
      <section className="moving-detail__story section-shell">
        <p>{project.story || project.shortDescription}</p>
        {project.externalUrl && (
          <a href={project.externalUrl} target="_blank" rel="noreferrer">
            Watch the release <ArrowRight />
          </a>
        )}
      </section>
      {project.stillImages.length > 0 && (
        <div className="moving-stills section-shell">
          {project.stillImages.map((src) => (
            <img
              src={src}
              alt={`${project.title} still`}
              loading="lazy"
              key={src}
            />
          ))}
        </div>
      )}
      <section className="moving-commission section-shell">
        <h2>Looking for visuals for your music?</h2>
        <Link href="/commissions/moving-image">
          Commission a project <ArrowRight />
        </Link>
      </section>
    </article>
  );
}
