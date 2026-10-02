import { usePageMeta } from "@/hooks/use-page-meta";

export function Privacy() {
  usePageMeta(
    "Privacy | Aeda Art",
    "How Aeda Art handles information shared through the website.",
  );
  return (
    <article className="legal-page section-shell">
      <p className="portfolio-kicker">PRIVACY</p>
      <h1>Your information stays personal.</h1>
      <p>
        Information submitted through orders, newsletter signup and enquiry
        forms is used only to provide the service you requested, communicate
        with you and meet legal obligations. Payment details are not stored by
        this website.
      </p>
      <h2>Analytics and cookies</h2>
      <p>
        Optional analytics are used only after consent. You can change your
        privacy choice through the consent control when it is available.
      </p>
      <h2>Contact</h2>
      <p>
        To ask about, correct or remove your personal information, email{" "}
        <a href="mailto:aida@aedaart.com">aida@aedaart.com</a>.
      </p>
    </article>
  );
}
export function Terms() {
  usePageMeta(
    "Terms | Aeda Art",
    "Website, artwork, order and enquiry terms for Aeda Art.",
  );
  return (
    <article className="legal-page section-shell">
      <p className="portfolio-kicker">TERMS</p>
      <h1>Website and collecting terms.</h1>
      <p>
        Artwork images and writing remain the copyright of Aida Ramezani and may
        not be reproduced without permission.
      </p>
      <h2>Print and studio orders</h2>
      <p>
        Product availability, delivery costs and final totals are confirmed
        through the relevant checkout. If an item arrives damaged, contact Aida
        with photographs of the item and packaging.
      </p>
      <h2>Original artworks and commissions</h2>
      <p>
        An enquiry is not a purchase or reservation. Availability, scope, price,
        delivery and payment terms are agreed personally before work begins or
        an original is collected.
      </p>
    </article>
  );
}
