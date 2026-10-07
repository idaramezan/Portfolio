import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  loadShopSettings,
  saveShopSettingsAndWait,
  type ArtCollection,
  type MovingImageProject,
  type ShopSettings,
} from "@/lib/store";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const field = "mt-1 min-h-11 w-full border border-ink/20 bg-paper px-3";

export default function PortfolioContent({
  section,
}: {
  section: "collections" | "moving-image";
}) {
  const [settings, setSettings] = useState<ShopSettings>(() =>
    loadShopSettings(),
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selected, setSelected] = useState("");
  const save = async () => {
    setSaving(true);
    try {
      await saveShopSettingsAndWait(settings);
      setSaveMessage("Changes saved.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Changes could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (section === "collections") {
    const items = [...settings.artCollections].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    const active = items.find((x) => x.id === selected) || items[0];
    const patch = (changes: Partial<ArtCollection>) =>
      setSettings({
        ...settings,
        artCollections: settings.artCollections.map((x) =>
          x.id === active.id ? { ...x, ...changes } : x,
        ),
      });
    const persistCollectionImage = async (changes: Partial<ArtCollection>) => {
      const nextSettings = {
        ...settings,
        artCollections: settings.artCollections.map((item) =>
          item.id === active.id ? { ...item, ...changes } : item,
        ),
      };
      setSettings(nextSettings);
      setSaving(true);
      setSaveMessage("");
      try {
        await saveShopSettingsAndWait(nextSettings);
        setSaveMessage("Collection image uploaded and saved.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Collection image could not be saved.";
        setSaveMessage(message);
        throw error;
      } finally {
        setSaving(false);
      }
    };
    const reorder = (dragId: string, targetId: string) => {
      const ordered = [...items];
      const from = ordered.findIndex((x) => x.id === dragId),
        to = ordered.findIndex((x) => x.id === targetId);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = ordered.splice(from, 1);
      ordered.splice(to, 0, moved);
      setSettings({
        ...settings,
        artCollections: ordered.map((x, i) => ({ ...x, displayOrder: i + 1 })),
      });
    };
    const reorderArtwork = (dragId: string, targetId: string) => {
      const ordered = [...active.artworkIds];
      const from = ordered.indexOf(dragId);
      const to = ordered.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = ordered.splice(from, 1);
      ordered.splice(to, 0, moved);
      patch({ artworkIds: ordered });
    };
    return (
      <AdminLayout
        title="Collections"
        actions={
          <button className="button-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      >
        {saveMessage && (
          <p
            className="mb-5 border border-ink/15 bg-paper px-4 py-3 text-sm"
            role="status"
          >
            {saveMessage}
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <section className="admin-card">
            <p className="text-xs font-bold uppercase tracking-wider text-coral">
              Display order
            </p>
            {items.map((item) => (
              <button
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", item.id)
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) =>
                  reorder(e.dataTransfer.getData("text/plain"), item.id)
                }
                onClick={() => setSelected(item.id)}
                className={`mt-2 w-full border p-3 text-left ${active?.id === item.id ? "border-coral bg-coral/5" : "border-ink/10"}`}
                key={item.id}
              >
                <strong>
                  {item.displayOrder}. {item.title}
                </strong>
                <small className="block text-ink/55">
                  {item.status} · drag to reorder
                </small>
              </button>
            ))}
          </section>
          {active && (
            <section className="admin-card grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  Title
                  <input
                    className={field}
                    value={active.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </label>
                <label>
                  Slug
                  <input
                    className={field}
                    value={active.slug}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
                </label>
                <label>
                  Small label
                  <input
                    className={field}
                    value={active.eyebrow}
                    onChange={(e) => patch({ eyebrow: e.target.value })}
                  />
                </label>
                <label>
                  CTA label
                  <input
                    className={field}
                    value={active.ctaLabel || ""}
                    onChange={(e) => patch({ ctaLabel: e.target.value })}
                  />
                </label>
                <label>
                  Status
                  <select
                    className={field}
                    value={active.status}
                    onChange={(e) =>
                      patch({
                        status: e.target.value as ArtCollection["status"],
                      })
                    }
                  >
                    <option>current</option>
                    <option>active</option>
                    <option>archived</option>
                    <option>draft</option>
                  </select>
                </label>
                <label className="md:col-span-2">
                  Short description
                  <textarea
                    className={field}
                    rows={2}
                    value={active.shortDescription}
                    onChange={(e) =>
                      patch({ shortDescription: e.target.value })
                    }
                  />
                </label>
                <label className="md:col-span-2">
                  Long story
                  <textarea
                    className={field}
                    rows={7}
                    value={active.story}
                    onChange={(e) => patch({ story: e.target.value })}
                  />
                </label>
                <CollectionImageField
                  label="Hero image"
                  collectionId={active.id}
                  value={active.heroImage}
                  onUploaded={(heroImage) =>
                    persistCollectionImage({ heroImage })
                  }
                />
                <CollectionImageField
                  label="Mobile hero image"
                  collectionId={active.id}
                  value={active.mobileHeroImage || ""}
                  onUploaded={(mobileHeroImage) =>
                    persistCollectionImage({ mobileHeroImage })
                  }
                />
                <label>
                  Launch date
                  <input
                    className={field}
                    type="date"
                    value={active.launchDate || ""}
                    onChange={(e) => patch({ launchDate: e.target.value })}
                  />
                </label>
                <label>
                  End date
                  <input
                    className={field}
                    type="date"
                    value={active.endDate || ""}
                    onChange={(e) => patch({ endDate: e.target.value })}
                  />
                </label>
                <label>
                  SEO title
                  <input
                    className={field}
                    value={active.seoTitle || ""}
                    onChange={(e) => patch({ seoTitle: e.target.value })}
                  />
                </label>
                <label>
                  SEO description
                  <input
                    className={field}
                    value={active.seoDescription || ""}
                    onChange={(e) => patch({ seoDescription: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex gap-6">
                <label>
                  <input
                    type="checkbox"
                    checked={active.featuredOnHomepage}
                    onChange={(e) =>
                      patch({ featuredOnHomepage: e.target.checked })
                    }
                  />{" "}
                  Featured on homepage
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={active.visibleOnPaintingsPage}
                    onChange={(e) =>
                      patch({ visibleOnPaintingsPage: e.target.checked })
                    }
                  />{" "}
                  Visible on Paintings page
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={active.countdownEnabled}
                    disabled={!active.endDate}
                    onChange={(e) =>
                      patch({ countdownEnabled: e.target.checked })
                    }
                  />{" "}
                  Countdown
                </label>
              </div>
              <fieldset>
                <legend className="font-semibold">Artwork order</legend>
                <p className="text-sm text-ink/55">
                  Select artworks, then drag selected rows to set their order.
                </p>
                {[...settings.originalProducts]
                  .sort((a, b) => {
                    const ai = active.artworkIds.indexOf(a.id);
                    const bi = active.artworkIds.indexOf(b.id);
                    return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
                  })
                  .map((product) => (
                    <label
                      className={`mt-2 flex gap-2 border p-2 ${active.artworkIds.includes(product.id) ? "cursor-grab border-ink/20 bg-ink/5" : "border-transparent"}`}
                      key={product.id}
                      draggable={active.artworkIds.includes(product.id)}
                      onDragStart={(event) =>
                        event.dataTransfer.setData("text/plain", product.id)
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) =>
                        reorderArtwork(
                          event.dataTransfer.getData("text/plain"),
                          product.id,
                        )
                      }
                    >
                      <input
                        type="checkbox"
                        checked={active.artworkIds.includes(product.id)}
                        onChange={(e) =>
                          patch({
                            artworkIds: e.target.checked
                              ? [...active.artworkIds, product.id]
                              : active.artworkIds.filter(
                                  (id) => id !== product.id,
                                ),
                          })
                        }
                      />
                      {product.name}
                    </label>
                  ))}
              </fieldset>
            </section>
          )}
        </div>
      </AdminLayout>
    );
  }
  const items = [...settings.movingImageProjects].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const active = items.find((x) => x.id === selected) || items[0];
  const patch = (changes: Partial<MovingImageProject>) =>
    active &&
    setSettings({
      ...settings,
      movingImageProjects: settings.movingImageProjects.map((x) =>
        x.id === active.id ? { ...x, ...changes } : x,
      ),
    });
  const persistProjectMedia = async (changes: Partial<MovingImageProject>) => {
    if (!active) return;
    const nextSettings = {
      ...settings,
      movingImageProjects: settings.movingImageProjects.map((item) =>
        item.id === active.id ? { ...item, ...changes } : item,
      ),
    };
    setSettings(nextSettings);
    setSaving(true);
    setSaveMessage("");
    try {
      await saveShopSettingsAndWait(nextSettings);
      setSaveMessage("Animation media uploaded and saved.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Animation media could not be saved.";
      setSaveMessage(message);
      throw error;
    } finally {
      setSaving(false);
    }
  };
  const persistAnimationGallery = async (animationGalleryMedia: string[]) => {
    const nextSettings = { ...settings, animationGalleryMedia };
    setSettings(nextSettings);
    setSaving(true);
    setSaveMessage("");
    try {
      await saveShopSettingsAndWait(nextSettings);
      setSaveMessage("Animation gallery uploaded and saved.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Animation gallery could not be saved.";
      setSaveMessage(message);
      throw error;
    } finally {
      setSaving(false);
    }
  };
  const create = () => {
    const id = crypto.randomUUID();
    const next: MovingImageProject = {
      id,
      title: "Untitled project",
      slug: `project-${items.length + 1}`,
      year: new Date().getFullYear(),
      role: "Direction and animation",
      projectType: "Animation",
      shortDescription: "",
      story: "",
      thumbnail: "",
      videoUrl: "",
      stillImages: [],
      featured: items.length === 0,
      displayOrder: items.length + 1,
      status: "draft",
    };
    setSettings({
      ...settings,
      movingImageProjects: [...settings.movingImageProjects, next],
    });
    setSelected(id);
  };
  return (
    <AdminLayout
      title="Animation"
      actions={
        <>
          <button className="button-link" onClick={create}>
            Create project
          </button>
          <button className="button-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      {saveMessage && (
        <p
          className="mb-5 border border-ink/15 bg-paper px-4 py-3 text-sm"
          role="status"
        >
          {saveMessage}
        </p>
      )}
      <section className="admin-card mb-6">
        <h2 className="font-display text-2xl">General work samples</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/60">
          Upload standalone images and animated GIFs for the Animation gallery.
          These samples are independent from YouTube projects.
        </p>
        <ProjectGalleryField
          projectId="general"
          label="Images and GIFs"
          images={settings.animationGalleryMedia}
          onChange={persistAnimationGallery}
        />
      </section>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="admin-card">
          {items.map((item) => (
            <button
              className={`mt-2 w-full border p-3 text-left ${active?.id === item.id ? "border-coral" : "border-ink/10"}`}
              onClick={() => setSelected(item.id)}
              key={item.id}
            >
              <strong>{item.title}</strong>
              <small className="block">
                {item.status} · {item.year}
              </small>
            </button>
          ))}
        </section>
        {active ? (
          <section className="admin-card grid gap-4 md:grid-cols-2">
            <label>
              Title
              <input
                className={field}
                value={active.title}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </label>
            <label>
              Slug
              <input
                className={field}
                value={active.slug}
                onChange={(e) => patch({ slug: e.target.value })}
              />
            </label>
            <label>
              Artist name
              <input
                className={field}
                value={active.artistName || active.client || ""}
                onChange={(e) => patch({ artistName: e.target.value })}
              />
            </label>
            <label>
              Year
              <input
                className={field}
                type="number"
                value={active.year}
                onChange={(e) => patch({ year: Number(e.target.value) })}
              />
            </label>
            <label>
              Role
              <input
                className={field}
                value={active.role}
                onChange={(e) => patch({ role: e.target.value })}
              />
            </label>
            <label>
              Project type
              <select
                className={field}
                value={active.projectType}
                onChange={(e) =>
                  patch({
                    projectType: e.target
                      .value as MovingImageProject["projectType"],
                  })
                }
              >
                <option>Music Video</option>
                <option>Animation</option>
                <option>Visual</option>
                <option>Personal Project</option>
              </select>
            </label>
            <label>
              Status
              <select
                className={field}
                value={active.status}
                onChange={(e) =>
                  patch({ status: e.target.value as "published" | "draft" })
                }
              >
                <option>draft</option>
                <option>published</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={active.featured}
                onChange={(e) => patch({ featured: e.target.checked })}
              />{" "}
              Featured
            </label>
            <label className="md:col-span-2">
              Short description
              <textarea
                className={field}
                rows={2}
                value={active.shortDescription}
                onChange={(e) => patch({ shortDescription: e.target.value })}
              />
            </label>
            <label className="md:col-span-2">
              Project story
              <textarea
                className={field}
                rows={6}
                value={active.story}
                onChange={(e) => patch({ story: e.target.value })}
              />
            </label>
            <CollectionImageField
              label="Project cover"
              collectionId={`animation-${active.id}-cover`}
              value={active.thumbnail}
              onUploaded={(thumbnail) => persistProjectMedia({ thumbnail })}
            />
            <label>
              YouTube URL
              <input
                className={field}
                value={active.videoUrl}
                onChange={(e) => patch({ videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </label>
            <label>
              External release URL
              <input
                className={field}
                value={active.externalUrl || ""}
                onChange={(e) => patch({ externalUrl: e.target.value })}
              />
            </label>
            <ProjectGalleryField
              projectId={active.id}
              label="Project images"
              images={active.stillImages}
              onChange={(stillImages) => persistProjectMedia({ stillImages })}
            />
            <label className="md:col-span-2">
              Credits
              <textarea
                className={field}
                rows={3}
                value={active.credits || ""}
                onChange={(e) => patch({ credits: e.target.value })}
              />
            </label>
            <label>
              SEO title
              <input
                className={field}
                value={active.seoTitle || ""}
                onChange={(e) => patch({ seoTitle: e.target.value })}
              />
            </label>
            <label>
              SEO description
              <input
                className={field}
                value={active.seoDescription || ""}
                onChange={(e) => patch({ seoDescription: e.target.value })}
              />
            </label>
          </section>
        ) : (
          <section className="admin-card">
            <p>No projects yet.</p>
            <button className="button-primary mt-4" onClick={create}>
              Create project
            </button>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}

function CollectionImageField({
  label,
  collectionId,
  value,
  onUploaded,
}: {
  label: string;
  collectionId: string;
  value: string;
  onUploaded: (value: string) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  return (
    <div>
      <p className="font-medium">{label}</p>
      {value && (
        <img
          src={value}
          alt=""
          className="mt-2 h-36 w-full border border-ink/10 object-contain"
        />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="button-primary cursor-pointer">
          {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const body = new FormData();
                body.append("image", file);
                body.append("productId", `collection-${collectionId}`);
                const response = await fetch("/api/admin/product-media", {
                  method: "POST",
                  headers: {
                    "x-admin-password":
                      sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
                  },
                  body,
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok || !payload.imageUrl)
                  throw new Error(payload.error || "Image upload failed.");
                await onUploaded(payload.imageUrl);
                event.target.value = "";
              } catch (error) {
                window.alert(
                  error instanceof Error
                    ? error.message
                    : "Image upload failed.",
                );
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        {value && (
          <button
            className="button-link"
            type="button"
            disabled={uploading}
            onClick={() => onUploaded("")}
          >
            Remove image
          </button>
        )}
      </div>
      <small className="mt-1 block text-ink/55">
        {uploading ? "Uploading and saving…" : "JPG, PNG or WebP."}
      </small>
    </div>
  );
}

function ProjectGalleryField({
  projectId,
  label,
  images,
  onChange,
}: {
  projectId: string;
  label: string;
  images: string[];
  onChange: (images: string[]) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="md:col-span-2">
      <p className="mt-4 font-medium">{label}</p>
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((src, index) => (
            <div className="border border-ink/10 p-2" key={`${src}-${index}`}>
              <img src={src} alt="" className="h-36 w-full object-cover" />
              <button
                className="button-link mt-2 text-sm"
                type="button"
                disabled={uploading}
                onClick={() =>
                  onChange(images.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="button-primary mt-3 inline-flex cursor-pointer">
        {uploading ? "Uploading…" : "Upload gallery images"}
        <input
          className="sr-only"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={async (event) => {
            const files = Array.from(event.target.files || []);
            if (!files.length) return;
            setUploading(true);
            try {
              const uploaded: string[] = [];
              for (const file of files) {
                const body = new FormData();
                body.append("image", file);
                body.append(
                  "productId",
                  `animation-${projectId}-still-${crypto.randomUUID()}`,
                );
                const response = await fetch("/api/admin/product-media", {
                  method: "POST",
                  headers: {
                    "x-admin-password":
                      sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
                  },
                  body,
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok || !payload.imageUrl)
                  throw new Error(payload.error || "Image upload failed.");
                uploaded.push(payload.imageUrl);
              }
              await onChange([...images, ...uploaded]);
              event.target.value = "";
            } catch (error) {
              window.alert(
                error instanceof Error ? error.message : "Image upload failed.",
              );
            } finally {
              setUploading(false);
            }
          }}
        />
      </label>
      <small className="mt-2 block text-ink/55">
        Select one or several JPG, PNG, WebP or animated GIF files.
      </small>
    </div>
  );
}
