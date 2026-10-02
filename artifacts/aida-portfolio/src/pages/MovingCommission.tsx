import { useLocation } from "wouter";
import EnquiryDialog from "@/components/EnquiryDialog";
import { usePageMeta } from "@/hooks/use-page-meta";
export default function MovingCommission() {
  const [, navigate] = useLocation();
  usePageMeta(
    "Moving Image Commission | Aeda Art",
    "Enquire about animation, music visuals and moving-image commissions with Aida Ramezani.",
  );
  return (
    <div className="enquiry-page">
      <header className="portfolio-page-header section-shell">
        <p className="portfolio-kicker">CREATIVE ENQUIRY</p>
        <h1>Let’s build a world for your music.</h1>
        <p>
          Share what you are making, where you are in the process and what kind
          of visual you have in mind.
        </p>
      </header>
      <section className="section-shell enquiry-page__launcher">
        <EnquiryDialog
          kind="moving_image"
          subjectName="Moving Image commission"
          defaultOpen
          onOpenChange={(open) => {
            if (!open) navigate("/moving-image");
          }}
          trigger={
            <button type="button" className="button-primary">
              Open commission form
            </button>
          }
        />
      </section>
    </div>
  );
}
