import { Link, useRoute } from "wouter";
import { ArrowRight, Menu, Play, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  return project.thumbnail || project.primaryMedia || project.previewUrl || project.stillImages?.[0] || (id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : "");
}

type NormalizedMediaType = "gif" | "video" | "youtube" | "image";
function normalizeMediaType(value = "", url = ""): NormalizedMediaType {
  const type = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const source = url.split(/[?#]/, 1)[0].toLowerCase();
  if (type.includes("gif") || type.includes("loop") || source.endsWith(".gif")) return "gif";
  if (type.includes("youtube") || youtubeId(url)) return "youtube";
  if (type.includes("video") || type.includes("animation") || /\.(mp4|m4v|mov|webm)$/.test(source)) return "video";
  return "image";
}

function isPublished(project: MovingImageProject) {
  const record = project as MovingImageProject & { published?: boolean; visible?: boolean };
  return (record.status === "published" || record.published === true) && record.visible !== false;
}

function Background({ media, poster }: { media: string; poster: string }) {
  return <div className="moving-atmosphere" aria-hidden="true">
    <img className="moving-atmosphere__poster" src={poster} alt="" />
    <video className="moving-atmosphere__video" autoPlay muted loop playsInline preload="metadata" poster={poster}><source src={media} /></video>
    <div className="moving-atmosphere__veil" /><div className="moving-atmosphere__grain" />
  </div>;
}

export function MovingImageLayout({ children }: { children: ReactNode }) {
  const settings = useShopSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="mi-world">
    <Background media={settings.movingImagePage.heroBackgroundMedia} poster={settings.movingImagePage.heroFallbackImage} />
    <header className="mi-header">
      <Link href="/moving-image" className="mi-wordmark">AEDA</Link>
      <button className="mi-menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle moving image navigation">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "is-open" : ""} aria-label="Moving Image">
        <a href="/moving-image#archive" onClick={() => setMenuOpen(false)}>Work</a>
        <a href="/moving-image#archive" onClick={() => setMenuOpen(false)}>Animation</a>
        <a href="/moving-image#commission" onClick={() => setMenuOpen(false)}>Commission</a>
        <Link href="/">← Aeda Art</Link>
      </nav>
    </header>
    <div className="mi-content">{children}</div>
    <footer className="mi-footer mi-footer--minimal">
      <div className="mi-container">{settings.siteLinks.instagramUrl && <a href={settings.siteLinks.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}<a href="mailto:aida@aedaart.com">Contact me · aida@aedaart.com</a></div>
    </footer>
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

type ArchiveOrientation = "portrait" | "landscape" | "square";

function getOrientation(width: number, height: number): ArchiveOrientation {
  const ratio = height / width;
  if (ratio >= 1.2) return "portrait";
  if (1 / ratio >= 1.2) return "landscape";
  return "square";
}

function ArchiveItem({ src, title, metadata, href, playable, onPlay }: { src: string; title: string; metadata: string; href: string; playable?: boolean; onPlay?: () => void }) {
  const itemRef = useRef<HTMLElement>(null);
  const [orientation, setOrientation] = useState<ArchiveOrientation>("square");
  const [rowSpan, setRowSpan] = useState(1);

  useLayoutEffect(() => {
    const item = itemRef.current;
    if (!item) return;
    const measure = () => setRowSpan(Math.max(1, Math.ceil((item.getBoundingClientRect().height + 22) / 30)));
    const observer = new ResizeObserver(measure);
    observer.observe(item);
    measure();
    return () => observer.disconnect();
  }, []);

  return <article ref={itemRef} className={`mi-archive-item mi-archive-item--${orientation}`} style={{ gridRowEnd: `span ${rowSpan}` }}>
    <div className="mi-archive-item__media">
      {src ? <img src={src} alt={title} loading="lazy" onLoad={(event) => setOrientation(getOrientation(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight))} /> : <div className="mi-archive-item__placeholder" />}
      {playable && <button type="button" onClick={onPlay} aria-label={`Play ${title}`}><Play aria-hidden="true" /></button>}
      <Link className="mi-archive-item__link" href={href} aria-label={`View ${title}`} />
    </div>
    <div className="mi-archive-item__caption"><strong>{title}</strong><span>{metadata}</span></div>
  </article>;
}

function MovingFrame({ src, alt }: { src: string; alt: string }) {
  return <div className="figma-moving-frame">
    <img className="figma-moving-frame__media" src={src} alt={alt} loading="lazy" />
    <img className="figma-moving-frame__border" src="/assets/moving-image/border-layer.gif" alt="" aria-hidden="true" />
  </div>;
}

export function MovingImage() {
  const settings = useShopSettings();
  const { locale } = useLocale();
  const tr = locale === "tr";
  const projects = useMemo(() => [...settings.movingImageProjects].filter(isPublished).sort((a,b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999)), [settings.movingImageProjects]);
  const featured = projects.find((p) => p.featured) || projects[0];
  const archiveProjects = projects.filter((project) => project.id !== featured?.id);
  const animationMedia = settings.animationGalleryMedia.slice(0, 2);
  const illustrationFallback = archiveProjects.map(projectCover).filter(Boolean);
  const illustrations = [...settings.illustrationGalleryMedia, ...illustrationFallback, ...settings.animationGalleryMedia].slice(0, 2);
  const featuredSource = settings.movingImagePage.featuredBackgroundMedia || (featured ? (featured.primaryMedia || projectCover(featured)) : "");
  const featuredMediaType = featured ? normalizeMediaType(featured.mediaType || featured.projectType, featuredSource) : "image";
  const [lightbox, setLightbox] = useState<MovingImageProject | null>(null);
  usePageMeta("Moving Image | Aeda Art", "Animation, music visuals and moving worlds by Aida Ramezani.");
  return <main id="top" className="moving-page figma-moving-page">
    <section className="figma-moving-hero" aria-labelledby="moving-title"><div className="figma-moving-hero__content">
      <h1 id="moving-title">ARTWORK &amp;<br />ANIMATION<br />BY AEDA</h1><span>Animation, music visuals and hand-made moving worlds.</span><a href="#commission">REQUEST COMMISSION</a>
    </div></section>

    <section id="archive" className="figma-showcase figma-showcase--animation"><div className="figma-showcase__copy"><h2>ANIMATION</h2><p>Aeda’s animations explore the depth of human emotions through dark, minimalist, black-and-white visuals. By stripping each idea down to its simplest form, they reveal the complexity beneath the surface. Because sometimes, the simplest things have the most to say, and the deepest feelings emerge when nothing stands in their way.</p></div><div className="figma-showcase__frames">{animationMedia.map((src, index) => <MovingFrame src={src} alt={`Animation study ${index + 1}`} key={src} />)}</div></section>

    {featured && <section className="figma-featured">{featuredMediaType === "video" ? <video className="figma-featured__media" src={featuredSource} autoPlay muted loop playsInline /> : <img className="figma-featured__media" src={featuredSource} alt="" />}<div className="figma-featured__shade" /><div className="figma-featured__copy"><h2>{featured.title}</h2><h3>BY {(featured.artistName || featured.client || "ALEX SOUCY").toUpperCase()}</h3><p>Role: {featured.role || "Animator and Illustrator"}</p><p>Year: {featured.year || "2026"}</p><Link href={`/moving-image/${featured.slug}`}>Project Details</Link></div></section>}

    <section className="figma-showcase figma-showcase--illustration"><div className="figma-showcase__frames">{illustrations.map((src, index) => <MovingFrame src={src} alt={`Illustration study ${index + 1}`} key={`${src}-${index}`} />)}</div><div className="figma-showcase__copy"><h2>ILLUSTRATIONS</h2><p>Aeda creates illustrations inspired by your pets, portraits, and the special memories you hold close. Each piece is shaped around the story, atmosphere, and feeling you want to capture. More than just an illustration, every artwork holds a story of its own, one that is uniquely yours.</p></div></section>

    <section id="commission" className="figma-commission"><div className="figma-commission__content"><header><h2>REQUEST A COMMISSION</h2></header><EnquiryForm kind="moving_image" subjectName="Moving Image commission" variant="moving" /></div></section>
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
