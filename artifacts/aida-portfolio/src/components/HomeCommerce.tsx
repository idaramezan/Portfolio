import { Link, useLocation } from "wouter";
import EditorialProductCard from "@/components/EditorialProductCard";
import InternationalProductCard from "@/components/InternationalProductCard";
import Money from "@/components/Money";
import { useInternationalProducts } from "@/hooks/use-international";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { trackAnalytics } from "@/lib/analytics";
import { useLocale } from "@/lib/locale";
import { useShippingDestination } from "@/lib/shipping-destination";
import { addItemToCart } from "@/lib/store";
import { isPubliclyVisible } from "@/lib/product-status";
import { isAceoProduct } from "@/lib/turkiye-products";

const words = {
  en: {
    printsEye: "LIMITED EDITIONS", prints: "Prints", printsBody: "Art prints made from Aida's original work.", printsCta: "View all prints",
    originalsEye: "ONE OF ONE", originals: "Originals", originalsBody: "One-of-one paintings made slowly, with no two quite the same.", originalsCta: "View all originals",
    project: "THE PALETTE PROJECT", palette: "A palette made around you.", paletteBody: "Tell Aida how you like to paint and she will create a handmade watercolor palette around your preferences.", live: "Your palette can be made during one of Aida's TikTok Live painting sessions, so you can watch it take shape.", custom: "CUSTOM PALETTE · 1,200 TL", free: "FREE SHIPPING", design: "Design your custom palette",
    available: "AVAILABLE NOW", ready: "Ready-made palettes", readyBody: "One-of-one handmade palettes ready to ship.", add: "Add to bag", sold: "Sold",
    mailEye: "A MONTHLY ART POST", mailIntro: "A little envelope of art, notes and surprises made for this month's Mail Club.", mailAdd: "Add this edition to bag",
    contents: ["Personal letter", "Exclusive print", "Sticker sheet", "Habit tracker", "Bookmark", "Surprise"],
    merchEye: "FROM THE ANIMATION SERIES", merch: "Animation Merch", merchBody: "Wearable and useful little pieces from Aida's animation world.",
  },
  tr: {
    printsEye: "SINIRLI EDİSYONLAR", prints: "Baskılar", printsBody: "Aida'nın orijinal eserlerinden hazırlanan sanat baskıları.", printsCta: "Tüm baskıları gör",
    originalsEye: "TEK VE ÖZGÜN", originals: "Orijinaller", originalsBody: "Her biri tek ve özgün, elde üretilmiş orijinal eserler.", originalsCta: "Tüm orijinalleri gör",
    project: "PALET PROJESİ", palette: "Sana özel bir palet.", paletteBody: "Nasıl resim yaptığını ve paletinden ne beklediğini anlat. Aida, tercihlerin doğrultusunda sana özel bir suluboya paleti hazırlasın.", live: "Paletin Aida'nın TikTok canlı yayınlarından birinde hazırlanabilir. Böylece yapım sürecini canlı olarak izleyebilirsin.", custom: "KİŞİYE ÖZEL PALET · 1.200 TL", free: "ÜCRETSİZ KARGO", design: "Kendi paletini tasarla",
    available: "ŞU ANDA MEVCUT", ready: "Hazır paletler", readyBody: "Gönderime hazır, elde hazırlanmış özgün paletler.", add: "Sepete ekle", sold: "Satıldı",
    mailEye: "AYLIK SANAT POSTASI", mailIntro: "Bu ayın Mail Club'ı için hazırlanan küçük bir sanat, not ve sürpriz paketi.", mailAdd: "Bu edisyonu sepete ekle",
    contents: ["Kişisel mektup", "Özel baskı", "Sticker sayfası", "Alışkanlık takip çizelgesi", "Kitap ayracı", "Sürpriz"],
    merchEye: "ANİMASYON SERİSİNDEN", merch: "Animasyon Ürünleri", merchBody: "Aida'nın animasyon dünyasından giyilebilir ve kullanışlı küçük parçalar.",
  },
} as const;

export default function HomeCommerce() {
  const { locale } = useLocale();
  const t = words[locale];
  const settings = useShopSettings();
  const international = useInternationalProducts();
  const { destination, loading } = useShippingDestination();
  const [, navigate] = useLocation();
  if (loading && !destination) return <div className="commerce-loading section-shell" aria-label="Loading shop" />;
  const local = destination?.countryCode === "TR";
  const newest = <T,>(values: T[]) => [...values].sort((a: any, b: any) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")).slice(0, 4);
  const prints = newest(settings.printProducts.filter((p) => isPubliclyVisible(p) && !isAceoProduct(p)));
  const originals = newest(settings.originalProducts.filter(isPubliclyVisible));
  const currentMail = settings.mailClubEditions.find((e) => e.current && e.enabled);
  const merch = international.products.filter((p) => settings.animationMerchProductIds.includes(p.id) && p.available && p.externalUrl);
  const add = (item: Parameters<typeof addItemToCart>[0], max = 1) => {
    const result = addItemToCart(item, max, "TR");
    if (result.ok) window.dispatchEvent(new Event("cart:open"));
  };
  return <>
    <ProductSection eyebrow={t.printsEye} title={t.prints} body={t.printsBody} cta={t.printsCta} href="/shop?category=prints">
      {prints.map((p) => { const linked = international.products.find((item) => item.id === p.fourthwallProductId); return <EditorialProductCard key={p.id} href={`/shop/prints/${p.slug || p.id}`} image={p.imageUrl} alt={p.altText || p.name} title={p.name} price={local ? <Money baseAmountUsdCents={p.priceMinor ?? p.priceUsdCents} canonicalCurrency="TRY" /> : linked?.price.formatted} metadata={locale === "tr" ? "BASKI" : "PRINT"} status={p.status === "sold_out" || (!local && linked?.soldOut) ? "sold" : linked || local ? "available" : "loading"} />; })}
    </ProductSection>
    {local && <ProductSection eyebrow={t.originalsEye} title={t.originals} body={t.originalsBody} cta={t.originalsCta} href="/shop?category=originals">
      {originals.map((p) => <EditorialProductCard key={p.id} href={`/shop/originals/${p.slug || p.id}`} image={p.imageUrl} alt={p.altText || p.name} title={p.name} price={<Money baseAmountUsdCents={p.priceUsdCents} canonicalCurrency="USD" />} metadata={locale === "tr" ? "ORİJİNAL" : "ORIGINAL"} status="available" />)}
    </ProductSection>}
    {local && settings.paletteSettings.enabled && <section className="commerce-feature section-shell">
      <img src={settings.paletteSettings.coverImage} alt="Blue and pink handmade watercolor palette" width="1200" height="1800" loading="lazy" />
      <div className="commerce-feature__panel"><p className="eyebrow">{t.project}</p><h2>{t.palette}</h2><p>{t.paletteBody}</p><p>{t.live}</p><strong>{t.custom}</strong><span>{t.free}</span><Link href="/shop/palettes/custom" onClick={() => trackAnalytics("custom_palette_started", { metadata: { locale, shippingCountry: "TR" } })}>{t.design} →</Link></div>
    </section>}
    {local && <ProductSection eyebrow={t.available} title={t.ready} body={t.readyBody}>
      {newest(settings.readyMadePalettes.filter((p) => p.status === "available" && p.stock > 0)).map((p) => <article className="ready-palette" key={p.id}><img src={p.imageUrl} alt={p.altText || p.name} loading="lazy"/><div><p className="eyebrow">{t.available}</p><h3>{locale === "tr" && p.nameTr ? p.nameTr : p.name}</h3><p>{locale === "tr" && p.descriptionTr ? p.descriptionTr : p.description}</p><strong><Money baseAmountUsdCents={p.priceMinor} canonicalCurrency="TRY" /></strong><button onClick={() => add({ id: `ready-palette-${p.id}`, productId: p.id, kind: "ready-palette", title: p.name, imageUrl: p.imageUrl, priceUsdCents: p.priceMinor, canonicalCurrency: "TRY", canonicalPriceMinor: p.priceMinor, quantity: 1 }, p.stock)}>{t.add}</button></div></article>)}
    </ProductSection>}
    {local && currentMail && <section className="commerce-feature commerce-feature--mail section-shell">
      <img src={currentMail.coverImage} alt={currentMail.altText} width="1355" height="1824" loading="lazy" />
      <div className="commerce-feature__panel"><p className="eyebrow">{t.mailEye}</p><h2>{locale === "tr" && currentMail.titleTr ? currentMail.titleTr : currentMail.title}</h2><p>{locale === "tr" && currentMail.descriptionTr ? currentMail.descriptionTr : t.mailIntro}</p><ul>{t.contents.map((item) => <li key={item}>{item}</li>)}</ul><strong><Money baseAmountUsdCents={currentMail.priceMinor} canonicalCurrency="TRY" /></strong><span>{t.free}</span>{currentMail.status === "published" && currentMail.stock > 0 ? <button onClick={() => add({ id: `mail-club-${currentMail.id}`, productId: currentMail.id, kind: "mail-club", title: currentMail.title, imageUrl: currentMail.coverImage, priceUsdCents: currentMail.priceMinor, canonicalCurrency: "TRY", canonicalPriceMinor: currentMail.priceMinor, quantity: 1, metadata: { editionTitle: currentMail.title, editionMonth: currentMail.monthYear } }, currentMail.stock)}>{t.mailAdd}</button> : <span>{t.sold}</span>}</div>
    </section>}
    <ProductSection eyebrow={t.merchEye} title={t.merch} body={t.merchBody}>
      {merch.map((p) => <div key={p.id} onClick={() => trackAnalytics("animation_merch_clicked", { entityId: p.id, metadata: { locale, shippingCountry: destination?.countryCode || "unknown" } })}><InternationalProductCard product={p} /></div>)}
    </ProductSection>
  </>;
}

function ProductSection({ eyebrow, title, body, cta, href, children }: { eyebrow: string; title: string; body?: string; cta?: string; href?: string; children: React.ReactNode }) {
  return <section className="commerce-section section-shell"><header><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{body && <p>{body}</p>}</header><div className="commerce-grid">{children}</div>{cta && href && <Link className="home-green-rule-link" href={href}>{cta} →</Link>}</section>;
}
