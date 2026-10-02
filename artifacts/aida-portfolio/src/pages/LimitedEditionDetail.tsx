import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function LimitedEditionDetail() {
  const [, params] = useRoute("/limited-editions/:slug");
  const settings = useShopSettings();
  const catalogue = useInternationalProducts();
  const [now, setNow] = useState(Date.now());
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const group = settings.limitedEditionGroups.find(
    (item) => item.slug === params?.slug,
  );
  usePageMeta(
    group
      ? `${group.title} | Limited Edition | Aeda Art`
      : "Limited Edition | Aeda Art",
    group?.description || "A limited edition by Aida Ramezani.",
  );
  if (!group)
    return (
      <main className="section-shell">
        <h1>Edition not found</h1>
      </main>
    );
  const available = group.units.filter((unit) => unit.status === "available");
  const next = available[0];
  const websiteProduct = settings.printProducts.find(
    (item) => item.id === group.productId,
  );
  const product = catalogue.products.find(
    (item) =>
      item.id ===
      (websiteProduct?.fourthwallProductId || next?.fourthwallProductId),
  );
  const closed =
    group.status === "closed" ||
    group.status === "archived" ||
    (group.releaseEnd && now >= Date.parse(group.releaseEnd));
  const soldOut = !available.length;
  const reserve = async () => {
    setReserving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/limited-editions/${encodeURIComponent(group.slug)}/reserve`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reservation failed.");
      const allocated = catalogue.products.find(
        (item) => item.id === data.fourthwallProductId,
      );
      if (!allocated?.externalUrl)
        throw new Error(
          "The allocated edition is not available from Fourthwall.",
        );
      window.location.assign(allocated.externalUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Reservation failed.");
    } finally {
      setReserving(false);
    }
  };
  return (
    <main className="edition-detail section-shell">
      <div className="edition-detail__gallery">
        <img src={group.image} alt={group.title} />
        {group.galleryImages.map((image) => (
          <img src={image} alt="" loading="lazy" key={image} />
        ))}
      </div>
      <div className="edition-detail__info">
        <p className="portfolio-kicker">LIMITED EDITION</p>
        <h1>{group.title}</h1>
        <p className="edition-detail__intro">{group.description}</p>
        <dl>
          <div>
            <dt>Edition</dt>
            <dd>{group.editionSize} total copies</dd>
          </div>
          <div>
            <dt>Details</dt>
            <dd>Digitally signed · Edition number recorded by AedaArt</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>
              {soldOut
                ? "Sold out"
                : closed
                  ? "Edition closed"
                  : "Available during this limited release"}
            </dd>
          </div>
        </dl>
        {group.priceLabel && (
          <p className="edition-detail__price">{group.priceLabel}</p>
        )}
        {!closed && !soldOut && product?.externalUrl && (
          <button
            className="button-primary edition-detail__collect"
            disabled={reserving}
            onClick={() => void reserve()}
          >
            {reserving ? "Reserving…" : "Collect this edition"} <ArrowUpRight />
          </button>
        )}
        {error && (
          <p role="alert" className="text-coral">
            {error}
          </p>
        )}
        <small>
          Edition number assigned automatically in purchase order and recorded
          as part of this release.
        </small>
        <section>
          <p className="portfolio-kicker">THE STORY</p>
          <p>{group.story}</p>
        </section>
        <section>
          <p className="portfolio-kicker">THE EDITION</p>
          <p>
            {group.editionSize} total copies. Digitally signed by Aida. Your
            unique edition number is assigned after purchase and recorded as
            part of this limited release. This edition will not be reissued
            after closing.
          </p>
        </section>
      </div>
    </main>
  );
}
