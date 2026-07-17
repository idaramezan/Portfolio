import { useState } from "react";
import { useSubscribeNewsletter } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function Newsletter({ className }: { className?: string }) {
  const subscribe = useSubscribeNewsletter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    subscribe.mutate({ data: { email, name } }, {
      onSuccess: () => {
        setSubmitted(true);
      }
    });
  };

  return (
    <div className={cn("bg-ochre/10 p-6 md:p-8 torn-edge-2 relative", className)}>
      <h3 className="font-hand text-3xl md:text-4xl text-ink mb-2 -rotate-2 origin-left">
        Stay in the loop
      </h3>
      
      {submitted ? (
        <div className="py-8 animate-in fade-in zoom-in duration-500">
          <p className="font-sans text-lg text-ink">
            You're in! Expect occasional updates on new work and events.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          <p className="font-sans text-sm text-muted-foreground mb-2">
            Join the studio newsletter for early access to new collections.
          </p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="First name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-paper border border-ink/20 px-4 py-3 font-sans text-ink placeholder:text-muted-foreground focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral transition-colors torn-edge"
            />
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-paper border border-ink/20 px-4 py-3 font-sans text-ink placeholder:text-muted-foreground focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral transition-colors torn-edge-3"
            />
          </div>
          <button
            type="submit"
            disabled={subscribe.isPending}
            className="mt-2 bg-ink text-paper font-serif font-bold text-lg px-6 py-3 hover:bg-coral transition-colors torn-edge-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {subscribe.isPending ? "Subscribing..." : "Subscribe"}
          </button>
        </form>
      )}
    </div>
  );
}
