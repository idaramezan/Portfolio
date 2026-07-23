import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";

const paths = [
  {
    label: "Türkiye",
    heading: "Collect directly within Türkiye",
    steps: [
      "Choose Originals, Prints & Goods or Mystery Mail.",
      "Add items to the Türkiye Basket.",
      "Continue with Aida on WhatsApp.",
      "Availability is confirmed personally.",
      "Shipping details are confirmed based on the selected pieces.",
    ],
    href: "/shop/turkiye",
  },
  {
    label: "International originals",
    heading: "Collect an original internationally",
    steps: [
      "Browse internationally available originals.",
      "Add the selected original to the International Basket.",
      "Continue with Aida on WhatsApp.",
      "Availability and international shipping are confirmed.",
      "Shipping is paid separately from the artwork price.",
    ],
    href: "/shop/international/originals",
  },
  {
    label: "International prints",
    heading: "Order prints through Fourthwall",
    steps: [
      "Browse the Fourthwall print collection.",
      "Open the chosen item on Fourthwall.",
      "Select available variants.",
      "Complete payment and shipping through Fourthwall.",
    ],
    href: "/shop/international/prints",
  },
];

export default function HowToCollect() {
  usePageMeta(
    "How to Collect — Aida Ramezani",
    "Learn how to collect Aida Ramezani originals, Türkiye editions and international Fourthwall prints.",
  );
  return (
    <div className="section-shell">
      <p className="eyebrow">How to collect</p>
      <h1 className="mt-4 max-w-4xl text-5xl md:text-7xl">
        Choose the path that fits where you live.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
        Every path keeps the process clear, whether you collect directly from
        Aida or complete an international print order through Fourthwall.
      </p>
      <div className="mt-12 grid gap-px bg-ink/10 lg:grid-cols-3">
        {paths.map((path) => (
          <section key={path.label} className="flex flex-col bg-card p-7">
            <p className="eyebrow">{path.label}</p>
            <h2 className="mt-4 text-3xl">{path.heading}</h2>
            <ol className="mt-6 flex-1 space-y-4">
              {path.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed">
                  <span className="font-hand text-xl text-coral">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <Link href={path.href} className="button-secondary mt-7">
              Browse this shop
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
