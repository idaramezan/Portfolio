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
const statuses = [
  "draft",
  "scheduled",
  "booking_open",
  "fully_booked",
  "booking_closed",
  "completed",
  "cancelled",
  "archived",
];
const tabs = [
  "Overview",
  "Content",
  "Schedule & booking",
  "Location",
  "Images",
  "Attendees",
  "Reviews",
  "Publishing",
];
function useAdmin() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  return {
    headers: {
      "content-type": "application/json",
      "x-admin-password": password,
    },
    password,
  };
}
export default function EventsAdmin({ eventId }: { eventId?: string }) {
  const { headers } = useAdmin();
  const [events, setEvents] = useState<any[]>([]),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("date_desc");
  const load = () =>
    fetch("/api/events/admin", { headers })
      .then((r) => r.json())
      .then((x) => setEvents(x.events || []));
  useEffect(() => {
    void load();
  }, []);
  async function create() {
    const title = prompt("English event title");
    if (!title) return;
    const r = await fetch("/api/events/admin", {
      method: "POST",
      headers,
      body: JSON.stringify({
        titleEn: title,
        titleTr: title,
        eventStartAt: new Date(Date.now() + 604800000).toISOString(),
        totalCapacity: 10,
      }),
    });
    const x = await r.json();
    if (r.ok) location.href = `/admin/events/${x.event.id}`;
  }
  if (eventId)
    return <EventEditor id={eventId} events={events} reload={load} />;
  const shown = events
    .filter((e) =>
      `${e.title_en} ${e.internal_name} ${e.slug}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .filter(
      (e) =>
        filter === "all" ||
        (filter === "upcoming" && Date.parse(e.event_start_at) > Date.now()) ||
        e.status === filter,
    )
    .sort((a, b) =>
      sort === "date_asc"
        ? Date.parse(a.event_start_at) - Date.parse(b.event_start_at)
        : sort === "created"
          ? Date.parse(b.created_at) - Date.parse(a.created_at)
          : sort === "updated"
            ? Date.parse(b.updated_at) - Date.parse(a.updated_at)
            : Date.parse(b.event_start_at) - Date.parse(a.event_start_at),
    );
  return (
    <AdminLayout
      title="Events"
      actions={
        <button className="button-primary" onClick={create}>
          New event
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <a className="button-secondary" href="/events" target="_blank">
          View public events page
        </a>
        <Link className="button-secondary" href="/admin/events/painting-day">
          Attendees
        </Link>
        <Link className="button-secondary" href="/admin/events/reviews">
          Reviews
        </Link>
      </div>
      <section className="mb-5 grid gap-3 rounded border border-ink/10 bg-paper p-4 md:grid-cols-3">
        <input
          className="admin-input"
          placeholder="Search title, internal name or slug"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            "all",
            "upcoming",
            "booking_open",
            "completed",
            "draft",
            "archived",
          ].map((x) => (
            <option value={x} key={x}>
              {x.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="created">Newest created</option>
          <option value="date_asc">Event date ascending</option>
          <option value="date_desc">Event date descending</option>
          <option value="updated">Recently updated</option>
        </select>
      </section>
      <div className="space-y-3">
        {shown.map((e) => (
          <article
            key={e.id}
            className="grid items-center gap-4 border border-ink/10 bg-paper p-4 md:grid-cols-[80px_1fr_auto]"
          >
            <div className="h-20 bg-ink/5">
              {e.image_url && (
                <img
                  className="h-full w-full object-cover"
                  src={e.image_url}
                  alt=""
                />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-xl font-bold">{e.title_en}</h2>
                <span className="rounded-full bg-pink/30 px-2 py-1 text-xs font-bold uppercase">
                  {e.status.replaceAll("_", " ")}
                </span>
              </div>
              <p>
                {new Date(e.event_start_at).toLocaleString()} ·{" "}
                {e.reservedSeats} registrations / {e.total_capacity} capacity ·{" "}
                {e.remainingSeats} remaining · {e.reviews?.length || 0} reviews
              </p>
            </div>
            <Link className="button-secondary" href={`/admin/events/${e.id}`}>
              Edit
            </Link>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
}
function EventEditor({
  id,
  events,
  reload,
}: {
  id: string;
  events: any[];
  reload: () => void;
}) {
  const { headers, password } = useAdmin();
  const [form, setForm] = useState<any>(),
    [tab, setTab] = useState("Overview"),
    [dirty, setDirty] = useState(false),
    [attendees, setAttendees] = useState<any[]>([]),
    [invitations, setInvitations] = useState<any[]>([]),
    [reviews, setReviews] = useState<any[]>([]),
    [message, setMessage] = useState(""),
    [link, setLink] = useState<any>();
  const event = events.find((e) => e.id === id);
  useEffect(() => {
    if (event) {
      const next = camel(event);
      next.gallery = (event.gallery || []).map((x: any) => camel(x));
      setForm(next);
    }
  }, [event]);
  const refreshRelated = () =>
    Promise.all([
      fetch(`/api/events/admin/${id}/attendees`, { headers })
        .then((r) => r.json())
        .then((x) => {
          setAttendees(x.attendees || []);
          setInvitations(x.invitations || []);
        }),
      fetch(`/api/events/admin/reviews/all?eventId=${id}`, { headers })
        .then((r) => r.json())
        .then((x) => setReviews(x.reviews || [])),
    ]);
  useEffect(() => {
    void refreshRelated();
  }, [id]);
  const set = (k: string, v: any) => {
    setDirty(true);
    setForm((x: any) => ({ ...x, [k]: v }));
  };
  async function save(e?: FormEvent, status?: string) {
    e?.preventDefault();
    const body = { ...form, status: status || form.status };
    const r = await fetch(`/api/events/admin/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    const x = await r.json();
    setMessage(r.ok ? "Event saved." : x.error);
    if (r.ok) {
      setDirty(false);
      setForm(camel(x.event));
      reload();
    }
  }
  async function upload(files: FileList | null, gallery = false) {
    if (!files) return;
    const urls = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("image", file);
      body.append("productId", "media-library");
      const r = await fetch("/api/admin/product-media", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const x = await r.json();
      if (r.ok) urls.push(x.imageUrl);
    }
    if (gallery) {
      const images = [
        ...(form.gallery || []),
        ...urls.map((url, i) => ({
          imageUrl: url,
          altText: "",
          caption: "",
          isPrivate: false,
          isCover: !(form.gallery || []).length && !i,
        })),
      ];
      set("gallery", images);
    } else if (urls[0]) set("imageUrl", urls[0]);
  }
  async function saveGallery() {
    if ((form.gallery || []).some((x: any) => !x.altText)) {
      setMessage("Add alt text to every public gallery image.");
      return;
    }
    const r = await fetch(`/api/events/admin/${id}/gallery`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ images: form.gallery || [] }),
    });
    setMessage(r.ok ? "Gallery saved." : "Gallery could not be saved.");
  }
  async function attendeeStatus(
    a: any,
    registration: string,
    attendance: string,
  ) {
    await fetch(`/api/events/admin/attendees/${a.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        registrationStatus: registration,
        attendanceStatus: attendance,
      }),
    });
    void refreshRelated();
  }
  async function invite(a: any, sendEmail = false) {
    const r = await fetch(`/api/events/admin/${id}/invitations/${a.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sendEmail }),
    });
    const x = await r.json();
    if (r.ok) {
      setLink({ ...x, attendee: a });
      setMessage(
        sendEmail
          ? "Review invitation sent."
          : `Private review link generated for ${a.full_name}.`,
      );
      void refreshRelated();
    } else setMessage(x.error);
  }
  async function moderate(r: any, status: string) {
    await fetch(`/api/events/admin/reviews/${r.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status }),
    });
    void refreshRelated();
  }
  if (!form)
    return (
      <AdminLayout title="Event">
        <p>Loading…</p>
      </AdminLayout>
    );
  const ended =
    Date.parse(form.eventStartAt) < Date.now() &&
    !["completed", "archived"].includes(form.status);
  return (
    <AdminLayout title={form.titleEn || "Event"}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/events" className="button-secondary">
          ← Events
        </Link>
        {tabs.map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={tab === x ? "button-primary" : "button-secondary"}
          >
            {x}
          </button>
        ))}
      </div>
      {ended && (
        <div className="mb-5 border border-yellow-500/30 bg-yellow-100 p-4">
          <strong>This event has ended.</strong> Mark it as completed to add a
          recap, upload event photographs and request attendee reviews.{" "}
          <button
            className="button-secondary ml-2"
            onClick={() => void save(undefined, "completed")}
          >
            Mark as completed
          </button>
        </div>
      )}
      <form onSubmit={save} className="space-y-5 pb-24">
        {tab === "Overview" && (
          <Panel title="Event overview">
            <Stats
              form={form}
              attendees={attendees}
              invitations={invitations}
              reviews={reviews}
            />
            <div className="flex flex-wrap gap-2">
              <a
                className="button-secondary"
                target="_blank"
                href={`/events/${form.slug}`}
              >
                Open public page
              </a>
              <button
                type="button"
                className="button-secondary"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${location.origin}/events/${form.slug}`,
                  )
                }
              >
                Copy public URL
              </button>
              <Link
                className="button-secondary"
                href="/admin/marketing/event-banner"
              >
                Feature on homepage
              </Link>
            </div>
            {form.status === "completed" && (
              <ol className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  "Add recap",
                  "Upload event photos",
                  "Confirm attendance",
                  "Send review invitations",
                ].map((x, i) => (
                  <li className="rounded bg-[#f3efe6] p-3" key={x}>
                    Step {i + 1}
                    <strong className="block">{x}</strong>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        )}
        {tab === "Content" && <Content form={form} set={set} />}{" "}
        {tab === "Schedule & booking" && (
          <Schedule form={form} set={set} attendees={attendees} />
        )}{" "}
        {tab === "Location" && <Location form={form} set={set} />}{" "}
        {tab === "Images" && (
          <ImagesTab
            form={form}
            set={set}
            upload={upload}
            saveGallery={saveGallery}
          />
        )}{" "}
        {tab === "Attendees" && (
          <Attendees
            rows={attendees}
            invitations={invitations}
            status={attendeeStatus}
            invite={invite}
          />
        )}{" "}
        {tab === "Reviews" && <Reviews rows={reviews} moderate={moderate} />}{" "}
        {tab === "Publishing" && <Publishing form={form} set={set} />}
      </form>
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-end gap-3 border-t border-ink/10 bg-paper p-3 lg:left-64">
        <span className="mr-auto text-sm">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          className="button-secondary"
          onClick={() => void save(undefined, "draft")}
        >
          Save draft
        </button>
        <a
          className="button-secondary"
          target="_blank"
          href={`/events/${form.slug}`}
        >
          Preview
        </a>
        <button className="button-primary" onClick={() => void save()}>
          Save changes
        </button>
      </div>
      {message && (
        <div
          role="status"
          className="fixed bottom-20 right-5 z-50 max-w-sm rounded bg-ink px-5 py-3 text-paper"
        >
          {message}
        </div>
      )}
      {link && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
        >
          <div className="w-full max-w-xl bg-paper p-6">
            <h2 className="font-serif text-2xl">Private review link</h2>
            <p>
              {link.attendee.full_name} · expires{" "}
              {new Date(link.invitation.expires_at).toLocaleDateString()}
            </p>
            <input readOnly className="admin-input my-4" value={link.url} />
            <div className="flex flex-wrap gap-2">
              <button
                className="button-primary"
                onClick={() => {
                  navigator.clipboard.writeText(link.url);
                  setMessage(
                    `Private review link copied for ${link.attendee.full_name}.`,
                  );
                }}
              >
                Copy link
              </button>
              <button
                className="button-secondary"
                onClick={() => void invite(link.attendee, true)}
              >
                Send by email
              </button>
              <button
                className="button-secondary"
                onClick={() => setLink(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
const Panel = ({ title, children }: { title: string; children: any }) => (
  <section className="rounded border border-ink/10 bg-paper p-5 md:p-7">
    <h2 className="mb-4 font-serif text-2xl font-bold">{title}</h2>
    {children}
  </section>
);
const Input = ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  type?: string;
}) => (
  <label className="block font-semibold">
    {label}
    <input
      className="admin-input"
      type={type}
      value={value || ""}
      onChange={(e) =>
        onChange(type === "number" ? Number(e.target.value) : e.target.value)
      }
    />
  </label>
);
function Stats({ form, attendees, invitations, reviews }: any) {
  const approved = attendees.filter(
      (a: any) => a.registration_status === "approved",
    ).length,
    attended = attendees.filter(
      (a: any) => a.attendance_status === "attended",
    ).length;
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["Status", form.status],
        ["Date", new Date(form.eventStartAt).toLocaleString()],
        ["Capacity", form.totalCapacity],
        ["Registrations", attendees.length],
        ["Confirmed", approved],
        ["Attended", attended],
        ["Remaining", form.remainingSeats],
        ["Invitations / reviews", `${invitations.length} / ${reviews.length}`],
      ].map(([a, b]) => (
        <div className="rounded bg-[#f3efe6] p-3" key={a}>
          <small>{a}</small>
          <strong className="block text-lg">{b}</strong>
        </div>
      ))}
    </div>
  );
}
function Content({ form, set }: any) {
  return (
    <Panel title="Content">
      <Input
        label="Internal name"
        value={form.internalName}
        onChange={(v) => set("internalName", v)}
      />
      <Input label="Slug" value={form.slug} onChange={(v) => set("slug", v)} />
      {["En", "Tr"].map((l, i) => (
        <fieldset className="mt-5 space-y-4" key={l}>
          <legend className="font-serif text-xl">
            {i ? "Türkçe" : "English"}
          </legend>
          <Input
            label="Title"
            value={form[`title${l}`]}
            onChange={(v) => set(`title${l}`, v)}
          />
          <label>
            Short description
            <textarea
              className="admin-input min-h-24"
              value={form[`shortDescription${l}`] || ""}
              onChange={(e) => set(`shortDescription${l}`, e.target.value)}
            />
          </label>
          <label>
            Full description
            <textarea
              className="admin-input min-h-40"
              value={form[`fullDescription${l}`] || ""}
              onChange={(e) => set(`fullDescription${l}`, e.target.value)}
            />
          </label>
          {form.status === "completed" && (
            <label>
              Event recap
              <textarea
                className="admin-input min-h-32"
                value={form[`recapText${l}`] || ""}
                onChange={(e) => set(`recapText${l}`, e.target.value)}
              />
            </label>
          )}
        </fieldset>
      ))}
    </Panel>
  );
}
function Schedule({ form, set, attendees }: any) {
  const approved = attendees.filter(
    (a: any) => a.registration_status === "approved",
  ).length;
  return (
    <Panel title="Schedule & booking">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Event starts"
          type="datetime-local"
          value={(form.eventStartAt || "").slice(0, 16)}
          onChange={(v) => set("eventStartAt", v)}
        />
        <Input
          label="Event ends"
          type="datetime-local"
          value={(form.eventEndAt || "").slice(0, 16)}
          onChange={(v) => set("eventEndAt", v)}
        />
        <Input
          label="Booking opens"
          type="datetime-local"
          value={(form.bookingOpenAt || "").slice(0, 16)}
          onChange={(v) => set("bookingOpenAt", v)}
        />
        <Input
          label="Booking closes"
          type="datetime-local"
          value={(form.bookingCloseAt || "").slice(0, 16)}
          onChange={(v) => set("bookingCloseAt", v)}
        />
        <Input
          label="Timezone"
          value={form.timezone}
          onChange={(v) => set("timezone", v)}
        />
        <Input
          label="Capacity"
          type="number"
          value={form.totalCapacity}
          onChange={(v) => set("totalCapacity", v)}
        />
        <Input
          label="Price"
          type="number"
          value={form.participationPriceTry}
          onChange={(v) => set("participationPriceTry", v)}
        />
        <Input
          label="Currency"
          value={form.currency}
          onChange={(v) => set("currency", v)}
        />
      </div>
      <p className="mt-5 rounded bg-[#f3efe6] p-4">
        <strong>{approved}</strong> confirmed ·{" "}
        <strong>{form.remainingSeats}</strong> remaining. Remaining places are
        calculated and cannot be edited.
      </p>
    </Panel>
  );
}
function Location({ form, set }: any) {
  return (
    <Panel title="Location">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Country"
          value={form.country}
          onChange={(v) => set("country", v)}
        />
        <Input
          label="City"
          value={form.city}
          onChange={(v) => set("city", v)}
        />
        <Input
          label="Public location — English"
          value={form.locationTextEn}
          onChange={(v) => set("locationTextEn", v)}
        />
        <Input
          label="Public location — Turkish"
          value={form.locationTextTr}
          onChange={(v) => set("locationTextTr", v)}
        />
        <Input
          label="Private full address"
          value={form.privateLocation}
          onChange={(v) => set("privateLocation", v)}
        />
      </div>
      <p className="mt-3 text-sm">
        The protected private address is never included in the public event API.
      </p>
    </Panel>
  );
}
function ImagesTab({ form, set, upload, saveGallery }: any) {
  return (
    <div className="space-y-5">
      <Panel title="Event cover">
        <div className="grid gap-5 md:grid-cols-2">
          {form.imageUrl ? (
            <img
              className="max-h-80 w-full object-cover"
              src={form.imageUrl}
              alt="Current cover"
            />
          ) : (
            <div className="grid min-h-48 place-items-center bg-ink/5">
              No cover image
            </div>
          )}
          <div>
            <label className="button-primary inline-block cursor-pointer">
              Upload cover image
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => upload(e.target.files, false)}
              />
            </label>
            <Input
              label="Alt text"
              value={form.imageAltText}
              onChange={(v) => set("imageAltText", v)}
            />
            <Input
              label="Desktop object position"
              value={form.imageObjectPosition}
              onChange={(v) => set("imageObjectPosition", v)}
            />
            <button
              type="button"
              className="button-secondary mt-3"
              onClick={() => set("imageUrl", "")}
            >
              Remove image
            </button>
          </div>
        </div>
      </Panel>
      <Panel title="Photos from this event">
        <p>
          Upload photographs from the completed event. These photos will be
          displayed on the public finished-event page.
        </p>
        <label className="button-primary my-4 inline-block cursor-pointer">
          Add event photos
          <input
            hidden
            multiple
            type="file"
            accept="image/*"
            onChange={(e) => upload(e.target.files, true)}
          />
        </label>
        {!(form.gallery || []).length ? (
          <p className="rounded bg-[#f3efe6] p-5">
            No event photos have been uploaded yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {form.gallery.map((x: any, i: number) => (
              <div className="border p-3" key={x.id || x.imageUrl}>
                <img
                  className="h-40 w-full object-cover"
                  src={x.imageUrl || x.image_url}
                  alt=""
                />
                <Input
                  label="Alt text"
                  value={x.altText}
                  onChange={(v) =>
                    set(
                      "gallery",
                      form.gallery.map((a: any, j: number) =>
                        j === i ? { ...a, altText: v } : a,
                      ),
                    )
                  }
                />
                <Input
                  label="Caption"
                  value={x.caption}
                  onChange={(v) =>
                    set(
                      "gallery",
                      form.gallery.map((a: any, j: number) =>
                        j === i ? { ...a, caption: v } : a,
                      ),
                    )
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={!x.isPrivate}
                    onChange={(e) =>
                      set(
                        "gallery",
                        form.gallery.map((a: any, j: number) =>
                          j === i ? { ...a, isPrivate: !e.target.checked } : a,
                        ),
                      )
                    }
                  />{" "}
                  Public
                </label>
                <button
                  type="button"
                  className="button-secondary ml-2"
                  onClick={() =>
                    set(
                      "gallery",
                      form.gallery.filter((_: any, j: number) => j !== i),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          className="button-secondary mt-4"
          onClick={saveGallery}
        >
          Save gallery
        </button>
      </Panel>
    </div>
  );
}
function Attendees({ rows, invitations, status, invite }: any) {
  const [q, setQ] = useState("");
  return (
    <Panel title="Attendees">
      <input
        className="admin-input mb-4"
        placeholder="Search attendees"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "Name",
                "Email / phone",
                "Application",
                "Attendance",
                "Review invitation",
                "Actions",
              ].map((x) => (
                <th className="p-2" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((a: any) =>
                `${a.full_name} ${a.email}`
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              )
              .map((a: any) => {
                const inv = invitations.find(
                  (i: any) => i.attendee_id === a.id,
                );
                return (
                  <tr className="border-t" key={a.id}>
                    <td className="p-2">{a.full_name}</td>
                    <td className="p-2">
                      {a.email}
                      <br />
                      {a.phone}
                    </td>
                    <td className="p-2">{a.registration_status}</td>
                    <td className="p-2">{a.attendance_status}</td>
                    <td className="p-2">
                      {inv
                        ? inv.used_at
                          ? "Submitted"
                          : inv.revoked_at
                            ? "Revoked"
                            : Date.parse(inv.expires_at) < Date.now()
                              ? "Expired"
                              : "Active"
                        : "Not generated"}
                    </td>
                    <td className="space-x-1 p-2">
                      <button
                        className="button-secondary"
                        onClick={() =>
                          status(a, "approved", a.attendance_status)
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="button-secondary"
                        onClick={() => status(a, "approved", "attended")}
                      >
                        Attended
                      </button>
                      <button
                        className="button-secondary"
                        onClick={() =>
                          status(a, a.registration_status, "no_show")
                        }
                      >
                        No-show
                      </button>
                      <button
                        className="button-secondary"
                        onClick={() => invite(a, false)}
                      >
                        Review link
                      </button>
                      <button
                        className="button-secondary"
                        onClick={() => invite(a, true)}
                      >
                        Send
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function Reviews({ rows, moderate }: any) {
  return (
    <Panel title="Reviews">
      {!rows.length ? (
        <p>No reviews for this event yet.</p>
      ) : (
        rows.map((r: any) => (
          <article className="border-b py-4" key={r.id}>
            <div className="flex justify-between">
              <strong>
                {r.attendee_name} · {r.rating} ★
              </strong>
              <span>{r.status}</span>
            </div>
            <p>{r.comment}</p>
            <div className="mt-2 flex gap-2">
              {["approved", "rejected", "hidden"].map((x) => (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => moderate(r, x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
          </article>
        ))
      )}
    </Panel>
  );
}
function Publishing({ form, set }: any) {
  return (
    <Panel title="Publishing">
      <label className="block">
        <input
          type="checkbox"
          checked={Boolean(form.enabled)}
          onChange={(e) => set("enabled", e.target.checked)}
        />{" "}
        Publicly enabled
      </label>
      <label className="mt-4 block font-semibold">
        Status
        <select
          className="admin-input"
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {statuses.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label className="mt-4 block">
        <input
          type="checkbox"
          checked={Boolean(form.publicArchive)}
          onChange={(e) => set("publicArchive", e.target.checked)}
        />{" "}
        Show completed event in archive
      </label>
      <label className="mt-4 block">
        <input
          type="checkbox"
          checked={Boolean(form.photoConsentConfirmed)}
          onChange={(e) => set("photoConsentConfirmed", e.target.checked)}
        />{" "}
        I confirm permission to publish event photographs
      </label>
    </Panel>
  );
}
export function EventReviewsAdmin() {
  const { headers } = useAdmin();
  const [rows, setRows] = useState<any[]>([]),
    [status, setStatus] = useState("");
  const load = () =>
    fetch(`/api/events/admin/reviews/all${status ? `?status=${status}` : ""}`, {
      headers,
    })
      .then((r) => r.json())
      .then((x) => setRows(x.reviews || []));
  useEffect(() => {
    void load();
  }, [status]);
  async function moderate(r: any, s: string) {
    await fetch(`/api/events/admin/reviews/${r.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: s }),
    });
    void load();
  }
  return (
    <AdminLayout title="Event reviews">
      <div className="mb-5 flex gap-3">
        <Link className="button-secondary" href="/admin/events">
          ← Events
        </Link>
        <select
          className="admin-input max-w-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["pending", "approved", "rejected", "hidden"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <Reviews rows={rows} moderate={moderate} />
    </AdminLayout>
  );
}
