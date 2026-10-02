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
  const [selected, setSelected] = useState("");
  const save = async () => {
    setSaving(true);
    try {
      await saveShopSettingsAndWait(settings);
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
                <label>
                  Hero image URL
                  <input
                    className={field}
                    value={active.heroImage}
                    onChange={(e) => patch({ heroImage: e.target.value })}
                  />
                </label>
                <label>
                  Mobile hero URL
                  <input
                    className={field}
                    value={active.mobileHeroImage || ""}
                    onChange={(e) => patch({ mobileHeroImage: e.target.value })}
                  />
                </label>
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
      title="Moving Image"
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
              Client / musician
              <input
                className={field}
                value={active.client || ""}
                onChange={(e) => patch({ client: e.target.value })}
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
            <label>
              Thumbnail / poster URL
              <input
                className={field}
                value={active.thumbnail}
                onChange={(e) => patch({ thumbnail: e.target.value })}
              />
            </label>
            <label>
              Video embed URL
              <input
                className={field}
                value={active.videoUrl}
                onChange={(e) => patch({ videoUrl: e.target.value })}
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
            <label>
              Still image URLs (one per line)
              <textarea
                className={field}
                value={active.stillImages.join("\n")}
                onChange={(e) =>
                  patch({
                    stillImages: e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
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
