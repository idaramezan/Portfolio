import { getResponsiveImageSrcSet } from "@/lib/assets";

interface ArtistPhotoFrameProps {
  src: string;
  alt: string;
  caption?: string;
  variant?: "default" | "hero";
}

export default function ArtistPhotoFrame({
  src,
  alt,
  caption = "Aida in her Istanbul studio",
  variant = "default",
}: ArtistPhotoFrameProps) {
  return (
    <figure
      className={`artist-photo-frame ${variant === "hero" ? "artist-photo-frame--hero" : ""}`}
    >
      <div className="artist-photo-frame__layers">
        <div className="artist-photo-frame__backing" aria-hidden="true" />
        <div className="artist-photo-frame__print">
          <div className="artist-photo-frame__tape" aria-hidden="true" />
          <div className="artist-photo-frame__image">
            <img
              src={src}
              srcSet={getResponsiveImageSrcSet(src)}
              sizes={variant === "hero" ? "(max-width: 768px) 92vw, 46vw" : "(max-width: 768px) 92vw, 50vw"}
              alt={alt}
              loading={variant === "hero" ? "eager" : "lazy"}
              fetchPriority={variant === "hero" ? "high" : "auto"}
            />
          </div>
          <figcaption className="artist-photo-frame__caption">
            <span className="artist-photo-frame__handwriting">{caption}</span>
            <span className="artist-photo-frame__index">
              Studio portrait · 01
            </span>
          </figcaption>
        </div>
      </div>
    </figure>
  );
}
