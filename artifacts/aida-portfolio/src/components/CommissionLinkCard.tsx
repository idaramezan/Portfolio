import { ExternalLink, Sparkles } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics";

const ETSY_URL =
  "https://www.etsy.com/listing/4546787742/custom-oil-pastel-portrait-from-photo";

export default function CommissionLinkCard({
  locale,
}: {
  locale: "en" | "tr";
}) {
  const text =
    locale === "tr"
      ? {
          eyebrow: "ÖZEL YAĞLI PASTEL SİPARİŞLER",
          title: "Aklında bir fikir mi var?",
          body: "Bir fotoğrafı, karakteri, mekânı veya fikrini Aida'nın el yapımı yağlı pastel çalışmasına dönüştür.",
          support:
            "Özel siparişler Etsy üzerinden alınır. Referanslarını ve Aida'nın oluşturmasını istediğin fikri sipariş sırasında paylaşabilirsin.",
          categories:
            "Evcil hayvanlar · mekânlar · karakterler · yaratıcı fikirler",
          cta: "Özel bir çalışma iste",
          trust:
            "Siparişini ve referanslarını Etsy üzerinden güvenle iletebilirsin.",
          destination: "Etsy'de açılır",
          aria: "Aida'nın yağlı pastel özel sipariş sayfasını Etsy'de aç",
          note: "senin için yapıldı ♡",
        }
      : {
          eyebrow: "CUSTOM OIL PASTEL COMMISSIONS",
          title: "Have something in mind?",
          body: "Turn a photo, character, place or idea into a handmade oil pastel artwork by Aida.",
          support:
            "Commissions are arranged through Etsy, where you can share your references and the idea you want Aida to create.",
          categories: "Pets · places · characters · creative ideas",
          cta: "Commission a piece",
          trust: "Order and send your references through Etsy.",
          destination: "Opens Etsy",
          aria: "Open Aida's oil pastel commission listing on Etsy",
          note: "made just for you ♡",
        };
  return (
    <section className="commission-link-card">
      <div className="commission-link-card__note" aria-hidden="true">
        <Sparkles /> {text.note}
      </div>
      <div className="commission-link-card__mark" aria-hidden="true">
        AR
      </div>
      <div className="commission-link-card__content">
        <p className="eyebrow">{text.eyebrow}</p>
        <h2>{text.title}</h2>
        <p className="commission-link-card__body">{text.body}</p>
        <p className="commission-link-card__support">{text.support}</p>
        <p className="commission-link-card__categories">{text.categories}</p>
        <a
          href={ETSY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="paper-button paper-button--pink paper-button--md"
          aria-label={text.aria}
          onClick={() =>
            trackAnalytics("commission_etsy_click", {
              metadata: {
                source: "links_page",
                destination: "etsy",
                type: "commission",
              },
            })
          }
        >
          <span>{text.cta}</span>
          <ExternalLink aria-hidden="true" />
        </a>
        <p className="commission-link-card__trust">
          {text.trust}{" "}
          <span>
            {text.destination} <ExternalLink aria-hidden="true" />
          </span>
        </p>
      </div>
    </section>
  );
}
