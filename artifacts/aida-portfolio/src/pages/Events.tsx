import { useState } from "react";
import {
  useListEvents,
  getListEventsQueryKey,
  Event,
  useSignupForEvent,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function EventCard({ event, index }: { event: Event; index: number }) {
  const signup = useSignupForEvent();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    signup.mutate(
      { id: event.id, data: { name, email } },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      },
    );
  };

  const edgeClass = index % 2 === 0 ? "torn-edge" : "torn-edge-3";
  const date = new Date(event.dateTime);

  return (
    <div
      className={cn(
        "bg-paper border-2 border-ink p-6 md:p-10 relative overflow-hidden",
        edgeClass,
      )}
    >
      {/* Tape decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-24 h-6 bg-white/40 backdrop-blur-sm transform rotate-[-2deg] shadow-sm z-10 border border-ink/5"></div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1">
          <div className="mb-4">
            <span className="font-hand text-3xl md:text-4xl text-coral block mb-2">
              {format(date, "MMMM do, yyyy")}
            </span>
            <span className="font-sans text-ink/70 font-medium uppercase tracking-widest text-sm">
              {format(date, "h:mm a")} • {event.location}
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-4">
            {event.title}
          </h2>
          <p className="font-sans text-lg text-ink/80 leading-relaxed whitespace-pre-wrap mb-8">
            {event.description}
          </p>

          {!showForm && !submitted && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-ink text-paper font-serif text-lg px-8 py-3 hover:bg-blue transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 torn-edge-2 inline-block"
            >
              RSVP to this Event
            </button>
          )}

          {showForm && !submitted && (
            <form
              onSubmit={handleSubmit}
              className="bg-ochre/10 p-6 torn-edge-3 animate-in fade-in slide-in-from-top-4"
            >
              <h4 className="font-serif text-xl font-bold mb-4 text-ink">
                Save your spot
              </h4>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-paper border border-ink/20 px-4 py-3 font-sans text-ink focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue torn-edge"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-paper border border-ink/20 px-4 py-3 font-sans text-ink focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue torn-edge-2"
                />
                <div className="flex gap-4 mt-2">
                  <button
                    type="submit"
                    disabled={signup.isPending}
                    className="flex-1 bg-blue text-paper font-serif font-bold px-6 py-3 hover:bg-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue torn-edge"
                  >
                    {signup.isPending ? "Confirming..." : "Confirm RSVP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 font-sans text-ink/70 hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {submitted && (
            <div className="bg-green/10 border border-green p-6 torn-edge text-center animate-in zoom-in-95">
              <p className="font-hand text-3xl text-green mb-2">
                You're on the list!
              </p>
              <p className="font-sans text-ink">
                We've saved your spot for {event.title}. See you there!
              </p>
            </div>
          )}
        </div>

        {event.imageUrl && (
          <div className="w-full lg:w-1/3 aspect-square lg:aspect-auto bg-ink/5 p-2 transform rotate-1 transition-transform hover:rotate-0">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover torn-edge-2 shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Events() {
  const { data: events, isLoading } = useListEvents(
    { upcoming: true },
    {
      query: { queryKey: getListEventsQueryKey({ upcoming: true }) },
    },
  );

  const validEvents = Array.isArray(events) ? events : [];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-24">
      <div className="mb-16">
        <h1 className="text-5xl md:text-7xl font-serif text-ink mb-6">
          Upcoming Events
        </h1>
        <p className="text-xl text-ink/80 font-sans leading-relaxed">
          Exhibitions, studio visits, and pop-up shows.
        </p>
      </div>

      {isLoading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="font-hand text-3xl text-ink animate-pulse">
            Checking the calendar...
          </div>
        </div>
      ) : validEvents.length > 0 ? (
        <div className="flex flex-col gap-12">
          {validEvents.map((event, idx) => (
            <EventCard key={event.id} event={event} index={idx} />
          ))}
        </div>
      ) : (
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-card border border-ink/10 torn-edge-2 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 font-hand text-4xl text-ink rotate-[-5deg]">
            Empty
          </div>
          <h3 className="font-serif text-3xl text-ink mb-4 mt-6">
            No upcoming events
          </h3>
          <p className="text-muted-foreground font-sans text-lg max-w-md mx-auto">
            I'm currently busy in the studio working on new pieces. Join the
            newsletter to hear when the next show is announced.
          </p>
        </div>
      )}
    </div>
  );
}
