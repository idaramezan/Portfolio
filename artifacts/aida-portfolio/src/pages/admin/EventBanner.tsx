import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const textFields = [
  ["internalName", "Internal name"],
  ["imageAltText", "Image alt text"],
  ["imageObjectPosition", "Image object position"],
  ["locationTextEn", "Location — English"],
  ["locationTextTr", "Location — Turkish"],
  ["eyebrowEn", "Eyebrow — English"],
  ["eyebrowTr", "Eyebrow — Turkish"],
  ["titleEn", "Title — English"],
  ["titleTr", "Title — Turkish"],
  ["bannerShortTitleEn", "Banner short title — English (optional)"],
  ["bannerShortTitleTr", "Banner short title — Turkish (optional)"],
] as const;

function inZone(value: string | null, timezone: string) {
  if (!value) return "";
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export default function EventBanner() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const [form, setForm] = useState<any>(null);
  const [media, setMedia] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (key: string, value: unknown) =>
    setForm((current: any) => ({ ...current, [key]: value }));
  const load = async () => {
    try {
      const [bannerResponse, mediaResponse] = await Promise.all([
        fetch("/api/newsletter/event-banner/admin", {
          headers: { "x-admin-password": password },
          cache: "no-store",
        }),
        fetch("/api/admin/product-media", {
          headers: { "x-admin-password": password },
          cache: "no-store",
        }),
      ]);
      const result = await bannerResponse.json();
      if (!bannerResponse.ok) throw new Error(result.error);
      const c = result.config;
      const timezone = c.timezone || "Europe/Istanbul";
      setRemaining(result.remainingSeats);
      setForm({
        enabled: c.enabled,
        status: c.status,
        internalName: c.internal_name,
        displayStartAt: inZone(c.display_start_at, timezone),
        displayEndAt: inZone(c.display_end_at, timezone),
        timezone,
        eventStartAt: inZone(c.event_start_at, timezone),
        eventEndAt: inZone(c.event_end_at, timezone),
        totalCapacity: c.total_capacity,
        participationPriceTry: c.participation_price_try,
        audience: c.audience,
        imageMediaId: c.image_media_id,
        imageUrl: c.image_url || "",
        imageAltText: c.image_alt_text,
        imageObjectPosition: c.image_object_position,
        locationTextEn: c.location_text_en,
        locationTextTr: c.location_text_tr,
        eyebrowEn: c.eyebrow_en,
        eyebrowTr: c.eyebrow_tr,
        titleEn: c.title_en,
        titleTr: c.title_tr,
        bannerShortTitleEn: c.banner_short_title_en || "",
        bannerShortTitleTr: c.banner_short_title_tr || "",
        descriptionEn: c.description_en,
        descriptionTr: c.description_tr,
        secondaryDetailsEn: c.secondary_details_en || "",
        secondaryDetailsTr: c.secondary_details_tr || "",
        showOnHomepage: c.show_on_homepage,
        showOnTurkiyeShop: c.show_on_turkiye_shop,
        showOnInternationalShop: c.show_on_international_shop,
      });
      if (mediaResponse.ok) setMedia((await mediaResponse.json()).images || []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Event Banner could not be loaded",
      );
    }
  };
  useEffect(() => {
    void load();
  }, []);
  if (!form)
    return (
      <AdminLayout title="Event Banner">
        <p>{error || "Loading…"}</p>
      </AdminLayout>
    );
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter/event-banner/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRemaining(result.remainingSeats);
      setMessage("Event Banner saved.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Event Banner could not be saved",
      );
    } finally {
      setSaving(false);
    }
  };
  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("productId", "media-library");
      const response = await fetch("/api/admin/product-media", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const result = await response.json();
      if (!response.ok || typeof result.imageUrl !== "string")
        throw new Error(result.error || "Image upload failed");
      const imageUrl = result.imageUrl;
      set("imageUrl", imageUrl);
      set(
        "imageMediaId",
        imageUrl.match(/product-images\/([^.]+)/)?.[1] || null,
      );
      setMedia((current) =>
        current.includes(imageUrl) ? current : [imageUrl, ...current],
      );
      setMessage(
        "Image uploaded and selected. Save the Event Banner to publish it.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Image upload failed",
      );
    } finally {
      setUploading(false);
    }
  };
  return (
    <AdminLayout title="Event Banner">
      <form onSubmit={save} className="max-w-5xl space-y-6">
        <section className="border border-ink/10 bg-paper p-5 md:p-7">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="font-semibold">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
              />{" "}
              Enabled
            </label>
            <label className="text-sm font-semibold">
              Status
              <select
                className="admin-input"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {[
                  "draft",
                  "scheduled",
                  "active",
                  "paused",
                  "expired",
                  "completed",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-sm font-semibold">Available places</p>
              <p className="mt-2 font-serif text-3xl">{remaining}</p>
              <p className="text-xs text-ink/55">
                Calculated from confirmed/attended registrations
              </p>
            </div>
          </div>
        </section>
        <section className="grid gap-4 border border-ink/10 bg-paper p-5 md:grid-cols-2 md:p-7">
          {textFields.map(([key, label]) => (
            <label key={key} className="text-sm font-semibold">
              {label}
              <input
                className="admin-input"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </label>
          ))}
          {[
            ["descriptionEn", "Description — English"],
            ["descriptionTr", "Description — Turkish"],
            ["secondaryDetailsEn", "Secondary details — English"],
            ["secondaryDetailsTr", "Secondary details — Turkish"],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-semibold">
              {label}
              <textarea
                className="admin-input min-h-28 py-3"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </label>
          ))}
        </section>
        <section className="grid gap-4 border border-ink/10 bg-paper p-5 md:grid-cols-2 md:p-7">
          {[
            ["displayStartAt", "Banner starts"],
            ["displayEndAt", "Banner expires"],
            ["eventStartAt", "Event starts"],
            ["eventEndAt", "Event ends"],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-semibold">
              {label}
              <input
                type="datetime-local"
                className="admin-input"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </label>
          ))}
          <label className="text-sm font-semibold">
            Timezone
            <input
              className="admin-input"
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Capacity
            <input
              type="number"
              min="1"
              className="admin-input"
              value={form.totalCapacity}
              onChange={(e) => set("totalCapacity", Number(e.target.value))}
            />
          </label>
          <label className="text-sm font-semibold">
            Price (TL)
            <input
              type="number"
              min="0"
              className="admin-input"
              value={form.participationPriceTry}
              onChange={(e) =>
                set("participationPriceTry", Number(e.target.value))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            Audience
            <select
              className="admin-input"
              value={form.audience}
              onChange={(e) => set("audience", e.target.value)}
            >
              <option value="girls_only">Girls only</option>
              <option value="boys_only">Boys only</option>
              <option value="everyone">Everyone</option>
            </select>
          </label>
        </section>
        <section className="border border-ink/10 bg-paper p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl">Banner image</h2>
              <p className="mt-1 text-sm text-ink/55">
                Upload a JPG, PNG or WebP image up to 10 MB, or choose an
                existing media-library image.
              </p>
            </div>
            <label className="button-primary cursor-pointer">
              {uploading ? "Uploading…" : "Upload image"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                className="sr-only"
                onChange={(event) => {
                  void uploadImage(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {form.imageUrl && (
            <figure className="mt-4 max-w-md border border-ink/10 bg-[#f3efe6] p-2">
              <img
                src={form.imageUrl}
                alt={form.imageAltText || "Current Event Banner image"}
                className="aspect-[5/4] w-full object-cover"
                style={{ objectPosition: form.imageObjectPosition }}
              />
              <figcaption className="mt-2 text-xs text-ink/55">
                Current banner image
              </figcaption>
            </figure>
          )}
          <label className="mt-4 block text-sm font-semibold">
            Permanent image URL
            <input
              className="admin-input"
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
            />
          </label>
          <div className="mt-4 grid max-h-80 grid-cols-3 gap-3 overflow-y-auto md:grid-cols-6">
            {media.map((url) => (
              <button
                type="button"
                key={url}
                onClick={() => {
                  set("imageUrl", url);
                  set(
                    "imageMediaId",
                    url.match(/product-images\/([^.]+)/)?.[1] || null,
                  );
                }}
                className={`border p-1 ${form.imageUrl === url ? "border-coral" : "border-ink/10"}`}
              >
                <img
                  src={url}
                  alt="Media library option"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        </section>
        <section className="border border-ink/10 bg-paper p-5 md:p-7">
          <p className="text-sm font-semibold">Show on</p>
          {[
            ["showOnHomepage", "Homepage"],
            ["showOnTurkiyeShop", "Türkiye shop"],
            ["showOnInternationalShop", "International shop"],
          ].map(([key, label]) => (
            <label key={key} className="mr-6 mt-3 inline-flex gap-2">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </section>
        {error && (
          <p role="alert" className="font-semibold text-coral">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="font-semibold text-green-800">
            {message}
          </p>
        )}
        <button className="button-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Event Banner"}
        </button>
      </form>
    </AdminLayout>
  );
}
