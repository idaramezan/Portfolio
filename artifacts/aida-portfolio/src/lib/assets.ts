import img0556 from "@assets/optimized/IMG_0556_1784324397579-1400.jpg";
import aidaPortrait from "@assets/F32B16AC-6790-4733-A787-D0258611E589_1784325156252.JPG";
import img0287 from "@assets/optimized/IMG_0287_1784324425753-1400.jpg";
import img0288 from "@assets/optimized/IMG_0288_1784324425754-1400.jpg";
import img0289 from "@assets/optimized/IMG_0289_1784324425755-1400.jpg";
import img0290 from "@assets/optimized/IMG_0290_1784324425755-1400.jpg";
import img0291 from "@assets/optimized/IMG_0291_1784324425755-1400.jpg";
import img0292 from "@assets/optimized/IMG_0292_1784324425755-1400.jpg";
import img0293 from "@assets/optimized/IMG_0293_1784324425756-1400.jpg";
import img0294 from "@assets/optimized/IMG_0294_1784324425756-1400.jpg";
import img0295 from "@assets/optimized/IMG_0295_1784324425757-1400.jpg";
import img0297 from "@assets/optimized/IMG_0297_1784324425757-1400.jpg";
import img0298 from "@assets/optimized/IMG_0298_1784324425757-1400.jpg";
import img0299 from "@assets/optimized/IMG_0299_1784324425757-1400.jpg";
import img0592 from "@assets/optimized/IMG_0592_1784393730538-1400.jpg";
import img0593 from "@assets/optimized/IMG_0593_1784393730539-1400.jpg";
import img0594 from "@assets/optimized/IMG_0594_1784393730539-1400.jpg";
import studioMailPacking from "@assets/optimized/studio-mail-packing-1400.jpg";
import studioMailPackingSmall from "@assets/optimized/studio-mail-packing-800.jpg";
import originalsSharedCover from "@assets/optimized/originals-shared-cover-1400.jpg";
import originalsSharedCoverSmall from "@assets/optimized/originals-shared-cover-800.jpg";
import homeStudioMailPackaging from "@assets/optimized/home-studio-mail-packaging-1400.jpg";
import homeStudioMailPackagingSmall from "@assets/optimized/home-studio-mail-packaging-800.jpg";
import homeAboutArtist from "@assets/optimized/home-about-artist-1400.jpg";
import homeAboutArtistSmall from "@assets/optimized/home-about-artist-800.jpg";
import aboutPaintingVideo from "@assets/about-painting-process.m4v?url";
import aboutPaintingVideoPoster from "@assets/optimized/about-painting-process-poster-1400.jpg";
import aboutPaintingVideoPosterSmall from "@assets/optimized/about-painting-process-poster-800.jpg";
import sharedArtistHero from "@assets/optimized/shared-artist-hero-1400.jpg";
import sharedArtistHeroSmall from "@assets/optimized/shared-artist-hero-800.jpg";
import homeSignedPrints from "@assets/optimized/home-signed-prints-1400.jpg";
import homeSignedPrintsSmall from "@assets/optimized/home-signed-prints-800.jpg";
import mysteryMailCover from "@assets/optimized/mystery-mail-cover-1400.jpg";
import mysteryMailCoverSmall from "@assets/optimized/mystery-mail-cover-800.jpg";

const responsiveSources = new Map<string, string>([
  [studioMailPacking, `${studioMailPackingSmall} 800w, ${studioMailPacking} 1400w`],
  [originalsSharedCover, `${originalsSharedCoverSmall} 800w, ${originalsSharedCover} 1400w`],
  [homeStudioMailPackaging, `${homeStudioMailPackagingSmall} 800w, ${homeStudioMailPackaging} 1400w`],
  [homeAboutArtist, `${homeAboutArtistSmall} 800w, ${homeAboutArtist} 1400w`],
  [aboutPaintingVideoPoster, `${aboutPaintingVideoPosterSmall} 800w, ${aboutPaintingVideoPoster} 1400w`],
  [sharedArtistHero, `${sharedArtistHeroSmall} 800w, ${sharedArtistHero} 1400w`],
  [homeSignedPrints, `${homeSignedPrintsSmall} 800w, ${homeSignedPrints} 1400w`],
  [mysteryMailCover, `${mysteryMailCoverSmall} 800w, ${mysteryMailCover} 1400w`],
]);

export const getResponsiveImageSrcSet = (src: string) => responsiveSources.get(src);

export const assetImages = [
  img0556,
  img0287,
  img0288,
  img0289,
  img0290,
  img0291,
  img0292,
  img0293,
  img0294,
  img0295,
  img0297,
  img0298,
  img0299,
  img0592,
  img0593,
  img0594,
];

export const getArtworkImage = (artwork: any, index: number): string => {
  if (!artwork.imageUrl) return assetImages[index % assetImages.length];

  // Directly-served URLs: API uploads or external http(s)
  if (
    artwork.imageUrl.startsWith("/api/uploads/") ||
    artwork.imageUrl.startsWith("http")
  ) {
    return artwork.imageUrl;
  }

  // Legacy: match filename fragment against Vite-imported assets
  const filename = artwork.imageUrl.split("/").pop()?.split(".")[0] || "";
  const match = assetImages.find((img) => img.includes(filename));
  if (match) return match;

  return assetImages[index % assetImages.length];
};

export const heroImage = img0556;
export const portrait = aidaPortrait;
export const studioMailImage = studioMailPacking;
export const originalsCoverImage = originalsSharedCover;
export const printsCoverImage = homeSignedPrints;
export const studioMailCoverImage = homeStudioMailPackaging;
export const homeAboutImage = homeAboutArtist;
export const paintingVideo = aboutPaintingVideo;
export const paintingVideoPoster = aboutPaintingVideoPoster;
export const heroPortrait = sharedArtistHero;
export const mysteryMailCoverImage = mysteryMailCover;
