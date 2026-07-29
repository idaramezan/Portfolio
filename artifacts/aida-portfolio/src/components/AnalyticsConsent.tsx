import { useEffect, useState } from "react";
import { BarChart3, X } from "lucide-react";
import {
  ANALYTICS_CONSENT_KEY,
  setAnalyticsConsent,
  trackAnalytics,
} from "@/lib/analytics";

export default function AnalyticsConsent() {
  const [open, setOpen] = useState(
    () => localStorage.getItem(ANALYTICS_CONSENT_KEY) === null,
  );
  useEffect(() => {
    const manage = () => setOpen(true);
    window.addEventListener("analytics:manage", manage);
    return () => window.removeEventListener("analytics:manage", manage);
  }, []);
  const choose = (value: "accepted" | "declined") => {
    setAnalyticsConsent(value);
    setOpen(false);
    if (value === "accepted") {
      trackAnalytics("session_start");
      trackAnalytics("page_view");
    }
  };
  if (window.location.pathname.startsWith("/admin")) return null;
  return (
    <>
      {open && (
        <aside
          className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl border border-ink/15 bg-paper p-5 shadow-2xl"
          role="dialog"
          aria-labelledby="analytics-consent-title"
          aria-describedby="analytics-consent-copy"
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-2 top-2 grid min-h-11 min-w-11 place-items-center"
            aria-label="Close analytics preferences"
          >
            <X size={18} />
          </button>
          <div className="flex gap-3 pr-10">
            <BarChart3 className="mt-1 shrink-0 text-coral" />
            <div>
              <h2 id="analytics-consent-title" className="font-serif text-2xl">
                Studio analytics preferences
              </h2>
              <p
                id="analytics-consent-copy"
                className="mt-2 text-sm leading-6 text-ink/65"
              >
                Analytics helps Aida understand which pages and studio projects
                visitors find useful. It uses a random first-party identifier
                and approximate location. No raw IP address is stored.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="button-primary"
              onClick={() => choose("accepted")}
            >
              Accept analytics
            </button>
            <button className="admin-button" onClick={() => choose("declined")}>
              Decline analytics
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
