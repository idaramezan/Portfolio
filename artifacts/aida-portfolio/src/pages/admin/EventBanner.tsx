import { FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";
const camel = (x: any) =>
  Object.fromEntries(
    Object.entries(x || {}).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      v,
    ]),
  );
export default function EventBanner() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const headers = {
    "content-type": "application/json",
    "x-admin-password": password,
  };
  const [events, setEvents] = useState<any[]>([]),
    [form, setForm] = useState<any>(),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/events/admin/feature/settings", { headers })
      .then((r) => r.json())
      .then((x) => {
        setEvents(x.events || []);
        setForm({
          ...camel(x.feature),
          eventId: x.feature?.event_id || "",
          showOnHomepage: x.feature?.show_on_homepage ?? true,
          showOnTurkiyeShop: x.feature?.show_on_turkiye_shop ?? false,
          titleOverride: x.feature?.title_override || "",
          desktopObjectPosition: x.feature?.desktop_object_position || "center",
          mobileObjectPosition: x.feature?.mobile_object_position || "center",
          hideAfterEvent: x.feature?.hide_after_event ?? true,
          showRemainingPlaces: x.feature?.show_remaining_places ?? true,
        });
      });
  }, []);
  if (!form)
    return (
      <AdminLayout title="Homepage Event Feature">
        <p>Loading…</p>
      </AdminLayout>
    );
  const selected = events.find((x) => x.id === form.eventId);
  const set = (k: string, v: any) => setForm((x: any) => ({ ...x, [k]: v }));
  async function save(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/events/admin/feature/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify(form),
    });
    const x = await r.json();
    setMessage(r.ok ? "Homepage Event Feature saved." : x.error);
  }
  return (
    <AdminLayout title="Homepage Event Feature">
      <form onSubmit={save} className="max-w-4xl space-y-6">
        <div className="rounded border border-blue/30 bg-blue/10 p-5">
          <p className="font-semibold">
            The homepage feature uses content from the selected event. Edit the
            event itself to change its title, date, location, capacity, image or
            booking information.
          </p>
          <p className="mt-2 text-sm">
            Ana sayfa etkinlik alanı, seçilen etkinliğin bilgilerini kullanır.
            Başlık, tarih, konum, kapasite, görsel veya kayıt bilgilerini
            değiştirmek için etkinliğin kendisini düzenleyin.
          </p>
        </div>
        <section className="space-y-5 border border-ink/10 bg-paper p-6">
          <label className="flex gap-2 font-semibold">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set("enabled", e.target.checked)}
            />{" "}
            Enable homepage event feature
          </label>
          <label className="block font-semibold">
            Select event
            <select
              className="admin-input"
              value={form.eventId}
              onChange={(e) => set("eventId", e.target.value)}
            >
              <option value="">Choose an event</option>
              {events.map((e) => (
                <option value={e.id} key={e.id}>
                  {e.title_en} ·{" "}
                  {new Date(e.event_start_at).toLocaleDateString()} · {e.status}{" "}
                  · {e.remainingSeats} places
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <div className="flex flex-wrap items-center gap-3 rounded bg-[#f3efe6] p-4">
              {selected.image_url && (
                <img
                  className="h-20 w-24 object-cover"
                  src={selected.image_url}
                  alt=""
                />
              )}
              <div>
                <strong>{selected.title_en}</strong>
                <p>
                  {new Date(selected.event_start_at).toLocaleString()} ·{" "}
                  {selected.status}
                </p>
              </div>
              <Link
                className="button-secondary ml-auto"
                href={`/admin/events/${selected.id}`}
              >
                Edit selected event
              </Link>
            </div>
          )}
          <fieldset>
            <legend className="font-semibold">Display location</legend>
            <label className="mr-5">
              <input
                type="checkbox"
                checked={form.showOnHomepage}
                onChange={(e) => set("showOnHomepage", e.target.checked)}
              />{" "}
              Homepage
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.showOnTurkiyeShop}
                onChange={(e) => set("showOnTurkiyeShop", e.target.checked)}
              />{" "}
              Türkiye shop
            </label>
          </fieldset>
          <label className="block font-semibold">
            Optional short banner title override
            <input
              className="admin-input"
              value={form.titleOverride}
              onChange={(e) => set("titleOverride", e.target.value)}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="font-semibold">
              Desktop crop position
              <input
                className="admin-input"
                value={form.desktopObjectPosition}
                onChange={(e) => set("desktopObjectPosition", e.target.value)}
              />
            </label>
            <label className="font-semibold">
              Compact/mobile crop position
              <input
                className="admin-input"
                value={form.mobileObjectPosition}
                onChange={(e) => set("mobileObjectPosition", e.target.value)}
              />
            </label>
          </div>
          <label className="block">
            <input
              type="checkbox"
              checked={form.hideAfterEvent}
              onChange={(e) => set("hideAfterEvent", e.target.checked)}
            />{" "}
            Hide automatically after event date
          </label>
          <label className="block">
            <input
              type="checkbox"
              checked={form.showRemainingPlaces}
              onChange={(e) => set("showRemainingPlaces", e.target.checked)}
            />{" "}
            Show remaining-place badge
          </label>
        </section>
        <div className="flex gap-3">
          <button className="button-primary">Save feature</button>
          {selected && (
            <a
              className="button-secondary"
              target="_blank"
              href={`/events/${selected.slug}`}
            >
              Preview
            </a>
          )}
        </div>
        {message && <p role="status">{message}</p>}
      </form>
    </AdminLayout>
  );
}
