import dogFountainSmall from "@assets/tiktok-live/dog-fountain-800.jpg";
import dogFountainLarge from "@assets/tiktok-live/dog-fountain-1400.jpg";
import dinosaurSmall from "@assets/tiktok-live/dinosaur-800.jpg";
import dinosaurLarge from "@assets/tiktok-live/dinosaur-1400.jpg";
import martiniSmall from "@assets/tiktok-live/martini-800.jpg";
import martiniLarge from "@assets/tiktok-live/martini-1400.jpg";
import pretzelsSmall from "@assets/tiktok-live/pretzels-800.jpg";
import pretzelsLarge from "@assets/tiktok-live/pretzels-1400.jpg";
import hangingFigureSmall from "@assets/tiktok-live/hanging-figure-800.jpg";
import hangingFigureLarge from "@assets/tiktok-live/hanging-figure-1400.jpg";

export interface TikTokLiveArtwork {
  id: string;
  imageUrl: string;
  imageUrlLarge: string;
  width: number;
  height: number;
  alt: string;
  displayOrder: number;
  collageStyleKey:
    "primary" | "upper-left" | "lower-left" | "upper-right" | "lower-right";
}

export const tiktokLiveSection = {
  enabled: true,
  eyebrow: "PAINTED LIVE ON TIKTOK",
  heading: "Painted live. Watched by thousands.",
  description:
    "Aida paints in real time from her Istanbul studio. These works were created during recent TikTok LIVE sessions.",
  primaryCtaLabel: "Join the next LIVE",
  secondaryCtaLabel: "Follow Aida on TikTok",
  statsLabel: "Recent TikTok LIVE performance",
  stats: {
    likes: 224800,
    views: 68700,
    comments: 3817,
    newFollowers: 160,
    liveHours: 25,
  },
  artworks: [
    {
      id: "dog-fountain",
      imageUrl: dogFountainSmall,
      imageUrlLarge: dogFountainLarge,
      width: 646,
      height: 800,
      alt: "Oil pastel painting of a dog drinking from a fountain, created during a TikTok LIVE session",
      displayOrder: 2,
      collageStyleKey: "upper-left",
    },
    {
      id: "dinosaur",
      imageUrl: dinosaurSmall,
      imageUrlLarge: dinosaurLarge,
      width: 538,
      height: 800,
      alt: "Text-based oil pastel dinosaur portrait painted live by Aida Ramezani",
      displayOrder: 1,
      collageStyleKey: "primary",
    },
    {
      id: "martini",
      imageUrl: martiniSmall,
      imageUrlLarge: martiniLarge,
      width: 599,
      height: 800,
      alt: "Oil pastel painting of a martini glass with olives, created during a TikTok LIVE session",
      displayOrder: 3,
      collageStyleKey: "lower-left",
    },
    {
      id: "pretzels",
      imageUrl: pretzelsSmall,
      imageUrlLarge: pretzelsLarge,
      width: 651,
      height: 800,
      alt: "Oil pastel painting of pretzels on a blue-and-white surface, created during a TikTok LIVE session",
      displayOrder: 5,
      collageStyleKey: "lower-right",
    },
    {
      id: "hanging-figure",
      imageUrl: hangingFigureSmall,
      imageUrlLarge: hangingFigureLarge,
      width: 604,
      height: 800,
      alt: "Blue oil pastel painting of a figure inside a hanging structure, created during a TikTok LIVE session",
      displayOrder: 4,
      collageStyleKey: "upper-right",
    },
  ] satisfies TikTokLiveArtwork[],
} as const;
