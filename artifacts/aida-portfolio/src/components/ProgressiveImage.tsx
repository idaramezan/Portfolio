import { useEffect, useState, type CSSProperties } from "react";

function sizedUrl(src: string, width: number) {
  if (!src.startsWith("/api/product-images/") || /\.gif(?:\?|$)/i.test(src))
    return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}w=${width}`;
}

export default function ProgressiveImage({
  src,
  alt,
  className = "",
  style,
  priority = false,
  sizes = "(max-width: 700px) 92vw, (max-width: 1200px) 50vw, 33vw",
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  sizes?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const responsive =
    src.startsWith("/api/product-images/") && !/\.gif(?:\?|$)/i.test(src);
  if (failed) return null;

  return (
    <img
      src={responsive ? sizedUrl(src, 1200) : src}
      srcSet={
        responsive
          ? [360, 640, 960, 1200, 1600]
              .map((width) => `${sizedUrl(src, width)} ${width}w`)
              .join(", ")
          : undefined
      }
      sizes={responsive ? sizes : undefined}
      alt={alt}
      className={`progressive-image ${loaded ? "progressive-image--loaded" : ""} ${className}`.trim()}
      style={style}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
