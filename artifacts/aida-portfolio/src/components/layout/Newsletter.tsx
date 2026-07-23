import StudioLetterSignup from "@/components/StudioLetterSignup";
import { cn } from "@/lib/utils";

export default function Newsletter({ className }: { className?: string }) {
  return (
    <div className={cn(className)}>
      <StudioLetterSignup variant="footer" context="footer" />
    </div>
  );
}
