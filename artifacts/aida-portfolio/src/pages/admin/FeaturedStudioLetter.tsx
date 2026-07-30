import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

type Image = { id: string; url: string; alt: string; caption: string };
type Template = {
  id: string;
  name: string;
  subject: string;
  eligible: boolean;
  reason?: string;
  images?: Image[];
  wordCount?: number;
};

function dateTimeInZone(value: string | null, timezone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date(value))
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export default function FeaturedStudioLetter() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<any>({
    enabled: false,
    templateId: "",
    previewImageIds: [],
    previewWordCount: 55,
    showOnHomepage: true,
    showOnTurkiyeShop: true,
    showOnInternationalShop: false,
    timezone: "Europe/Istanbul",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch("/api/newsletter/featured-letter/admin", {
      headers: { "x-admin-password": password },
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then(({ config, templates }) => {
        setTemplates(templates);
        setForm({
          enabled: config.enabled,
          templateId: config.template_id || "",
          publicEyebrow: config.public_eyebrow || "",
          publicTitleOverride: config.public_title_override || "",
          publicMetadataOverride: config.public_metadata_override || "",
          previewImageIds: config.preview_image_ids || [],
          previewWordCount: config.preview_word_count,
          showOnHomepage: config.show_on_homepage,
          showOnTurkiyeShop: config.show_on_turkiye_shop,
          showOnInternationalShop: config.show_on_international_shop,
          startAt: dateTimeInZone(
            config.start_at,
            config.timezone || "Europe/Istanbul",
          ),
          endAt: dateTimeInZone(
            config.end_at,
            config.timezone || "Europe/Istanbul",
          ),
          timezone: config.timezone || "Europe/Istanbul",
        });
      })
      .catch((err) => setError(err.message));
  useEffect(() => {
    void load();
  }, []);
  const selected = templates.find(
    (template) => template.id === form.templateId,
  );
  const set = (key: string, value: unknown) =>
    setForm((current: any) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (form.enabled && !selected?.eligible)
        throw new Error(
          "Choose an eligible saved letter before enabling the preview.",
        );
      const response = await fetch("/api/newsletter/featured-letter/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(
        "Featured Newsletter saved. A locked revision is now used by the storefront and delivery email.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Featured Newsletter">
      <form onSubmit={submit} className="max-w-4xl space-y-6">
        <section className="border border-ink/10 bg-paper p-5 md:p-7">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set("enabled", e.target.checked)}
            />{" "}
            Enable featured preview
          </label>
          <label className="mt-5 block text-sm font-semibold">
            Saved Newsletter
            <select
              className="mt-2 h-12 w-full border border-ink/20 bg-white px-3"
              value={form.templateId}
              onChange={(e) => {
                set("templateId", e.target.value);
                set("previewImageIds", []);
              }}
            >
              <option value="">Choose a saved letter…</option>
              {templates.map((template) => (
                <option
                  key={template.id}
                  value={template.id}
                  disabled={!template.eligible}
                >
                  {template.name} — {template.subject}
                  {template.eligible
                    ? ` (${template.wordCount} words)`
                    : ` — unavailable: ${template.reason}`}
                </option>
              ))}
            </select>
          </label>
          {selected && !selected.eligible && (
            <p className="mt-2 text-sm text-coral">{selected.reason}</p>
          )}
          {selected?.eligible && (
            <p className="mt-2 text-sm text-ink/60">
              Drafts are allowed only because this saved revision passed the
              real email renderer. Saving below explicitly confirms it for
              public use.
            </p>
          )}
        </section>

        {selected?.eligible && (
          <section className="border border-ink/10 bg-paper p-5 md:p-7">
            <h2 className="font-serif text-2xl">Preview images</h2>
            <p className="mt-1 text-sm text-ink/60">
              Choose one or two exact images from this letter.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {selected.images?.map((image) => {
                const checked = form.previewImageIds.includes(image.id);
                return (
                  <label
                    key={image.id}
                    className={`border p-2 ${checked ? "border-coral" : "border-ink/15"}`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="aspect-square w-full object-cover"
                    />
                    <span className="mt-2 flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          set(
                            "previewImageIds",
                            checked
                              ? form.previewImageIds.filter(
                                  (id: string) => id !== image.id,
                                )
                              : [...form.previewImageIds, image.id].slice(-2),
                          )
                        }
                      />{" "}
                      Use image
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        <section className="grid gap-4 border border-ink/10 bg-paper p-5 md:grid-cols-2 md:p-7">
          {[
            ["publicEyebrow", "Eyebrow"],
            ["publicTitleOverride", "Public title override"],
            ["publicMetadataOverride", "Metadata override"],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-semibold">
              {label}
              <input
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="mt-2 h-11 w-full border border-ink/20 px-3"
                placeholder="Use letter default"
              />
            </label>
          ))}
          <label className="text-sm font-semibold">
            Visible excerpt words
            <input
              type="number"
              min="20"
              max="180"
              value={form.previewWordCount}
              onChange={(e) => set("previewWordCount", Number(e.target.value))}
              className="mt-2 h-11 w-full border border-ink/20 px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Starts at
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => set("startAt", e.target.value)}
              className="mt-2 h-11 w-full border border-ink/20 px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Ends at
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => set("endAt", e.target.value)}
              className="mt-2 h-11 w-full border border-ink/20 px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Timezone
            <input
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
              className="mt-2 h-11 w-full border border-ink/20 px-3"
            />
          </label>
          <div className="space-y-2 text-sm font-semibold">
            Show on
            {[
              ["showOnHomepage", "Homepage"],
              ["showOnTurkiyeShop", "Türkiye shop"],
              ["showOnInternationalShop", "International shop"],
            ].map(([key, label]) => (
              <label key={key} className="flex gap-2">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                />{" "}
                {label}
              </label>
            ))}
          </div>
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
        <button disabled={saving} className="button-primary">
          {saving ? "Saving…" : "Save featured letter"}
        </button>
      </form>
    </AdminLayout>
  );
}
