import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  loadShopSettings,
  saveShopSettingsAndWait,
  type ArtEra,
  type ShopSettings,
} from "@/lib/store";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const field = "mt-1 min-h-11 w-full border border-ink/20 bg-paper px-3";

export default function ArtErasAdmin() {
  const [settings, setSettings] = useState<ShopSettings>(loadShopSettings);
  const [selectedId, setSelectedId] = useState(settings.artEras[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const era = settings.artEras.find((item) => item.id === selectedId);
  const updateEra = (changes: Partial<ArtEra>) => {
    if (!era) return;
    setSettings({
      ...settings,
      artEras: settings.artEras.map((item) =>
        item.id === era.id ? { ...item, ...changes } : item,
      ),
    });
  };
  const save = async (next = settings) => {
    setSaving(true);
    setMessage("");
    try {
      const publishedSlugs = next.artEras
        .filter((item) => item.status === "published")
        .map((item) => item.slug.trim());
      if (
        next.artEras.some(
          (item) =>
            item.status === "published" &&
            (!item.title.trim() || !item.heroImage.trim()),
        )
      )
        throw new Error("Published eras need a name and hero image.");
      if (publishedSlugs.some((slug) => !slug))
        throw new Error("Published eras need a slug.");
      if (new Set(publishedSlugs).size !== publishedSlugs.length)
        throw new Error("Era slugs must be unique.");
      await saveShopSettingsAndWait(next);
      setMessage("Art eras saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };
  const createEra = () => {
    const id = crypto.randomUUID();
    const next: ArtEra = {
      id,
      title: "Untitled era",
      slug: `era-${settings.artEras.length + 1}`,
      eyebrow: "AN ERA IN MY ART JOURNEY",
      shortDescription: "",
      story: "",
      heroImage: "",
      storyImage: "",
      status: "draft",
      featuredOnHomepage: true,
      displayOrder: settings.artEras.length + 1,
      printIds: [],
    };
    setSettings({ ...settings, artEras: [...settings.artEras, next] });
    setSelectedId(id);
  };
  const upload = async (file: File, key: "heroImage" | "storyImage") => {
    if (!era) return;
    const body = new FormData();
    body.append("image", file);
    body.append("productId", `era-${era.id}-${key}`);
    const response = await fetch("/api/admin/product-media", {
      method: "POST",
      headers: {
        "x-admin-password":
          sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
      },
      body,
    });
    const data = await response.json();
    if (!response.ok || !data.imageUrl)
      throw new Error(data.error || "Upload failed.");
    const next = {
      ...settings,
      artEras: settings.artEras.map((item) =>
        item.id === era.id ? { ...item, [key]: data.imageUrl } : item,
      ),
    };
    setSettings(next);
    await save(next);
  };

  return (
    <AdminLayout
      title="Art Eras"
      actions={
        <button
          className="button-primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      {message && (
        <p role="status" className="mb-5 border border-ink/15 bg-paper p-3">
          {message}
        </p>
      )}
      <section className="admin-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-coral">
              Art journey
            </p>
            <h2 className="font-serif text-3xl">Eras</h2>
          </div>
          <button className="button-link" onClick={createEra}>
            Create era
          </button>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <nav aria-label="Art eras">
            {settings.artEras.map((item) => (
              <button
                key={item.id}
                className={`mb-2 w-full border p-3 text-left ${item.id === era?.id ? "border-coral" : "border-ink/10"}`}
                onClick={() => setSelectedId(item.id)}
              >
                <strong>{item.title}</strong>
                <small className="block">
                  {item.status} · {item.printIds.length} prints
                </small>
              </button>
            ))}
          </nav>
          {era ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Text
                label="Era name"
                value={era.title}
                onChange={(title) => updateEra({ title })}
              />
              <Text
                label="URL slug"
                value={era.slug}
                onChange={(slug) => updateEra({ slug })}
              />
              <Text
                label="Eyebrow"
                value={era.eyebrow}
                onChange={(eyebrow) => updateEra({ eyebrow })}
              />
              <label>
                Status
                <select
                  className={field}
                  value={era.status}
                  onChange={(event) =>
                    updateEra({
                      status: event.target.value as ArtEra["status"],
                    })
                  }
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <Text
                label="Short homepage introduction"
                value={era.shortDescription}
                area
                onChange={(shortDescription) => updateEra({ shortDescription })}
              />
              <Text
                label="Full era story"
                value={era.story}
                area
                onChange={(story) => updateEra({ story })}
              />
              <ImageField
                label="Hero image"
                value={era.heroImage}
                onUpload={(file) => upload(file, "heroImage")}
              />
              <ImageField
                label="Story image (optional)"
                value={era.storyImage || ""}
                onUpload={(file) => upload(file, "storyImage")}
              />
              <label>
                Homepage order
                <input
                  className={field}
                  type="number"
                  min="1"
                  value={era.displayOrder}
                  onChange={(event) =>
                    updateEra({ displayOrder: Number(event.target.value) })
                  }
                />
              </label>
              <label className="flex items-center gap-2 self-end pb-3">
                <input
                  type="checkbox"
                  checked={era.featuredOnHomepage}
                  onChange={(event) =>
                    updateEra({ featuredOnHomepage: event.target.checked })
                  }
                />
                Show this era on homepage
              </label>
              <fieldset className="border border-ink/10 p-4 md:col-span-2">
                <legend className="font-semibold">Prints in this era</legend>
                <p className="mb-3 text-sm text-ink/55">
                  Links existing print products without duplicating them.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {settings.printProducts.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-3 border border-ink/10 p-2"
                    >
                      <input
                        type="checkbox"
                        checked={era.printIds.includes(product.id)}
                        onChange={(event) =>
                          updateEra({
                            printIds: event.target.checked
                              ? [...era.printIds, product.id]
                              : era.printIds.filter((id) => id !== product.id),
                          })
                        }
                      />
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-12 w-12 object-contain"
                      />
                      <span className="min-w-0">
                        <strong className="block truncate">
                          {product.name}
                        </strong>
                        <small>{product.status}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end md:col-span-2">
                <button
                  className="text-sm font-semibold text-red-700 underline underline-offset-4"
                  onClick={() => {
                    if (!window.confirm(`Delete ${era.title}?`)) return;
                    const artEras = settings.artEras.filter(
                      (item) => item.id !== era.id,
                    );
                    setSettings({ ...settings, artEras });
                    setSelectedId(artEras[0]?.id || "");
                  }}
                >
                  Delete era
                </button>
              </div>
            </div>
          ) : (
            <p>Create your first era to begin.</p>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}

function Text({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
}) {
  return (
    <label>
      {label}
      {area ? (
        <textarea
          className={field}
          rows={5}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={field}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function ImageField({
  label,
  value,
  onUpload,
}: {
  label: string;
  value: string;
  onUpload: (file: File) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <p className="font-medium">{label}</p>
      {value && (
        <img src={value} alt="" className="mt-2 h-40 w-full object-contain" />
      )}
      <label className="button-primary mt-2 inline-flex cursor-pointer">
        {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              await onUpload(file);
            } catch (error) {
              window.alert(
                error instanceof Error ? error.message : "Upload failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
    </div>
  );
}
