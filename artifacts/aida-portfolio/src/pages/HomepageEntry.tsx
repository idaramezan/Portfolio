import Shell from "@/components/layout/Shell";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useServerNow } from "@/hooks/use-server-now";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { isHomepagePage, resolveHomepagePage } from "@/lib/homepage-mode";
import { PaintingsIndex } from "@/pages/Collections";
import { MovingImage, MovingImageLayout } from "@/pages/MovingImage";
import PortfolioHome from "@/pages/PortfolioHome";
import UnifiedShop from "@/pages/UnifiedShop";

export default function HomepageEntry() {
  const settings = useShopSettings();
  const now = useServerNow();
  const preview = new URLSearchParams(window.location.search).get("homepage-preview");
  const selected = isHomepagePage(preview)
    ? preview
    : resolveHomepagePage(settings.homepageContent.source, now);

  usePageMeta(
    "Aeda Art | Limited Editions & Original Paintings",
    "Weekly limited editions, available original paintings and art prints by Aida Ramezani.",
    selected !== null,
  );

  if (selected === "moving-image")
    return (
      <MovingImageLayout>
        <MovingImage embeddedAsHomepage />
      </MovingImageLayout>
    );

  return (
    <Shell>
      {selected === "paintings" || selected === "originals" ? (
        <PaintingsIndex embeddedAsHomepage />
      ) : selected === "prints" ? (
        <UnifiedShop embeddedAsHomepage />
      ) : (
        <PortfolioHome />
      )}
    </Shell>
  );
}
