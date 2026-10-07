import { type ReactNode } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import ProgressiveImage from "@/components/ProgressiveImage";

export default function EditorialProductCard({
  image,
  alt,
  title,
  price,
  pricePrefix,
  metadata,
  status,
  href,
  onClick,
  onNavigate,
  imagePosition = "center center",
  imagePriority = false,
  external = false,
}: {
  image?: string;
  alt: string;
  title: string;
  price?: ReactNode;
  pricePrefix?: string;
  metadata: string;
  status?: "available" | "sold" | "unavailable" | "loading";
  href?: string;
  onClick?: () => void;
  onNavigate?: () => void;
  imagePosition?: string;
  imagePriority?: boolean;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="editorial-product-card__media">
        {image ? (
          <ProgressiveImage
            src={image}
            alt={alt}
            style={{ objectPosition: imagePosition }}
            priority={imagePriority}
          />
        ) : (
          <span className="editorial-product-card__placeholder">
            <ImageIcon aria-hidden="true" />
            <span>Artwork image coming soon</span>
          </span>
        )}
        {status === "sold" && (
          <span className="editorial-product-card__sold">Sold</span>
        )}
      </span>
      <span className="editorial-product-card__info">
        <span className="editorial-product-card__headline">
          <strong>{title || "Untitled"}</strong>
          {price && (
            <span className="editorial-product-card__price">
              {pricePrefix && <small>{pricePrefix} </small>}
              {price}
            </span>
          )}
        </span>
        <span className="editorial-product-card__metadata">{metadata}</span>
      </span>
    </>
  );

  return (
    <article className="editorial-product-card">
      {href && external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="editorial-product-card__link"
          onClick={onNavigate}
        >
          {content}
        </a>
      ) : href ? (
        <Link
          href={href}
          className="editorial-product-card__link"
          onClick={onNavigate}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className="editorial-product-card__link"
          onClick={onClick}
        >
          {content}
        </button>
      )}
    </article>
  );
}
