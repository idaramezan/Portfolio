import { createContext, useContext, useEffect, useRef, useState } from "react";

export type SiteLocale = "en" | "tr";

const STORAGE_KEY = "aida-site-language";

const TR: Record<string, string> = {
  "Türkiye Shop": "Türkiye Mağazası",
  International: "Uluslararası",
  About: "Hakkında",
  Basket: "Sepet",
  "Display currency": "Para birimi",
  "Shop home": "Mağaza ana sayfası",
  Originals: "Orijinal Eserler",
  "Prints & Goods": "Baskılar ve Ürünler",
  Prints: "Baskılar",
  "Mystery Mail": "Gizemli Posta",
  Studio: "Stüdyo",
  Information: "Bilgi",
  "How to Collect": "Nasıl Koleksiyon Yapılır",
  Links: "Bağlantılar",
  Contact: "İletişim",
  "Studio Letter": "Stüdyo Mektubu",
  "Notes from the studio.": "Stüdyodan notlar.",
  "Made by hand in Istanbul.": "İstanbul’da el emeğiyle hazırlandı.",
  "All rights reserved.": "Tüm hakları saklıdır.",
  "The Türkiye shop": "Türkiye mağazası",
  "International shop": "Uluslararası mağaza",
  "Art from Aida’s Istanbul studio, delivered across Türkiye.": "Aida’nın İstanbul stüdyosundan sanat eserleri, Türkiye’nin her yerine teslim.",
  "Collect Aida’s work wherever you are.": "Nerede olursanız olun Aida’nın eserlerini koleksiyonunuza katın.",
  "Discover one-of-a-kind original paintings, signed prints, art goods and limited Mystery Mail editions. Every order is prepared personally by Aida, with free shipping within Türkiye.": "Benzersiz orijinal resimleri, imzalı baskıları, sanat ürünlerini ve sınırlı Gizemli Posta edisyonlarını keşfedin. Her sipariş Aida tarafından özenle hazırlanır ve Türkiye içi kargo ücretsizdir.",
  "Explore original oil pastel paintings available for international delivery, or shop prints and art goods through Aida’s international Fourthwall store.": "Uluslararası teslimata uygun orijinal yağlı pastel resimleri keşfedin veya Aida’nın uluslararası Fourthwall mağazasından baskı ve sanat ürünleri satın alın.",
  "Explore original paintings": "Orijinal resimleri keşfet",
  "Browse prints & goods": "Baskı ve ürünlere göz at",
  "Shop prints & goods": "Baskı ve ürünleri incele",
  "See the current Mystery Mail →": "Güncel Gizemli Posta’yı gör →",
  "Free Türkiye shipping · Personally confirmed on WhatsApp · Packed by the artist": "Türkiye içi ücretsiz kargo · WhatsApp’tan kişisel onay · Sanatçı tarafından paketlenir",
  "Originals confirmed personally · International shipping calculated separately · Prints fulfilled through Fourthwall": "Orijinaller kişisel olarak onaylanır · Uluslararası kargo ayrıca hesaplanır · Baskılar Fourthwall tarafından gönderilir",
  "New from the studio": "Stüdyodan yeni",
  "Latest original paintings": "En yeni orijinal resimler",
  "Original paintings available internationally": "Uluslararası koleksiyona açık orijinal resimler",
  "One-of-a-kind oil pastel works, signed by Aida and available only once.": "Aida imzalı, tek ve benzersiz yağlı pastel eserler.",
  "View all originals": "Tüm orijinalleri gör",
  "View all original paintings": "Tüm orijinal resimleri gör",
  "Prints & goods": "Baskılar ve ürünler",
  "Art made easier to collect": "Koleksiyonunuza kolayca katabileceğiniz sanat",
  "Signed prints, T-shirts, mugs and stickers featuring Aida’s studio artwork.": "Aida’nın stüdyo eserlerini taşıyan imzalı baskılar, tişörtler, kupalar ve çıkartmalar.",
  "View all prints & goods": "Tüm baskı ve ürünleri gör",
  "How collecting works": "Koleksiyon süreci",
  "A personal way to collect": "Kişisel bir koleksiyon deneyimi",
  "Choose your work": "Eserinizi seçin",
  "Add it to your basket": "Sepetinize ekleyin",
  "Confirm with Aida": "Aida ile onaylayın",
  "Ordering internationally": "Uluslararası sipariş",
  "Two ways to collect internationally": "Uluslararası koleksiyon için iki yol",
  "Original paintings": "Orijinal resimler",
  "Questions, answered": "Merak edilenler",
  "Frequently asked questions": "Sıkça sorulan sorular",
  "Find something made for you.": "Sizin için yapılmış bir eser bulun.",
  "Choose how you would like to collect.": "Nasıl koleksiyon yapmak istediğinizi seçin.",
  "Free shipping within Türkiye": "Türkiye içi ücretsiz kargo",
  "Available": "Mevcut",
  "Unavailable": "Mevcut değil",
  "Sold out": "Tükendi",
  "Add to collection": "Koleksiyona ekle",
  "View painting": "Resmi görüntüle",
  "Choose options": "Seçenekleri belirle",
  "Shipping calculated separately": "Kargo ayrıca hesaplanır",
  "International shipping is not included.": "Uluslararası kargo dahil değildir.",
  "Oil pastel on paper": "Kağıt üzerine yağlı pastel",
  "Oil pastel on canvas": "Tuval üzerine yağlı pastel",
  "Price": "Fiyat",
  "From": "Başlangıç",
  "Available now": "Şimdi mevcut",
  "View details": "Detayları gör",
  "View artwork": "Eseri görüntüle",
  "Add to basket": "Sepete ekle",
  "Continue to WhatsApp": "WhatsApp’a devam et",
  "Your basket is empty": "Sepetiniz boş",
  "Continue shopping": "Alışverişe devam et",
  "Remove": "Kaldır",
  "Quantity": "Adet",
  "Subtotal": "Ara toplam",
  "Original artwork": "Orijinal eser",
  "Signed": "İmzalı",
  "Certificate included": "Sertifika dahil",
  "Loading international products": "Uluslararası ürünler yükleniyor",
  "Shop on Fourthwall": "Fourthwall’da satın al",
  "Follow the studio": "Stüdyoyu takip et",
  "The next mystery is forming": "Yeni gizem hazırlanıyor",
  "A new Mystery Mail is coming to the studio.": "Stüdyoya yeni bir Gizemli Posta geliyor.",
  "Limited Mystery Mail": "Sınırlı Gizemli Posta",
  "Discover the Mystery Mail": "Gizemli Posta’yı keşfet",
  "This edition has closed.": "Bu edisyon sona erdi.",
  "Ends in": "Sona ermesine",
  days: "gün",
  hours: "saat",
  minutes: "dakika",
  seconds: "saniye",
  "Original paintings • Prints & Goods • Mystery Mail": "Orijinal resimler • Baskılar ve ürünler • Gizemli Posta",
  "Original Art, Prints & Goods and Mystery Mail": "Orijinal Sanat, Baskılar, Ürünler ve Gizemli Posta",
  "Discover one of a kind paintings, signed art prints and small themed art packages created by Istanbul artist Aida Ramezani.": "İstanbullu sanatçı Aida Ramezani’nin benzersiz resimlerini, imzalı sanat baskılarını ve temalı küçük sanat paketlerini keşfedin.",
  "Shop in Türkiye": "Türkiye’den alışveriş yap",
  "Shop internationally": "Uluslararası alışveriş yap",
  "Shopping location": "Alışveriş bölgesi",
  "Choose Your Shop": "Mağazanızı seçin",
  "Shop within Türkiye": "Türkiye içinden alışveriş",
  "Enter the Türkiye Shop": "Türkiye mağazasına gir",
  "Enter the International Shop": "Uluslararası mağazaya gir",
  "About the artist": "Sanatçı hakkında",
  "Made by Aida Ramezani in Istanbul": "Aida Ramezani tarafından İstanbul’da üretildi",
  "Every original painting, studio good and Mystery Mail package is created, selected or prepared personally in the studio.": "Her orijinal resim, stüdyo ürünü ve Gizemli Posta paketi stüdyoda kişisel olarak üretilir, seçilir veya hazırlanır.",
  "The goal is to make collecting art feel personal, approachable and connected to the artist who created it.": "Amaç, sanat koleksiyonculuğunu kişisel, ulaşılabilir ve eseri yaratan sanatçıyla bağlantılı kılmaktır.",
  "Meet the artist": "Sanatçıyla tanışın",
  Ordering: "Sipariş",
  "How Turkey Orders Work": "Türkiye sipariş süreci",
  "Choose your artwork": "Eserinizi seçin",
  "Add items to your basket": "Ürünleri sepetinize ekleyin",
  "No online payment is collected through this website.": "Bu web sitesi üzerinden çevrimiçi ödeme alınmaz.",
  Social: "Sosyal medya",
  "Follow the Studio": "Stüdyoyu takip edin",
  "See new paintings, behind the scenes studio moments, packaging videos and upcoming releases.": "Yeni resimleri, stüdyodan kamera arkası anlarını, paketleme videolarını ve yaklaşan yayınları görün.",
  "About Aida Ramezani": "Aida Ramezani hakkında",
  "Art made directly, honestly and by hand.": "Doğrudan, dürüstçe ve el emeğiyle üretilen sanat.",
  "The Practice": "Sanat pratiği",
  "Self-taught, instinct-led.": "Kendi kendini yetiştirmiş, içgüdüleriyle yönlenen.",
  Materials: "Malzemeler",
  "Oil pastel on textured paper": "Dokulu kağıt üzerine yağlı pastel",
  Philosophy: "Felsefe",
  "Personal and quietly precious": "Kişisel ve sakin bir zarafet",
  Process: "Süreç",
  "The hand stays visible.": "Elin izi görünür kalır.",
  "Studio Principles": "Stüdyo ilkeleri",
  "From the Studio to Your Home": "Stüdyodan evinize",
  "Collect Art Directly from Aida": "Sanatı doğrudan Aida’dan koleksiyonunuza katın",
  "View available originals": "Mevcut orijinalleri gör",
  "How to start a collection": "Koleksiyona nasıl başlanır",
  "How to collect": "Nasıl koleksiyon yapılır",
  "Choose the path that fits where you live.": "Yaşadığınız yere uygun yolu seçin.",
  "Collect directly within Türkiye": "Türkiye içinde doğrudan koleksiyon yapın",
  "International originals": "Uluslararası orijinaller",
  "Collect an original internationally": "Uluslararası bir orijinal eser edinin",
  "International prints": "Uluslararası baskılar",
  "Order prints through Fourthwall": "Baskıları Fourthwall üzerinden sipariş edin",
  "Browse this shop": "Bu mağazaya göz at",
  "Painted live. Watched by thousands.": "Canlı yayında resmedildi. Binlerce kişi izledi.",
  "PAINTED LIVE ON TIKTOK": "TIKTOK’TA CANLI RESMEDİLDİ",
  "Join the next LIVE": "Bir sonraki CANLI yayına katıl",
  "Follow Aida on TikTok": "Aida’yı TikTok’ta takip et",
  "Is shipping free within Türkiye?": "Türkiye içinde kargo ücretsiz mi?",
  "Yes. Shipping is included for orders delivered within Türkiye unless a product explicitly states otherwise.": "Evet. Bir üründe aksi açıkça belirtilmedikçe Türkiye içindeki siparişlerde kargo fiyata dahildir.",
  "How do I place an order?": "Nasıl sipariş verebilirim?",
  "Add the pieces you want to your basket, then continue to WhatsApp. Your selected products, options and total are included automatically.": "İstediğiniz eserleri sepetinize ekleyip WhatsApp’a devam edin. Seçtiğiniz ürünler, seçenekler ve toplam tutar mesaja otomatik eklenir.",
  "Can I order more than one product?": "Birden fazla ürün sipariş edebilir miyim?",
  "Yes. You can combine available originals, prints, goods and Mystery Mail items in one basket.": "Evet. Mevcut orijinalleri, baskıları, ürünleri ve Gizemli Posta’yı tek sepette birleştirebilirsiniz.",
  "Are original paintings one of a kind?": "Orijinal resimler tek ve benzersiz mi?",
  "Yes. Each original painting is unique and cannot be ordered again once sold.": "Evet. Her orijinal resim benzersizdir ve satıldıktan sonra tekrar sipariş edilemez.",
  "Can prints be ordered framed?": "Baskıları çerçeveli sipariş edebilir miyim?",
  "What is Mystery Mail?": "Gizemli Posta nedir?",
  "When does Mystery Mail close?": "Gizemli Posta ne zaman sona erer?",
  "Can I order internationally from this page?": "Bu sayfadan uluslararası sipariş verebilir miyim?",
  "Can original paintings be shipped internationally?": "Orijinal resimler yurt dışına gönderilebilir mi?",
  "Is international shipping included in the original’s price?": "Uluslararası kargo orijinal eserin fiyatına dahil mi?",
  "How do I order an original painting?": "Orijinal bir resmi nasıl sipariş ederim?",
  "Where do I buy international prints and goods?": "Uluslararası baskı ve ürünleri nereden satın alabilirim?",
  "Why do Fourthwall products open on another website?": "Fourthwall ürünleri neden başka bir sitede açılıyor?",
  "Can I add a Fourthwall item and an original to the same basket?": "Fourthwall ürünü ile orijinal eseri aynı sepete ekleyebilir miyim?",
  "Does Mystery Mail ship internationally?": "Gizemli Posta yurt dışına gönderiliyor mu?",
  "Is Mystery Mail a subscription?": "Gizemli Posta abonelik mi?",
  "No. Each Mystery Mail is a separate one-time edition.": "Hayır. Her Gizemli Posta tek seferlik ayrı bir edisyondur.",
  "Where is Mystery Mail delivered?": "Gizemli Posta nereye teslim edilir?",
  "Mystery Mail is currently available only within Türkiye, with free shipping.": "Gizemli Posta şu anda yalnızca Türkiye’de ücretsiz kargoyla sunulmaktadır.",
  "What happens when the timer ends?": "Sayaç sona erdiğinde ne olur?",
  "The edition closes and can no longer be added to the basket.": "Edisyon kapanır ve artık sepete eklenemez.",
  "Is the postcard available separately?": "Sanat kartı ayrı olarak satılıyor mu?",
  "No. The art postcard is created only for that Mystery Mail edition.": "Hayır. Sanat kartı yalnızca ilgili Gizemli Posta edisyonu için hazırlanır.",
  "Does adding it to the basket reserve it?": "Sepete eklemek ürünü ayırır mı?",
  "Your selection is confirmed personally with Aida when you continue on WhatsApp.": "WhatsApp’a devam ettiğinizde seçiminiz Aida ile kişisel olarak onaylanır.",
  "Aida Ramezani is a self-taught oil pastel artist based in Istanbul. Her work is rooted in texture, instinct and the physical act of making.": "Aida Ramezani, İstanbul’da yaşayan ve kendi kendini yetiştirmiş bir yağlı pastel sanatçısıdır. Eserleri dokuya, içgüdüye ve üretmenin fiziksel sürecine dayanır.",
  "She works directly on paper, allowing fingerprints, smudges and unexpected marks to remain visible. Each original carries the trace of the hand that made it.": "Kağıt üzerinde doğrudan çalışır; parmak izlerinin, lekelerin ve beklenmedik izlerin görünür kalmasına izin verir. Her orijinal, onu yapan elin izini taşır.",
  "Aida began painting without formal training, drawn to the immediacy and sensitivity of oil pastel.": "Aida, yağlı pastelin doğrudanlığına ve duyarlılığına ilgi duyarak resmi resmi bir eğitim almadan öğrenmeye başladı.",
  "She works intuitively, allowing each layer, mark and texture to shape the final piece. Rather than hiding imperfections, she keeps them as part of the artwork’s history and character.": "Sezgisel çalışır; her katmanın, izin ve dokunun son eseri şekillendirmesine izin verir. Kusurları gizlemek yerine onları eserin geçmişinin ve karakterinin bir parçası olarak korur.",
  "Aida creates original oil pastel paintings on textured paper using simple studio tools.": "Aida, sade stüdyo araçlarıyla dokulu kağıt üzerine orijinal yağlı pastel resimler üretir.",
  "Aida creates art that feels personal, lived-in and quietly precious.": "Aida kişisel, yaşanmış ve sakin biçimde değerli hissettiren sanat eserleri üretir.",
  "Each work begins with oil pastel and a blank sheet of paper. Aida paints directly, responding to colour, texture and movement as the image develops.": "Her eser yağlı pastel ve boş bir kağıtla başlar. Aida, görüntü geliştikçe renge, dokuya ve harekete doğrudan karşılık vererek resmeder.",
  "I paint directly with oil pastel.": "Yağlı pastelle doğrudan resmederim.",
  "I begin without a detailed sketch.": "Ayrıntılı bir eskiz olmadan başlarım.",
  "I do not digitally correct the finished artwork.": "Bitmiş eseri dijital olarak düzeltmem.",
  "Fingerprints and handmade marks remain visible.": "Parmak izleri ve el yapımı izler görünür kalır.",
  "Imperfection is part of the artwork.": "Kusurluluk eserin bir parçasıdır.",
  "Each original is signed by the artist.": "Her orijinal eser sanatçı tarafından imzalanır.",
  "Türkiye Collection Basket": "Türkiye Koleksiyon Sepeti",
  "International Originals Basket": "Uluslararası Orijinaller Sepeti",
  "Collection Basket": "Koleksiyon Sepeti",
  "A few pieces from the studio, ready to discuss.": "Stüdyodan seçtiğiniz eserler, birlikte görüşmeye hazır.",
  "Every collection is confirmed personally. Review your selection, then continue with Aida on WhatsApp to confirm availability, payment, and delivery.": "Her koleksiyon kişisel olarak onaylanır. Seçiminizi inceleyin, ardından stok, ödeme ve teslimatı onaylamak için WhatsApp üzerinden Aida ile devam edin.",
  "Your collection basket is waiting.": "Koleksiyon sepetiniz sizi bekliyor.",
  "Explore available work": "Mevcut eserleri keşfet",
  "Clear basket": "Sepeti temizle",
  "Collection summary": "Koleksiyon özeti",
  "Items subtotal": "Ürünler ara toplamı",
  "Shipping: Free within Türkiye": "Kargo: Türkiye içinde ücretsiz",
  "International shipping: Calculated separately": "Uluslararası kargo: Ayrıca hesaplanır",
  "Continue directly with the artist.": "Doğrudan sanatçıyla devam edin.",
  "Aida personally confirms every selection, answers questions, and arranges payment and delivery with you.": "Aida her seçimi kişisel olarak onaylar, sorularınızı yanıtlar ve ödeme ile teslimatı sizinle birlikte düzenler.",
  "Continue with Aida on WhatsApp": "WhatsApp üzerinden Aida ile devam et",
  "Review your selection": "Seçiminizi gözden geçirin",
  "Your basket does not reserve artwork or change inventory.": "Sepetiniz eseri ayırmaz veya stok durumunu değiştirmez.",
  "Every collection is confirmed personally with Aida before purchase.": "Her koleksiyon satın almadan önce Aida ile kişisel olarak onaylanır.",
  Artwork: "Eser",
  Items: "Ürünler",
  "line total": "satır toplamı",
};

function translateText(text: string) {
  const trimmed = text.trim();
  const translated = TR[trimmed];
  return translated
    ? `${text.slice(0, text.indexOf(trimmed))}${translated}${text.slice(text.indexOf(trimmed) + trimmed.length)}`
    : text;
}

const LocaleContext = createContext<{
  locale: SiteLocale;
  setLocale: (locale: SiteLocale) => void;
} | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setValue] = useState<SiteLocale>(() =>
    localStorage.getItem(STORAGE_KEY) === "tr" ? "tr" : "en",
  );
  const originalText = useRef(new WeakMap<Text, string>());

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    fetch("/api/currency")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (data.country === "TR") setValue("tr");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    const apply = (root: Node) => {
      if (root instanceof Text) {
        const original = originalText.current.get(root) ?? root.data;
        originalText.current.set(root, original);
        root.data = locale === "tr" ? translateText(original) : original;
        return;
      }
      if (!(root instanceof Element) || root.closest("[data-no-translate]")) return;
      root.childNodes.forEach(apply);
    };
    const site = document.querySelector("[data-public-site]");
    if (!site) return;
    apply(site);
    const observer = new MutationObserver((records) =>
      records.forEach((record) => record.addedNodes.forEach(apply)),
    );
    observer.observe(site, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  const setLocale = (next: SiteLocale) => {
    localStorage.setItem(STORAGE_KEY, next);
    setValue(next);
  };
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("LocaleProvider missing");
  return context;
}
