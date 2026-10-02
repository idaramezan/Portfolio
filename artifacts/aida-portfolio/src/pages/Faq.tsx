import { usePageMeta } from "@/hooks/use-page-meta";
const groups = [
  {
    title: "Prints",
    items: [
      [
        "What kind of print is this?",
        "Each print page lists its exact paper, production and size details.",
      ],
      [
        "How long will delivery take?",
        "Timing depends on destination and format. You will see the relevant delivery information during checkout.",
      ],
      [
        "Are frames available?",
        "Selected prints offer a ready-framed option. Available formats appear on the print page.",
      ],
      [
        "What if my order arrives damaged?",
        "Photograph the packaging and artwork and email aida@aedaart.com so it can be made right.",
      ],
    ],
  },
  {
    title: "Originals",
    items: [
      [
        "How do I collect an original?",
        "Open the artwork page and send an enquiry. Aida will reply personally with availability and next steps.",
      ],
      [
        "Do you ship originals internationally?",
        "Yes. Shipping is discussed individually so the safest method can be chosen for the work and destination.",
      ],
      [
        "Why are original prices not displayed?",
        "Original works are handled personally. Availability, shipping and collection details are confirmed before a price is shared.",
      ],
      [
        "How does an artwork request work?",
        "Your request identifies the artwork and gives Aida the information needed to discuss availability and delivery with you.",
      ],
    ],
  },
  {
    title: "Commissions",
    items: [
      [
        "Do you take painting commissions?",
        "Selected painting commissions are accepted when the project is a good fit.",
      ],
      [
        "Do you create music videos?",
        "Yes. Aida creates animated music videos, visualizers and other moving-image work for musicians.",
      ],
      [
        "How do moving-image commissions work?",
        "Send a creative enquiry with your track, timing and budget. Aida will reply with availability and a suggested next step.",
      ],
    ],
  },
];
export default function Faq() {
  usePageMeta(
    "FAQ | Aeda Art",
    "Answers about prints, original paintings, delivery and commissions.",
  );
  return (
    <div className="faq-page">
      <header className="portfolio-page-header section-shell">
        <p className="portfolio-kicker">FAQ</p>
        <h1>A few useful answers.</h1>
      </header>
      <div className="faq-groups section-shell">
        {groups.map((group) => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {group.items.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
