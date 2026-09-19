import { useState } from "react";
import { useLocation } from "wouter";
import Money from "@/components/Money";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { trackAnalytics } from "@/lib/analytics";
import { useLocale } from "@/lib/locale";
import { useShippingDestination } from "@/lib/shipping-destination";
import { addItemToCart } from "@/lib/store";

const text = {
  en: { title: "Custom Watercolor Palette", description: "A handmade watercolor palette made for the way you paint.", made: "Made for the way you paint.", intro: "Tell Aida what you would like from your palette. You can describe your preferred colors, shape, wells, finish or anything else that matters to you.", name: "Full name", email: "Email", phone: "Phone", address: "Full address", province: "Province / city", postal: "Postal code", notes: "Tell Aida about your palette", notesPlaceholder: "Colors, shape, wells, finish, how you paint, or anything you would like Aida to know.", tiktok: "TikTok username (optional)", helper: "Add your username if you would like Aida to recognize you during the live session.", continue: "Continue to payment", only: "Currently available in Türkiye only.", back: "Back to shop", free: "Free shipping within Türkiye" },
  tr: { title: "Kişiye Özel Suluboya Paleti", description: "Resim yapma şekline göre elde hazırlanan suluboya paleti.", made: "Resim yapma şekline göre hazırlanır.", intro: "Paletinden ne beklediğini Aida'ya anlat. Renklerini, şeklini, gözlerini, yüzeyini veya senin için önemli olan diğer ayrıntıları notlarına ekleyebilirsin.", name: "Ad soyad", email: "E-posta", phone: "Telefon", address: "Tam adres", province: "İl / şehir", postal: "Posta kodu", notes: "Paletin hakkında Aida'ya anlat", notesPlaceholder: "Renkler, şekil, gözler, yüzey, nasıl resim yaptığın veya Aida'nın bilmesini istediğin diğer ayrıntılar.", tiktok: "TikTok kullanıcı adı (isteğe bağlı)", helper: "Canlı yayın sırasında Aida'nın seni tanıyabilmesi için kullanıcı adını ekleyebilirsin.", continue: "Ödemeye devam et", only: "Şu anda yalnızca Türkiye'de mevcut.", back: "Mağazaya dön", free: "Türkiye içinde ücretsiz kargo" },
} as const;

export default function CustomPalette() {
  const { locale } = useLocale(); const t = text[locale];
  const { destination, loading } = useShippingDestination();
  const settings = useShopSettings(); const [, navigate] = useLocation();
  usePageMeta(`${t.title} | Aeda Art`, t.description);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "+90", address: "", province: "", postalCode: "", paletteNotes: "", tikTokUsername: "" });
  if (loading && !destination) return <main className="palette-order section-shell"><div className="commerce-loading" /></main>;
  if (destination?.countryCode !== "TR" || !settings.paletteSettings.enabled) return <main className="palette-unavailable section-shell"><h1>{t.only}</h1><a href="/shop">{t.back} →</a></main>;
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });
  const submit = (event: React.FormEvent) => { event.preventDefault(); const username = form.tikTokUsername.trim().replace(/^@/, ""); sessionStorage.setItem("checkout-draft:turkiye", JSON.stringify({ ...form, city: form.province, province: form.province, district: form.province, countryCode: "TR", countryName: "Türkiye" })); const result = addItemToCart({ id: "custom-palette", productId: "custom-palette", kind: "custom-palette", title: t.title, imageUrl: settings.paletteSettings.coverImage, priceUsdCents: settings.paletteSettings.priceMinor, canonicalCurrency: "TRY", canonicalPriceMinor: settings.paletteSettings.priceMinor, quantity: 1, metadata: { paletteNotes: form.paletteNotes.trim(), tikTokUsername: username } }, 1, "TR"); if (result.ok) { trackAnalytics("custom_palette_checkout_started", { metadata: { locale, shippingCountry: "TR" } }); navigate("/checkout/turkiye"); } };
  return <main className="palette-order section-shell"><div className="palette-order__intro"><img src={settings.paletteSettings.coverImage} alt="Blue and pink handmade watercolor palette"/><div><p className="eyebrow">CUSTOM WATERCOLOR PALETTE</p><h1>{t.title}</h1><strong><Money baseAmountUsdCents={settings.paletteSettings.priceMinor} canonicalCurrency="TRY" /></strong><span>{t.free}</span><h2>{t.made}</h2><p>{t.intro}</p></div></div><form onSubmit={submit} className="palette-form"><div className="palette-form__grid">{([ ["fullName",t.name,"text"], ["email",t.email,"email"], ["phone",t.phone,"tel"], ["address",t.address,"text"], ["province",t.province,"text"], ["postalCode",t.postal,"text"] ] as const).map(([key,label,type]) => <label key={key}>{label}<input required type={type} value={form[key]} onChange={update(key)} {...(key === "postalCode" ? { pattern: "[0-9]{5}", inputMode: "numeric" as const } : {})}/></label>)}</div><label>{t.notes}<textarea value={form.paletteNotes} onChange={update("paletteNotes")} placeholder={t.notesPlaceholder}/></label><label>{t.tiktok}<input value={form.tikTokUsername} onChange={update("tikTokUsername")}/><small>{t.helper}</small></label><button className="home-green-button">{t.continue}</button></form></main>;
}
