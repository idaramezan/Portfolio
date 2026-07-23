import { useState } from "react";
import { useSubscribeNewsletter } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function Newsletter({ className }: { className?: string }) {
  const subscribe = useSubscribeNewsletter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const errorId = "footer-newsletter-error";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    subscribe.mutate(
      { data: { email, name: "" } },
      {
        onSuccess: () => setSubmitted(true),
      },
    );
  };

  if (submitted)
    return (
      <div
        className={cn("footer-newsletter-success", className)}
        role="status"
        aria-live="polite"
      >
        <p className="font-serif text-2xl text-paper">
          You’re on the Studio Letter list.
        </p>
        <p className="mt-2 text-sm text-paper/60">
          Watch your inbox for occasional notes from the studio.
        </p>
      </div>
    );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("footer-newsletter-form", className)}
      noValidate={false}
    >
      <label htmlFor="footer-newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="footer-newsletter-controls">
        <input
          id="footer-newsletter-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          aria-invalid={subscribe.isError ? "true" : undefined}
          aria-describedby={subscribe.isError ? errorId : undefined}
          className="footer-newsletter-input"
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="footer-newsletter-button"
        >
          {subscribe.isPending ? "Joining…" : "Join the Studio Letter"}
        </button>
      </div>
      {subscribe.isError && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-[#ef7a64]">
          We couldn’t add you just now. Please try again.
        </p>
      )}
      <p className="mt-3 text-xs text-paper/45">
        Occasional notes only. Unsubscribe anytime.
      </p>
    </form>
  );
}
