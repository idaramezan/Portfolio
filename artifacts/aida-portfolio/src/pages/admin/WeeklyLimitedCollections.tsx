import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  loadShopSettings,
  saveShopSettingsAndWait,
  type LimitedEditionGroup,
  type ManagedProduct,
  type ShopSettings,
  type WeeklyLimitedCollection,
} from "@/lib/store";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const field = "mt-1 min-h-11 w-full border border-ink/20 bg-paper px-3";
const isoLocal = (value: string) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export default function WeeklyLimitedCollections() {
  const [settings, setSettings] = useState<ShopSettings>(loadShopSettings);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const group =
    settings.limitedEditionGroups.find((x) => x.id === selectedGroup) ||
    settings.limitedEditionGroups[0];
  const week =
    settings.weeklyLimitedCollections.find((x) => x.id === selectedWeek) ||
    settings.weeklyLimitedCollections[0];
  const updateGroup = (changes: Partial<LimitedEditionGroup>) =>
    group &&
    setSettings({
      ...settings,
      limitedEditionGroups: settings.limitedEditionGroups.map((x) =>
        x.id === group.id ? { ...x, ...changes } : x,
      ),
    });
  const updateWeek = (changes: Partial<WeeklyLimitedCollection>) =>
    week &&
    setSettings({
      ...settings,
      weeklyLimitedCollections: settings.weeklyLimitedCollections.map((x) =>
        x.id === week.id
          ? { ...x, ...changes }
          : changes.status === "active" && x.status === "active"
            ? { ...x, status: "closed" }
            : x,
      ),
    });
  const reorderWeekEdition = (dragId: string, targetId: string) => {
    if (!week || dragId === targetId) return;
    const ids = [...week.editionGroupIds];
    const from = ids.indexOf(dragId),
      to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    updateWeek({ editionGroupIds: ids });
  };
  const save = async (next = settings) => {
    setSaving(true);
    setMessage("");
    try {
      for (const collection of next.weeklyLimitedCollections) {
        const selected = collection.editionGroupIds
          .map((id) => next.limitedEditionGroups.find((item) => item.id === id))
          .filter((item): item is LimitedEditionGroup => Boolean(item));
        const productIds = selected
          .map((item) => item.productId)
          .filter((id): id is string => Boolean(id));
        if (new Set(productIds).size !== productIds.length)
          throw new Error(
            "The same print cannot be selected twice in one collection.",
          );
        if (collection.status === "active" && selected.length !== 3)
          throw new Error(
            "An active collection must have exactly three featured editions.",
          );
        if (
          collection.status === "active" &&
          selected.some(
            (item) => !item.productId || item.editionEnabled === false,
          )
        )
          throw new Error(
            "Every active featured edition must reference an enabled print product.",
          );
      }
      await saveShopSettingsAndWait(next);
      setMessage("Weekly releases saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };
  const createGroup = () => {
    const id = crypto.randomUUID();
    const next: LimitedEditionGroup = {
      id,
      productId: "",
      editionEnabled: true,
      title: "Untitled edition",
      slug: `edition-${settings.limitedEditionGroups.length + 1}`,
      description: "",
      story: "",
      image: "",
      galleryImages: [],
      editionSize: 10,
      releaseStart: "",
      releaseEnd: "",
      status: "draft",
      homepageFeatured: true,
      homepageOrder: settings.limitedEditionGroups.length + 1,
      units: Array.from({ length: 10 }, (_, i) => ({
        editionNumber: i + 1,
        fourthwallProductId: "",
        status: "available",
      })),
    };
    setSettings({
      ...settings,
      limitedEditionGroups: [...settings.limitedEditionGroups, next],
    });
    setSelectedGroup(id);
  };
  const createWeek = () => {
    const id = crypto.randomUUID();
    const next: WeeklyLimitedCollection = {
      id,
      title: "This week's collection",
      slug: `weekly-${settings.weeklyLimitedCollections.length + 1}`,
      heroImage: "",
      shortDescription: "",
      startAt: "",
      endAt: "",
      status: "draft",
      editionGroupIds: [],
      displayOrder: settings.weeklyLimitedCollections.length + 1,
    };
    setSettings({
      ...settings,
      weeklyLimitedCollections: [...settings.weeklyLimitedCollections, next],
    });
    setSelectedWeek(id);
  };
  return (
    <AdminLayout
      title="Weekly Limited Collections"
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
      <div className="grid gap-8">
        <section className="admin-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-coral">
                Content / commerce
              </p>
              <h2 className="font-serif text-3xl">Weekly collections</h2>
            </div>
            <button className="button-link" onClick={createWeek}>
              Create collection
            </button>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
            <div>
              {settings.weeklyLimitedCollections.map((x) => (
                <button
                  key={x.id}
                  className={`mb-2 w-full border p-3 text-left ${week?.id === x.id ? "border-coral" : "border-ink/10"}`}
                  onClick={() => setSelectedWeek(x.id)}
                >
                  <strong>{x.title}</strong>
                  <small className="block">{x.status}</small>
                </button>
              ))}
            </div>
            {week && (
              <div className="grid gap-4 md:grid-cols-2">
                <Text
                  label="Title"
                  value={week.title}
                  onChange={(title) => updateWeek({ title })}
                />
                <Text
                  label="Slug"
                  value={week.slug}
                  onChange={(slug) => updateWeek({ slug })}
                />
                <Text
                  label="Short introduction"
                  value={week.shortDescription}
                  onChange={(shortDescription) =>
                    updateWeek({ shortDescription })
                  }
                  area
                />
                <Select
                  label="Status"
                  value={week.status}
                  values={[
                    "draft",
                    "scheduled",
                    "active",
                    "closed",
                    "archived",
                  ]}
                  onChange={(status) =>
                    updateWeek({
                      status: status as WeeklyLimitedCollection["status"],
                    })
                  }
                />
                <DateField
                  label="Starts"
                  value={week.startAt}
                  onChange={(startAt) => updateWeek({ startAt })}
                />
                <DateField
                  label="Closes"
                  value={week.endAt}
                  onChange={(endAt) => updateWeek({ endAt })}
                />
                <ImageUpload
                  label="Hero image"
                  value={week.heroImage}
                  owner={`weekly-${week.id}`}
                  onUploaded={async (heroImage) => {
                    const next = {
                      ...settings,
                      weeklyLimitedCollections:
                        settings.weeklyLimitedCollections.map((x) =>
                          x.id === week.id ? { ...x, heroImage } : x,
                        ),
                    };
                    setSettings(next);
                    await save(next);
                  }}
                />
                <fieldset className="border border-ink/10 p-3">
                  <legend className="font-semibold">
                    Featured editions · max 3
                  </legend>
                  {settings.limitedEditionGroups.map((item) => (
                    <label
                      className="mt-2 flex gap-2"
                      key={item.id}
                      draggable={week.editionGroupIds.includes(item.id)}
                      onDragStart={(event) =>
                        event.dataTransfer.setData("text/plain", item.id)
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) =>
                        reorderWeekEdition(
                          event.dataTransfer.getData("text/plain"),
                          item.id,
                        )
                      }
                    >
                      <input
                        type="checkbox"
                        checked={week.editionGroupIds.includes(item.id)}
                        disabled={
                          !week.editionGroupIds.includes(item.id) &&
                          week.editionGroupIds.length >= 3
                        }
                        onChange={(e) =>
                          updateWeek({
                            editionGroupIds: e.target.checked
                              ? [...week.editionGroupIds, item.id]
                              : week.editionGroupIds.filter(
                                  (id) => id !== item.id,
                                ),
                          })
                        }
                      />
                      {item.title}
                    </label>
                  ))}
                </fieldset>
              </div>
            )}
          </div>
        </section>
        <section className="admin-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-coral">
                Products
              </p>
              <h2 className="font-serif text-3xl">Limited edition groups</h2>
            </div>
            <button className="button-link" onClick={createGroup}>
              Create edition group
            </button>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
            <div>
              {settings.limitedEditionGroups.map((x) => (
                <button
                  key={x.id}
                  className={`mb-2 w-full border p-3 text-left ${group?.id === x.id ? "border-coral" : "border-ink/10"}`}
                  onClick={() => setSelectedGroup(x.id)}
                >
                  <strong>{x.title}</strong>
                  <small className="block">
                    Edition of {x.editionSize} · {x.status}
                  </small>
                </button>
              ))}
            </div>
            {group && (
              <div className="grid gap-4 md:grid-cols-2">
                <PrintProductPicker
                  products={settings.printProducts}
                  value={group.productId || ""}
                  onChange={(productId) => {
                    const product = settings.printProducts.find(
                      (item) => item.id === productId,
                    );
                    updateGroup({
                      productId,
                      title: product?.name || group.title,
                      slug: product?.slug || group.slug,
                      description: product?.description || group.description,
                      image: product?.imageUrl || group.image,
                    });
                  }}
                />
                <label className="flex items-center gap-2 self-end pb-3">
                  <input
                    type="checkbox"
                    checked={group.editionEnabled !== false}
                    onChange={(e) =>
                      updateGroup({ editionEnabled: e.target.checked })
                    }
                  />
                  Edition enabled
                </label>
                <Text
                  label="Title"
                  value={group.title}
                  onChange={(title) => updateGroup({ title })}
                />
                <Text
                  label="Slug"
                  value={group.slug}
                  onChange={(slug) => updateGroup({ slug })}
                />
                <Text
                  label="Description"
                  value={group.description}
                  area
                  onChange={(description) => updateGroup({ description })}
                />
                <Text
                  label="Story"
                  value={group.story}
                  area
                  onChange={(story) => updateGroup({ story })}
                />
                <Text
                  label="Homepage title override (optional)"
                  value={group.homepageTitleOverride || ""}
                  onChange={(homepageTitleOverride) =>
                    updateGroup({ homepageTitleOverride })
                  }
                />
                <Text
                  label="Homepage story override (optional)"
                  value={group.homepageStoryOverride || ""}
                  area
                  onChange={(homepageStoryOverride) =>
                    updateGroup({ homepageStoryOverride })
                  }
                />
                <Text
                  label="Homepage CTA label (optional)"
                  value={group.homepageCtaLabel || ""}
                  onChange={(homepageCtaLabel) =>
                    updateGroup({ homepageCtaLabel })
                  }
                />
                <Select
                  label="Homepage image focal point"
                  value={group.homepageImageFocalPoint || "center"}
                  values={["center", "top", "bottom", "left", "right"]}
                  onChange={(homepageImageFocalPoint) =>
                    updateGroup({ homepageImageFocalPoint })
                  }
                />
                <Text
                  label="Price label (optional)"
                  value={group.priceLabel || ""}
                  onChange={(priceLabel) => updateGroup({ priceLabel })}
                />
                <Select
                  label="Status"
                  value={group.status}
                  values={[
                    "draft",
                    "scheduled",
                    "active",
                    "closed",
                    "archived",
                  ]}
                  onChange={(status) =>
                    updateGroup({
                      status: status as LimitedEditionGroup["status"],
                    })
                  }
                />
                <DateField
                  label="Release starts"
                  value={group.releaseStart}
                  onChange={(releaseStart) => updateGroup({ releaseStart })}
                />
                <DateField
                  label="Release closes"
                  value={group.releaseEnd}
                  onChange={(releaseEnd) => updateGroup({ releaseEnd })}
                />
                <ImageUpload
                  label="Main website image"
                  value={group.image}
                  owner={`edition-${group.id}`}
                  onUploaded={async (image) => {
                    const next = {
                      ...settings,
                      limitedEditionGroups: settings.limitedEditionGroups.map(
                        (x) => (x.id === group.id ? { ...x, image } : x),
                      ),
                    };
                    setSettings(next);
                    await save(next);
                  }}
                />
                <ImageUpload
                  label="Homepage image override (optional)"
                  value={group.homepageImageOverride || ""}
                  owner={`edition-home-${group.id}`}
                  onUploaded={async (homepageImageOverride) => {
                    const next = {
                      ...settings,
                      limitedEditionGroups: settings.limitedEditionGroups.map(
                        (x) =>
                          x.id === group.id
                            ? { ...x, homepageImageOverride }
                            : x,
                      ),
                    };
                    setSettings(next);
                    await save(next);
                  }}
                />
                <label>
                  Edition size
                  <input
                    className={field}
                    type="number"
                    min="1"
                    max="100"
                    value={group.editionSize}
                    onChange={(e) => {
                      const editionSize = Math.max(1, Number(e.target.value));
                      updateGroup({
                        editionSize,
                        units: Array.from(
                          { length: editionSize },
                          (_, i) =>
                            group.units[i] || {
                              editionNumber: i + 1,
                              fourthwallProductId: "",
                              status: "available",
                            },
                        ),
                      });
                    }}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={group.homepageFeatured}
                    onChange={(e) =>
                      updateGroup({ homepageFeatured: e.target.checked })
                    }
                  />
                  Featured on homepage
                </label>
                <label>
                  Homepage order
                  <input
                    className={field}
                    type="number"
                    value={group.homepageOrder}
                    onChange={(e) =>
                      updateGroup({ homepageOrder: Number(e.target.value) })
                    }
                  />
                </label>
                <fieldset className="md:col-span-2 border border-ink/10 p-4">
                  <legend className="font-semibold">
                    AedaArt edition ledger
                  </legend>
                  <p className="mb-3 text-sm text-ink/60">
                    One global pool is shared by Türkiye and Fourthwall formats.
                    Numbers are allocated by the server in purchase order.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.units.map((unit, index) => (
                      <div
                        className="grid grid-cols-[1fr_140px] items-end gap-3"
                        key={unit.editionNumber}
                      >
                        <strong className="pb-3 text-sm">
                          {String(unit.editionNumber).padStart(2, "0")} /{" "}
                          {group.editionSize}
                        </strong>
                        <Select
                          label="Status"
                          value={unit.status}
                          values={["available", "reserved", "sold", "disabled"]}
                          onChange={(status) =>
                            updateGroup({
                              units: group.units.map((x, i) =>
                                i === index
                                  ? { ...x, status: status as any }
                                  : x,
                              ),
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function PrintProductPicker({
  products,
  value,
  onChange,
}: {
  products: ManagedProduct[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = products.find((item) => item.id === value);
  return (
    <label>
      Search/select existing print
      <select
        className={field}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a print…</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} · Print · Türkiye{" "}
            {product.availableInTurkiye === false ? "—" : "✓"} · Fourthwall{" "}
            {product.fourthwallProductId || product.fourthwallVariants?.length
              ? "✓"
              : "—"}
          </option>
        ))}
      </select>
      {selected && (
        <span className="mt-2 grid grid-cols-[52px_1fr] items-center gap-3 text-sm">
          <img
            src={selected.imageUrl}
            alt=""
            className="h-14 w-14 object-contain"
          />
          <span>
            <strong className="block">{selected.name}</strong>
            <span className="text-ink/55">
              Existing print reference · no duplicate product created
            </span>
          </span>
        </span>
      )}
    </label>
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
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Select({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select
        className={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {values.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        className={field}
        type="datetime-local"
        value={isoLocal(value)}
        onChange={(e) =>
          onChange(e.target.value ? new Date(e.target.value).toISOString() : "")
        }
      />
    </label>
  );
}
function ImageUpload({
  label,
  value,
  owner,
  onUploaded,
}: {
  label: string;
  value: string;
  owner: string;
  onUploaded: (value: string) => Promise<void>;
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
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              const body = new FormData();
              body.append("image", file);
              body.append("productId", owner);
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
                throw new Error(data.error || "Upload failed");
              await onUploaded(data.imageUrl);
            } catch (error) {
              window.alert(
                error instanceof Error ? error.message : "Upload failed",
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
