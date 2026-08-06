import { FormEvent, useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";
const fields = [
  "internalName",
  "slug",
  "titleEn",
  "titleTr",
  "shortDescriptionEn",
  "shortDescriptionTr",
  "fullDescriptionEn",
  "fullDescriptionTr",
  "locationTextEn",
  "locationTextTr",
  "city",
  "country",
  "imageUrl",
  "imageAltText",
  "recapTextEn",
  "recapTextTr",
];
const camel = (row: any) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, x) => x.toUpperCase()),
      v,
    ]),
  );
export default function EventsAdmin() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const headers = {
    "content-type": "application/json",
    "x-admin-password": password,
  };
  const [events, setEvents] = useState<any[]>([]),
    [form, setForm] = useState<any>(null),
    [message, setMessage] = useState("");
  const load = () =>
    fetch("/api/events/admin", { headers })
      .then((r) => r.json())
      .then((x) => {
        setEvents(x.events || []);
        if (!form && x.events?.[0]) setForm(camel(x.events[0]));
      });
  useEffect(() => {
    void load();
  }, []);
  const set = (k: string, v: any) => setForm((x: any) => ({ ...x, [k]: v }));
  async function create() {
    const title = prompt("English event title");
    if (!title) return;
    const start = new Date(Date.now() + 7 * 86400000).toISOString();
    const r = await fetch("/api/events/admin", {
      method: "POST",
      headers,
      body: JSON.stringify({
        titleEn: title,
        titleTr: title,
        eventStartAt: start,
        totalCapacity: 10,
      }),
    });
    const x = await r.json();
    if (r.ok) {
      setForm(camel(x.event));
      void load();
    } else setMessage(x.error);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const r = await fetch(`/api/events/admin/${form.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(form),
    });
    const x = await r.json();
    setMessage(r.ok ? "Event saved." : x.error);
    if (r.ok) void load();
  }
  if (!form)
    return (
      <AdminLayout title="Events">
        <button className="button-primary" onClick={create}>
          Create event
        </button>
        <p>{events.length ? "Loading event…" : "No events yet."}</p>
      </AdminLayout>
    );
  return (
    <AdminLayout title="Events">
      <div className="mb-6 flex flex-wrap gap-2">
        <select
          value={form.id}
          onChange={(e) =>
            setForm(camel(events.find((x) => x.id === e.target.value)))
          }
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.internal_name}
            </option>
          ))}
        </select>
        <button className="button-primary" onClick={create}>
          New event
        </button>
        <a className="button-secondary" href="/admin/events/painting-day">
          Attendees & applications
        </a>
      </div>
      <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
        <label>
          Enabled{" "}
          <input
            type="checkbox"
            checked={Boolean(form.enabled)}
            onChange={(e) => set("enabled", e.target.checked)}
          />
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {[
              "draft",
              "scheduled",
              "booking_open",
              "fully_booked",
              "booking_closed",
              "completed",
              "cancelled",
              "archived",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        {fields.map((k) => (
          <label key={k}>
            {k.replace(/([A-Z])/g, " $1")}{" "}
            {k.includes("Description") || k.includes("recap") ? (
              <textarea
                value={form[k] || ""}
                onChange={(e) => set(k, e.target.value)}
              />
            ) : (
              <input
                value={form[k] || ""}
                onChange={(e) => set(k, e.target.value)}
              />
            )}
          </label>
        ))}
        <label>
          Event starts
          <input
            type="datetime-local"
            value={(form.eventStartAt || "").slice(0, 16)}
            onChange={(e) => set("eventStartAt", e.target.value)}
          />
        </label>
        <label>
          Booking closes
          <input
            type="datetime-local"
            value={(form.bookingCloseAt || "").slice(0, 16)}
            onChange={(e) => set("bookingCloseAt", e.target.value)}
          />
        </label>
        <label>
          Capacity
          <input
            type="number"
            min="1"
            value={form.totalCapacity || 1}
            onChange={(e) => set("totalCapacity", Number(e.target.value))}
          />
          <small>
            Remaining places are calculated automatically and cannot be edited.
          </small>
        </label>
        <label>
          Price (TRY)
          <input
            type="number"
            min="0"
            value={form.participationPriceTry || 0}
            onChange={(e) =>
              set("participationPriceTry", Number(e.target.value))
            }
          />
        </label>
        <label>
          Audience
          <select
            value={form.audience}
            onChange={(e) => set("audience", e.target.value)}
          >
            <option value="everyone">Everyone</option>
            <option value="girls_only">Girls only</option>
            <option value="boys_only">Boys only</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={Boolean(form.publicArchive)}
            onChange={(e) => set("publicArchive", e.target.checked)}
          />{" "}
          Show in public archive
        </label>
        <label>
          <input
            type="checkbox"
            checked={Boolean(form.photoConsentConfirmed)}
            onChange={(e) => set("photoConsentConfirmed", e.target.checked)}
          />{" "}
          I confirm permission to publish event photographs
        </label>
        <div className="md:col-span-2">
          <button className="button-primary">Save event</button>
          {message && <p role="status">{message}</p>}
        </div>
      </form>
      <section className="mt-10 border-t pt-6">
        <h2 className="font-serif text-3xl">Reviews & invitations</h2>
        <p>
          Mark attendance and send secure, expiring review invitations from
          Attendees & applications. Reviews remain pending until approved.
        </p>
      </section>
    </AdminLayout>
  );
}
