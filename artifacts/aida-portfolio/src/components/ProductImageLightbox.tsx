import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

type LightboxImage = { src: string; highResolutionSrc?: string; alt: string };

export default function ProductImageLightbox({
  images,
  initialIndex = 0,
  imageClassName = "",
}: {
  images: LightboxImage[];
  initialIndex?: number;
  imageClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [failed, setFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const image = images[index];
  const multiple = images.length > 1;

  const close = () => setOpen(false);
  const move = (direction: -1 | 1) => {
    setFailed(false);
    setIndex(
      (current) => (current + direction + images.length) % images.length,
    );
  };

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const previous = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (multiple && event.key === "ArrowLeft") move(-1);
      if (multiple && event.key === "ArrowRight") move(1);
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      Object.assign(document.body.style, previous);
      window.scrollTo(0, scrollY);
      triggerRef.current?.focus();
    };
  }, [open, multiple, images.length]);

  if (!image) return null;
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="product-image-trigger"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
        aria-label={`Enlarge image of ${image.alt}`}
      >
        <img src={image.src} alt={image.alt} className={imageClassName} />
        <span className="product-image-trigger__hint" aria-hidden="true">
          <Expand /> <span>View larger</span>
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={dialogRef}
            className="product-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Enlarged image of ${image.alt}`}
            onMouseDown={(event) =>
              event.target === event.currentTarget && close()
            }
            onTouchStart={(event) => {
              touchStart.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (!multiple || touchStart.current === null) return;
              const distance =
                (event.changedTouches[0]?.clientX || 0) - touchStart.current;
              if (Math.abs(distance) > 55) move(distance > 0 ? -1 : 1);
              touchStart.current = null;
            }}
          >
            <button
              ref={closeRef}
              type="button"
              className="product-lightbox__close"
              onClick={close}
              aria-label="Close enlarged image"
            >
              <X aria-hidden="true" />
            </button>
            {multiple && (
              <button
                type="button"
                className="product-lightbox__nav product-lightbox__nav--previous"
                onClick={() => move(-1)}
                aria-label="Previous image"
              >
                <ChevronLeft />
              </button>
            )}
            <div
              className="product-lightbox__stage"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {failed ? (
                <div className="product-lightbox__error">
                  <p>Image couldn't be loaded.</p>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={close}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <img
                  src={image.highResolutionSrc || image.src}
                  alt={image.alt}
                  onError={() => setFailed(true)}
                />
              )}
            </div>
            {multiple && (
              <>
                <button
                  type="button"
                  className="product-lightbox__nav product-lightbox__nav--next"
                  onClick={() => move(1)}
                  aria-label="Next image"
                >
                  <ChevronRight />
                </button>
                <span className="product-lightbox__counter">
                  {index + 1} / {images.length}
                </span>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
