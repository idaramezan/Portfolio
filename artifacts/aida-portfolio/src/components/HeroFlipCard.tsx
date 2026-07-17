import { useState, useRef, useCallback } from "react";

type Props = {
  portrait: string;
  paintings: string[];
};

const HALF_DURATION = 320; // ms for each half of the flip

export default function HeroFlipCard({ portrait, paintings }: Props) {
  // Full cycle: portrait → painting[0] → painting[1] → … → portrait
  const allImages = [portrait, ...paintings];
  const [displaySrc, setDisplaySrc] = useState(portrait);
  const [nextIdx, setNextIdx] = useState(1); // next image index in allImages
  const [flipStyle, setFlipStyle] = useState<React.CSSProperties>({
    transform: "rotateY(0deg)",
    transition: `transform ${HALF_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  });
  const flipping = useRef(false);

  const isPortrait = displaySrc === portrait;

  const handleClick = useCallback(() => {
    if (flipping.current) return;
    flipping.current = true;

    // Phase 1: fold away to the right
    setFlipStyle({
      transform: "rotateY(90deg)",
      transition: `transform ${HALF_DURATION}ms cubic-bezier(0.4, 0, 1, 1)`,
    });

    setTimeout(() => {
      const incoming = allImages[nextIdx];
      setDisplaySrc(incoming);
      setNextIdx((nextIdx + 1) % allImages.length);

      // Instantly snap to left-folded position, no transition
      setFlipStyle({ transform: "rotateY(-90deg)", transition: "none" });

      // Double RAF so the "none" transition actually takes effect before we animate back
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Phase 2: unfold from the left
          setFlipStyle({
            transform: "rotateY(0deg)",
            transition: `transform ${HALF_DURATION}ms cubic-bezier(0, 0, 0.6, 1)`,
          });
          setTimeout(() => {
            flipping.current = false;
          }, HALF_DURATION);
        });
      });
    }, HALF_DURATION + 20);
  }, [allImages, nextIdx]);

  return (
    <div
      className="relative w-full max-w-lg md:max-w-none cursor-pointer group select-none"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Click to flip between portrait and paintings"
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {/* Decorative tilted background */}
      <div className="absolute inset-0 bg-ochre/20 transform rotate-6 scale-105 torn-edge-2 z-0 pointer-events-none" />

      {/* The flipping card */}
      <div
        style={{
          ...flipStyle,
          transformStyle: "preserve-3d",
          perspective: "1200px",
        }}
        className="relative z-10"
      >
        <img
          src={displaySrc}
          alt={isPortrait ? "Aida Ramezani in the studio" : "Original painting by Aida Ramezani"}
          className="w-full h-auto object-cover transform -rotate-3 torn-edge shadow-xl"
          style={{ willChange: "transform" }}
          draggable={false}
        />
      </div>

      {/* Caption label that updates with content */}
      <div className="absolute -bottom-6 -right-6 z-20 bg-paper px-4 py-2 border border-ink/10 shadow-md transform rotate-6 pointer-events-none">
        {isPortrait ? (
          <p className="font-hand text-xl text-ink">Aida in the studio ✦</p>
        ) : (
          <p className="font-hand text-xl text-coral">Original painting ✦</p>
        )}
      </div>

      {/* Subtle "tap to reveal" hint — fades on hover */}
      <div className="absolute -bottom-14 left-0 right-0 z-20 text-center pointer-events-none">
        <p className="font-hand text-base text-ink/40 group-hover:text-ink/70 transition-colors duration-300">
          {isPortrait ? "click to peek at my paintings →" : "click to see more →"}
        </p>
      </div>
    </div>
  );
}
