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
  const [showDetails, setShowDetails] = useState(false);
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
          className="analytics-sheet fixed inset-x-0 bottom-0 z-[100] mx-auto bg-paper shadow-2xl"
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
          <div className="analytics-sheet__inner">
          <div className="flex gap-3 pr-10">
            <span className="analytics-sheet__icon"><BarChart3 aria-hidden="true" /></span>
            <div>
              <h2 id="analytics-consent-title">
                Analytics preferences
              </h2>
              <p
                id="analytics-consent-copy"
                className="mt-2 text-sm leading-6 text-ink/65"
              >
                Analytics helps Aida understand which pages and studio projects visitors find useful. A random first-party identifier and approximate location may be used. Raw IP addresses are not stored.
              </p>
              {showDetails && <p className="analytics-sheet__details">You can accept or decline now and change your choice later from Privacy choices in the footer or mobile menu.</p>}
            </div>
          </div>
          <div className="analytics-sheet__actions">
            <button
              className="analytics-sheet__accept"
              onClick={() => choose("accepted")}
            >
              Accept analytics
            </button>
            <button className="analytics-sheet__decline" onClick={() => choose("declined")}>
              Decline analytics
            </button>
            <button type="button" className="analytics-sheet__manage" onClick={() => setShowDetails((value) => !value)}>Manage preferences</button>
          </div>
          </div>
        </aside>
      )}
    </>
  );
}
