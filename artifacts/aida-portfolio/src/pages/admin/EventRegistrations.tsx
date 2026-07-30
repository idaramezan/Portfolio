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
  seat_count: number;
  participation_fee_try: number;
  email_delivery_status: "pending" | "sent" | "failed";
  whatsapp_confirmation_status: "not_contacted" | "contacted";
  reservation_status: "interest" | "confirmed" | "cancelled" | "attended";
};
type Application = { id:string; application_number:string; full_name:string; age:number; eligibility_response:string; email:string; phone:string; status:string; created_at:string };

export default function EventRegistrations() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [remainingSeats, setRemainingSeats] = useState(8);
  const [capacity, setCapacity] = useState(11);
  const [price, setPrice] = useState(150);
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
        setRemainingSeats(Number(result.remainingSeats ?? 0));
        setCapacity(Number(result.config?.total_capacity ?? 11));
        setPrice(Number(result.config?.participation_price_try ?? 150));
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Registrations could not be loaded",
        ),
      )
      .finally(() => setLoading(false));
    fetch("/api/admin/checkout/event-applications", { headers: { "x-admin-password": password }, cache: "no-store" })
      .then(async response => { const result=await response.json(); if(!response.ok) throw new Error(result.error); setApplications(result.applications||[]); })
      .catch(reason=>setError(reason instanceof Error?reason.message:"Applications could not be loaded"));
  };
  const updateApplication=async(application:Application,status:string)=>{const response=await fetch(`/api/admin/checkout/event-applications/${application.id}/status`,{method:"PATCH",headers:{"content-type":"application/json","x-admin-password":password},body:JSON.stringify({status})});const result=await response.json();if(!response.ok)return setError(result.error||"Application could not be updated");setMessage(`Application ${application.application_number} updated.`);load();};

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
            seatCount: next.seat_count,
            isFree: next.is_free,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");
      setRegistrations((current) =>
        current.map((item) =>
          item.id === registration.id ? result.registration : item,
        ),
      );
      setRemainingSeats(Number(result.remainingSeats ?? remainingSeats));
      setMessage("Event registration updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Update failed");
    }
  };

  const preview = async () => {
    setError("");
    try {
      const response = await fetch("/api/newsletter/event-email-preview", {
        headers: { "x-admin-password": password },
      });
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
      <section className="mb-8 border border-ink/10 bg-paper p-5">
        <h2 className="font-serif text-2xl">Applications</h2>
        <p className="mt-1 text-sm text-ink/55">Applications begin as pending and reserve capacity only after acceptance.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-ink/10"><th className="p-3">Application</th><th>Name</th><th>Age</th><th>Eligibility</th><th>Contact</th><th>Status</th></tr></thead><tbody>{applications.map(application=><tr key={application.id} className="border-b border-ink/10"><td className="p-3 font-bold">{application.application_number}</td><td>{application.full_name}</td><td>{application.age}</td><td>{application.eligibility_response}</td><td>{application.email}<br/>{application.phone}</td><td><select className="admin-input !mt-0" value={application.status} onChange={event=>void updateApplication(application,event.target.value)}>{["pending","accepted","waitlisted","rejected","cancelled","attended"].map(status=><option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>
      </section>
      <section className="border border-ink/10 bg-paper p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-coral">
              Wednesday, 5 August 2026 · 4:00 PM
            </p>
            <h2 className="mt-2 font-serif text-3xl">
              Istanbul summer painting day
            </h2>
            <p className="mt-2 text-sm text-ink/55">
              {registrations.length} unique event-interest submissions ·{" "}
              {remainingSeats} {remainingSeats === 1 ? "place" : "places"}{" "}
              remaining
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="admin-button"
              onClick={() => void preview()}
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
                  <th className="px-4 py-3">Newsletter</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Cost</th>
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
                        value={registration.seat_count}
                        onChange={(event) =>
                          void update(registration, {
                            seat_count: Number(event.target.value),
                          })
                        }
                        aria-label={`Seat count for ${registration.email}`}
                      >
                        {Array.from(
                          { length: capacity },
                          (_, index) => index + 1,
                        ).map((count) => (
                          <option key={count} value={count}>
                            {count}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="admin-input !mt-0"
                        value={registration.is_free ? "free" : "paid"}
                        onChange={(event) =>
                          void update(registration, {
                            is_free: event.target.value === "free",
                          })
                        }
                        aria-label={`Payment type for ${registration.email}`}
                      >
                        <option value="paid">Paid</option>
                        <option value="free">Free</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {registration.is_free
                        ? 0
                        : registration.seat_count * price}{" "}
                      TL
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
