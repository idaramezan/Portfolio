import StudioLetterSignup from "@/components/StudioLetterSignup";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function Newsletter() {
  usePageMeta(
    "Studio Letter | Aida Ramezani",
    "Join Aida Ramezani’s free Studio Letter for stories behind the paintings, studio notes, new originals and early notice of limited releases.",
  );

  return (
    <main>
      <StudioLetterSignup variant="story-preview" context="newsletter" />
    </main>
  );
}
