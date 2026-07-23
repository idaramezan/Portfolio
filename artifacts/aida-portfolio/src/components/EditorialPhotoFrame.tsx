import { getResponsiveImageSrcSet } from "@/lib/assets";

interface EditorialPhotoFrameProps {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
  className?: string;
}

export default function EditorialPhotoFrame({
  src,
  alt,
  caption,
  priority = false,
  className = "",
}: EditorialPhotoFrameProps) {
  return (
    <figure className={`editorial-photo ${className}`}>
      <span className="editorial-photo__backing" aria-hidden="true" />
      <div className="editorial-photo__paper">
        <span className="editorial-photo__tape" aria-hidden="true" />
        <div className="editorial-photo__image">
          <img
            src={src}
            srcSet={getResponsiveImageSrcSet(src)}
            sizes="(max-width: 768px) 92vw, 50vw"
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
        </div>
        <figcaption>{caption}</figcaption>
      </div>
    </figure>
  );
}
