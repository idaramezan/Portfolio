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
  const { locale, setLocale } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="mi-world">
    <Background media={settings.movingImagePage.heroBackgroundMedia} poster={settings.movingImagePage.heroFallbackImage} />
    <header className="mi-header">
      <Link href="/moving-image" className="mi-wordmark">AEDA <span>/ MOVING IMAGE</span></Link>
      <button className="mi-menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle moving image navigation">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "is-open" : ""} aria-label="Moving Image">
        <a href="/moving-image#archive" onClick={() => setMenuOpen(false)}>Work</a>
        <a href="/moving-image#archive" onClick={() => setMenuOpen(false)}>Animation</a>
        <a href="/moving-image#commission" onClick={() => setMenuOpen(false)}>Commission</a>
        <Link href="/about">About</Link>
        <Link href="/">← Aeda Art</Link>
        <button onClick={() => setLocale(locale === "tr" ? "en" : "tr")}>{locale === "tr" ? "EN" : "TR"}</button>
      </nav>
    </header>
    <div className="mi-content">{children}</div>
    <footer className="mi-footer">
      <div className="mi-container mi-footer__grid"><div><strong>AEDA</strong><span>MOVING IMAGE</span></div><nav><b>EXPLORE</b><Link href="/paintings">Paintings</Link><Link href="/shop">Shop</Link><Link href="/about">About</Link><Link href="/">Main site</Link></nav><nav><b>FOLLOW</b>{settings.siteLinks.instagramUrl && <a href={settings.siteLinks.instagramUrl}>Instagram</a>}{settings.siteLinks.tiktokUrl && <a href={settings.siteLinks.tiktokUrl}>TikTok</a>}{settings.siteLinks.youtubeUrl && <a href={settings.siteLinks.youtubeUrl}>YouTube</a>}</nav></div>
      <div className="mi-container mi-footer__bottom"><span>© {new Date().getFullYear()} Aeda Art</span><a href="#top">Back to top ↑</a></div>
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

export function MovingImage() {
  const settings = useShopSettings();
  const { locale } = useLocale();
  const tr = locale === "tr";
  const projects = useMemo(() => [...settings.movingImageProjects].filter(isPublished).sort((a,b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999)), [settings.movingImageProjects]);
  const featured = projects.find((p) => p.featured) || projects[0];
  const archiveProjects = projects.filter((project) => project.id !== featured?.id);
  const [lightbox, setLightbox] = useState<MovingImageProject | null>(null);
  usePageMeta("Moving Image | Aeda Art", "Animation, music visuals and moving worlds by Aida Ramezani.");
  return <main id="top" className="moving-page">
    <section className="moving-hero" aria-labelledby="moving-title"><div className="mi-container moving-hero__content">
      <p className="moving-kicker">AEDA / MOVING IMAGE</p><h1 id="moving-title">{tr ? <>AIDA'DAN ANİMASYON<br />&amp; HAREKETLİ GÖRÜNTÜ</> : <>ARTWORK &amp; ANIMATION<br />BY AIDA</>}</h1><p className="moving-hero__copy">{tr ? "Animasyon, müzik görselleri ve elle yapılmış hareketli dünyalar." : "Animation, music visuals and hand-made moving worlds."}</p>
      <a href="#archive" className="moving-button">{tr ? "İŞLERİ GÖR" : "VIEW WORK"} <ArrowRight /></a>
    </div></section>

    <section id="archive" className="moving-archive"><div className="mi-container">
      <header className="moving-section-heading"><h2>{tr ? "ARŞİVLER // GALERİ" : "THE ARCHIVES // GALLERY"}</h2><p>{tr ? "Döngüler, animasyonlar ve sipariş üzerine hareketli görüntü çalışmaları." : "A collection of loops, animation and commissioned moving-image work."}</p></header>
      {(archiveProjects.length || settings.animationGalleryMedia.length) ? <div className="mi-archive-grid">
        {archiveProjects.map((project) => { const cover = projectCover(project); const type = normalizeMediaType(project.mediaType || project.projectType, project.primaryMedia || project.videoUrl || cover); return <ArchiveItem key={project.id} src={type === "gif" ? (project.primaryMedia || project.thumbnail || cover) : cover} title={project.title} metadata={`${project.category || project.projectType}${project.year ? ` · ${project.year}` : ""}`} href={`/moving-image/${project.slug}`} playable={type === "video" || type === "youtube"} onPlay={() => setLightbox(project)} />; })}
        {settings.animationGalleryMedia.map((src, index) => <ArchiveItem key={src} src={src} title={`${tr ? "Animasyon Çalışması" : "Animation Study"} ${String(index + 1).padStart(2, "0")}`} metadata={tr ? "Döngü animasyon" : "Loop animation"} href={src} />)}
      </div> : <p className="moving-empty">{tr ? "Yeni hareketli görüntü çalışmaları yakında burada olacak." : "New moving-image work is being prepared for this space."}</p>}

      {featured && <article className="mi-featured"><Link href={`/moving-image/${featured.slug}`} className="mi-featured__media">{projectCover(featured) && <img src={projectCover(featured)} alt={featured.title} loading="lazy" />}</Link><div className="mi-featured__info"><p className="moving-kicker">FEATURED PROJECT</p><h3>{featured.title}</h3>{(featured.artistName || featured.client) && <p className="mi-featured__artist">For {featured.artistName || featured.client}</p>}<p className="mi-featured__description">Animated music visual created for “{featured.title}”.</p><dl><div><dt>Role</dt><dd>{featured.role || "Animated music visual"}</dd></div><div><dt>Year</dt><dd>{featured.year}</dd></div></dl><Link href={`/moving-image/${featured.slug}`} className="mi-featured__button">VIEW PROJECT →</Link></div></article>}
    </div></section>

    <section id="commission" className="moving-commission-panel"><div className="mi-container moving-commission-panel__box"><header><h2>{tr ? "KOMİSYON TALEBİ" : "REQUEST A COMMISSION"}</h2><p>{tr ? "Aklınızdaki projeyi anlatın; size e-posta ile dönüş yapacağım." : "Tell me about the project you have in mind and I’ll get back to you by email."}</p></header><EnquiryForm kind="moving_image" subjectName="Moving Image commission" variant="moving" /></div></section>
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
