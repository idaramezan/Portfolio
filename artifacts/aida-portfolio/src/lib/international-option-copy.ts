export type FourthwallLinkType = "exact" | "edition" | "related";

export const internationalOptionCopy = {
  en: {
    exact: { eyebrow: "AVAILABLE INTERNATIONALLY", heading: "Want this product outside Türkiye?", body: "This product is also available internationally through Aida’s Fourthwall shop." },
    edition: { eyebrow: "WORLDWIDE EDITION", heading: "Looking for an international option?", body: "An international edition inspired by this artwork is available through Aida’s Fourthwall shop." },
    related: { eyebrow: "YOU MAY ALSO LIKE", heading: "Available through the international shop", body: "A related product is available internationally through Aida’s Fourthwall shop." },
    cta: "View international option",
    trust: "International payment, production and shipping are handled through Fourthwall.",
    shop: "Aida’s Fourthwall shop",
    fallbackTitle: "International product option",
    aria: (name: string) => `View ${name} in Aida’s international Fourthwall shop`,
  },
  tr: {
    exact: { eyebrow: "ULUSLARARASI SİPARİŞE AÇIK", heading: "Bu ürünü Türkiye dışından mı almak istiyorsun?", body: "Bu ürün Aida’nın Fourthwall mağazası üzerinden uluslararası siparişe de açıktır." },
    edition: { eyebrow: "ULUSLARARASI EDİSYON", heading: "Uluslararası bir seçenek mi arıyorsun?", body: "Bu eserden ilham alan uluslararası bir edisyon Aida’nın Fourthwall mağazasında mevcuttur." },
    related: { eyebrow: "BUNU DA SEVEBİLİRSİN", heading: "Uluslararası mağazada mevcut", body: "İlgili bir ürün Aida’nın Fourthwall mağazası üzerinden uluslararası olarak sunulmaktadır." },
    cta: "Uluslararası seçeneği gör",
    trust: "Uluslararası ödeme, üretim ve kargo işlemleri Fourthwall üzerinden gerçekleştirilir.",
    shop: "Aida’nın Fourthwall mağazası",
    fallbackTitle: "Uluslararası ürün seçeneği",
    aria: (name: string) => `${name} ürününü Aida’nın uluslararası Fourthwall mağazasında görüntüle`,
  },
} as const;
