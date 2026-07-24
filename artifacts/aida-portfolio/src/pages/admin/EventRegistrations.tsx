import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

type Registration = {
  id: number;
  email: string;
  created_at: string;
  subscriber_status: "new" | "existing";
  is_free: boolean;
  participation_fee_try: number;
  email_delivery_status: "pending" | "sent" | "failed";
  whatsapp_confirmation_status: "not_contacted" | "contacted";
  reservation_status: "interest" | "confirmed" | "cancelled" | "attended";
};

export default function EventRegistrations() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/newsletter/event-interests", {
      headers: { "x-admin-password": password },
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Registrations could not be loaded");
        setRegistrations(result.registrations || []);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Registrations could not be loaded",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = async (
    registration: Registration,
    values: Partial<Registration>,
  ) => {
    setMessage("");
    setError("");
    const next = { ...registration, ...values };
    try {
      const response = await fetch(
        `/api/newsletter/event-interests/${registration.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify({
            whatsappConfirmationStatus: next.whatsapp_confirmation_status,
            reservationStatus: next.reservation_status,
            isFree: next.is_free,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");
      setRegistrations((current) =>
        current.map((item) => (item.id === registration.id ? next : item)),
      );
      setMessage("Event registration updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Update failed");
    }
  };

  const preview = async (tier: "standard" | "complimentary") => {
    setError("");
    try {
      const response = await fetch(
        `/api/newsletter/event-email-preview?tier=${tier}`,
        { headers: { "x-admin-password": password } },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Preview failed");
      const previewUrl = URL.createObjectURL(
        new Blob([result.html], { type: "text/html" }),
      );
      const previewWindow = window.open(
        previewUrl,
        "_blank",
        "noopener,noreferrer",
      );
      if (!previewWindow) {
        URL.revokeObjectURL(previewUrl);
        throw new Error("Allow popups to open the email preview");
      }
      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Preview failed");
    }
  };

  return (
    <AdminLayout
      title="Painting day registrations"
      actions={
        <button type="button" className="admin-button" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      <section className="border border-ink/10 bg-paper p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-coral">4 August 2026</p>
            <h2 className="mt-2 font-serif text-3xl">
              Istanbul summer painting day
            </h2>
            <p className="mt-2 text-sm text-ink/55">
              {registrations.length} unique event-interest submissions ·
              Complimentary places are assigned privately by Aida
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="admin-button"
              onClick={() => void preview("standard")}
            >
              Event email preview <ExternalLink size={14} />
            </button>
          </div>
        </div>
        <div aria-live="polite">
          {message && (
            <p className="mt-4 text-sm font-semibold text-green-800">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm font-semibold text-coral">
              {error}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 overflow-hidden border border-ink/10 bg-paper">
        {loading ? (
          <p className="p-6 text-sm text-ink/55">Loading registrations…</p>
        ) : !registrations.length ? (
          <p className="p-6 text-sm text-ink/55">No event registrations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-[#f3efe6] text-xs uppercase tracking-[.1em] text-ink/50">
                <tr>
                  <th className="px-4 py-3">Subscriber</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Studio Letter</th>
                  <th className="px-4 py-3">Place</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Reservation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {registrations.map((registration) => (
                  <tr key={registration.id}>
                    <td className="px-4 py-4">
                      <a
                        href={`mailto:${registration.email}`}
                        className="text-coral hover:underline"
                      >
                        {registration.email}
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/Istanbul",
                      }).format(new Date(registration.created_at))}
                    </td>
                    <td className="px-4 py-4 capitalize">
                      {registration.subscriber_status}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="admin-input !mt-0"
                        value={
                          registration.is_free ? "complimentary" : "standard"
                        }
                        onChange={(event) =>
                          void update(registration, {
                            is_free: event.target.value === "complimentary",
                          })
                        }
                        aria-label={`Participation type for ${registration.email}`}
                      >
                        <option value="standard">Standard</option>
                        <option value="complimentary">Complimentary</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      {registration.is_free ? 0 : 150} TL
                    </td>
                    <td className="px-4 py-4 capitalize">
                      {registration.email_delivery_status}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="admin-input !mt-0"
                        value={registration.whatsapp_confirmation_status}
                        onChange={(event) =>
                          void update(registration, {
                            whatsapp_confirmation_status: event.target
                              .value as Registration["whatsapp_confirmation_status"],
                          })
                        }
                      >
                        <option value="not_contacted">Not contacted</option>
                        <option value="contacted">Contacted</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="admin-input !mt-0"
                        value={registration.reservation_status}
                        onChange={(event) =>
                          void update(registration, {
                            reservation_status: event.target
                              .value as Registration["reservation_status"],
                          })
                        }
                      >
                        <option value="interest">Interest only</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="attended">Attended</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
