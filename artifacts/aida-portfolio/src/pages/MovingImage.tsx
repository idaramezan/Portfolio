import { Link, useRoute } from "wouter";
import { ArrowDown, ArrowRight, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useLocale } from "@/lib/locale";
import EnquiryForm from "@/components/EnquiryForm";
import type { MovingImageProject } from "@/lib/store";

function youtubeId(value = "") {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || "";
    return url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] || "";
  } catch { return ""; }
}

function youtubeEmbed(value = "") {
  const id = youtubeId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : "";
}

function projectCover(project: MovingImageProject) {
  const id = youtubeId(project.videoUrl);
  return project.thumbnail || (id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : "");
}

function Background({ media, poster }: { media: string; poster: string }) {
  return <div className="moving-atmosphere" aria-hidden="true">
    <img className="moving-atmosphere__poster" src={poster} alt="" />
    <video className="moving-atmosphere__video" autoPlay muted loop playsInline preload="metadata" poster={poster}><source src={media} /></video>
    <div className="moving-atmosphere__veil" /><div className="moving-atmosphere__grain" />
  </div>;
}

function MediaLightbox({ project, onClose }: { project: MovingImageProject; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const embed = youtubeEmbed(project.videoUrl);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab") { event.preventDefault(); closeRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return <div className="moving-lightbox" role="dialog" aria-modal="true" aria-label={`${project.title} film`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <button ref={closeRef} onClick={onClose} aria-label="Close film"><X /></button>
    <div className="moving-lightbox__media">{embed ? <iframe src={embed} title={project.title} allow="encrypted-media; picture-in-picture" allowFullScreen /> : <video src={project.primaryMedia || project.videoUrl} controls poster={project.thumbnail} />}</div>
  </div>;
}

export function MovingImage() {
  const settings = useShopSettings();
  const { locale } = useLocale();
  const tr = locale === "tr";
  const page = settings.movingImagePage;
  const projects = useMemo(() => [...settings.movingImageProjects].filter((p) => p.status === "published").sort((a,b) => a.displayOrder - b.displayOrder), [settings.movingImageProjects]);
  const featured = projects.find((p) => p.featured) || projects[0];
  const [lightbox, setLightbox] = useState<MovingImageProject | null>(null);
  usePageMeta("Moving Image | Aeda Art", "Animation, music visuals and moving worlds by Aida Ramezani.");
  return <main className="moving-page">
    <Background media={page.heroBackgroundMedia} poster={page.heroFallbackImage} />
    <section className="moving-hero" aria-labelledby="moving-title"><div className="moving-shell moving-hero__content">
      <p className="moving-kicker">{page.heroEyebrow}</p><h1 id="moving-title">{page.heroTitle}</h1><p className="moving-hero__copy">{page.heroDescription}</p>
      <div className="moving-hero__actions"><a href="#selected-work" className="moving-button">{page.primaryCtaLabel} <ArrowDown /></a><a href="#commission" className="moving-text-link">{tr ? "Bir proje sipariş et" : "Commission a project"}</a></div>
    </div><p className="moving-hero__index" aria-hidden="true">01 / 04</p></section>

    <section id="selected-work" className="moving-archive"><div className="moving-shell">
      <header className="moving-section-heading"><p className="moving-kicker">{tr ? "SEÇİLMİŞ İŞLER" : "SELECTED WORK"}</p><h2>{page.archiveHeading}</h2><p>{tr ? "Animasyon, döngü ve müzik için yaratılmış görsel dünyalar." : "Animation, loops and visual worlds made for music."}</p></header>
      {projects.length ? <div className="moving-grid">{projects.map((project, index) => {
        const cover = projectCover(project); const playable = Boolean(youtubeEmbed(project.videoUrl) || project.primaryMedia || project.previewUrl);
        return <article className={`moving-card moving-card--${index % 5}`} key={project.id}><div className="moving-card__media">
          {cover ? <img src={cover} alt={project.title} loading={index > 1 ? "lazy" : "eager"} /> : <div className="moving-card__placeholder" />}
          <div className="moving-card__overlay">{playable && <button type="button" onClick={() => setLightbox(project)} aria-label={`Play ${project.title}`}><Play fill="currentColor" /></button>}<Link href={`/moving-image/${project.slug}`}>{tr ? "Projeyi gör" : "View project"} <ArrowRight /></Link></div>
        </div><div className="moving-card__caption"><p>{project.category || project.projectType} · {project.year}</p><h3><Link href={`/moving-image/${project.slug}`}>{project.title}</Link></h3>{(project.artistName || project.client) && <span>{project.artistName || project.client}</span>}</div></article>;
      })}</div> : <p className="moving-empty">{tr ? "Yeni hareketli görüntü çalışmaları yakında burada olacak." : "New moving-image work is being prepared for this space."}</p>}
    </div></section>

    {featured && <section className="moving-featured"><div className="moving-shell moving-featured__grid"><div className="moving-featured__media">
      {projectCover(featured) && <img src={projectCover(featured)} alt={featured.title} loading="lazy" />}{(youtubeEmbed(featured.videoUrl) || featured.primaryMedia) && <button onClick={() => setLightbox(featured)} aria-label={`Play ${featured.title}`}><Play fill="currentColor" /></button>}
    </div><div className="moving-featured__text"><p className="moving-kicker">{tr ? "ÖNE ÇIKAN PROJE" : "FEATURED PROJECT"}</p><h2>{featured.title}</h2>{(featured.artistName || featured.client) && <p className="moving-featured__artist">{tr ? "Sanatçı" : "For"} {featured.artistName || featured.client}</p>}
      <dl><div><dt>{tr ? "Rol" : "Role"}</dt><dd>{featured.role}</dd></div><div><dt>{tr ? "Yıl" : "Year"}</dt><dd>{featured.year}</dd></div></dl><p>{featured.shortDescription}</p><Link href={`/moving-image/${featured.slug}`} className="moving-button">{tr ? "Projeyi gör" : "View project"} <ArrowRight /></Link>
    </div></div></section>}

    <section id="commission" className="moving-commission-panel"><div className="moving-shell moving-commission-panel__grid"><div><p className="moving-kicker">{tr ? "BİRLİKTE ÇALIŞALIM" : "WORK WITH ME"}</p><h2>{tr ? "Bir hareketli görüntü sipariş edin." : page.commissionHeading}</h2><p>{tr ? "Müzik, hafıza, karakterler, bir hikâyenin parçaları — ne yaptığınızı ve nasıl hissettirmesini istediğinizi anlatın." : page.commissionDescription}</p></div><EnquiryForm kind="moving_image" subjectName="Moving Image commission" variant="moving" /></div></section>
    {lightbox && <MediaLightbox project={lightbox} onClose={() => setLightbox(null)} />}
  </main>;
}

export function MovingImageDetail() {
  const [, params] = useRoute("/moving-image/:slug"); const settings = useShopSettings(); const { locale } = useLocale();
  const project = settings.movingImageProjects.find((p) => p.slug === params?.slug && p.status === "published");
  usePageMeta(project?.seoTitle || `${project?.title || "Moving Image"} | Aeda Art`, project?.seoDescription || project?.shortDescription || "");
  if (!project) return <main className="moving-page moving-detail"><div className="moving-shell moving-empty"><h1>Project not found.</h1><Link href="/moving-image">Moving Image</Link></div></main>;
  const embed = youtubeEmbed(project.videoUrl); const next = settings.movingImageProjects.filter((p) => p.status === "published" && p.id !== project.id).sort((a,b) => a.displayOrder-b.displayOrder)[0];
  return <main className="moving-page moving-detail"><header className="moving-detail__hero moving-shell"><p className="moving-kicker">{project.category || project.projectType} · {project.year}</p><h1>{project.title}</h1><p>{project.shortDescription}</p></header>
    <section className="moving-detail__film moving-shell">{embed ? <iframe src={embed} title={project.title} allow="encrypted-media; picture-in-picture" allowFullScreen /> : project.primaryMedia ? <video src={project.primaryMedia} controls poster={project.thumbnail} /> : project.thumbnail && <img src={project.thumbnail} alt={project.title} />}</section>
    <section className="moving-detail__story moving-shell"><p className="moving-kicker">{locale === "tr" ? "PROJE" : "THE PROJECT"}</p><div><p>{project.story}</p><dl><div><dt>Role</dt><dd>{project.role}</dd></div>{(project.artistName || project.client) && <div><dt>Client / Artist</dt><dd>{project.artistName || project.client}</dd></div>}</dl>{project.credits && <small>{project.credits}</small>}</div></section>
    {project.stillImages.length > 0 && <section className="moving-detail__stills moving-shell">{project.stillImages.map((src,i) => <img src={src} alt={`${project.title} still ${i+1}`} loading="lazy" key={src} />)}</section>}
    {next && <Link className="moving-next moving-shell" href={`/moving-image/${next.slug}`}><span>NEXT PROJECT</span><strong>{next.title}</strong><ArrowRight /></Link>}
  </main>;
}
