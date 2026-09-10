import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FlipHorizontal,
  ImagePlus,
  Layers,
  Lock,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { loadShopSettings } from "@/lib/store";
import {
  GALLERY_PREVIEW_PATH,
  galleryAuthHeaders,
  galleryRequest,
  type GalleryElement,
  type GalleryScene,
  type GalleryState,
} from "@/lib/visual-gallery";

const palette = [
  "#f6efe3",
  "#f4dce2",
  "#dce8ee",
  "#dce4d8",
  "#e5dced",
  "#e8d8c2",
  "#d8a18f",
  "#dedbd5",
];
const freshElement = (
  type: GalleryElement["type"],
  label: string,
  imageUrl: string,
  referenceId?: string,
): GalleryElement => ({
  id: crypto.randomUUID(),
  type,
  label,
  imageUrl,
  referenceId,
  x: 35,
  y: type === "artwork" ? 20 : 60,
  width: type === "artwork" ? 18 : 32,
  height: type === "artwork" ? 30 : 30,
  rotation: 0,
  zIndex: type === "artwork" ? 5 : 2,
  visible: true,
  locked: false,
  flipX: false,
  lockAspect: true,
  scaleMode: "realistic",
  frameStyle: "none",
  matStyle: "none",
  shadowIntensity: 0.18,
  shadowBlur: 10,
  shadowOffset: 4,
});

function artworkElement(product: {
  id: string;
  name: string;
  imageUrl: string;
  dimension?: string;
}) {
  const values = (product.dimension?.match(/[\d.,]+/g) || [])
    .slice(0, 2)
    .map((value) => Number(value.replace(",", ".")))
    .filter(Number.isFinite);
  const widestCm = Math.max(...values, 20);
  const width = Math.max(7, Math.min(34, widestCm * 0.38));
  return {
    ...freshElement("artwork", product.name, product.imageUrl, product.id),
    width,
    height: width * 1.35,
  };
}

export default function VisualGalleryAdmin() {
  const [data, setData] = useState<GalleryState | null>(null),
    [activeId, setActiveId] = useState(""),
    [selectedId, setSelectedId] = useState(""),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop"),
    [snap, setSnap] = useState(true),
    [creating, setCreating] = useState(false),
    [deleting, setDeleting] = useState(false),
    [assetName, setAssetName] = useState(""),
    [assetCategory, setAssetCategory] = useState("furniture"),
    [history, setHistory] = useState<GalleryScene[]>([]),
    [future, setFuture] = useState<GalleryScene[]>([]);
  const canvas = useRef<HTMLDivElement>(null);
  const products = loadShopSettings();
  const scene = data?.scenes.find((s) => s.id === activeId) || data?.scenes[0];
  const selected = scene?.elements.find((e) => e.id === selectedId);
  const updateScene = (patch: Partial<GalleryScene>, record = true) => {
    if (!data || !scene) return;
    if (record) setHistory((h) => [...h, structuredClone(scene)].slice(-30));
    setFuture([]);
    setData({
      ...data,
      scenes: data.scenes.map((s) =>
        s.id === scene.id ? { ...s, ...patch } : s,
      ),
    });
    setDirty(true);
  };
  const updateElement = (
    id: string,
    patch: Partial<GalleryElement>,
    record = false,
  ) =>
    updateScene(
      {
        elements: scene!.elements.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      },
      record,
    );
  useEffect(() => {
    galleryRequest("/api/gallery/admin")
      .then((payload) => {
        setData(payload);
        setActiveId(payload.scenes[0]?.id || "");
      })
      .catch((e) => setMessage(e.message));
  }, []);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!selected || !scene) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (["Delete", "Backspace"].includes(e.key)) {
        if ((e.target as HTMLElement).matches("input,textarea,select")) return;
        updateScene({
          elements: scene.elements.filter((x) => x.id !== selected.id),
        });
        setSelectedId("");
        return;
      }
      const movement: { [key: string]: [number, number] } = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (movement[e.key]) {
        e.preventDefault();
        const [x, y] = movement[e.key];
        updateElement(selected.id, {
          x: selected.x + x * (e.shiftKey ? 5 : 1),
          y: selected.y + y * (e.shiftKey ? 5 : 1),
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const undo = () => {
    const previous = history.at(-1);
    if (!previous || !data || !scene) return;
    setFuture((f) => [structuredClone(scene), ...f]);
    setData({
      ...data,
      scenes: data.scenes.map((s) => (s.id === scene.id ? previous : s)),
    });
    setHistory((h) => h.slice(0, -1));
    setDirty(true);
  };
  const redo = () => {
    const next = future[0];
    if (!next || !data || !scene) return;
    setHistory((h) => [...h, structuredClone(scene)]);
    setData({
      ...data,
      scenes: data.scenes.map((s) => (s.id === scene.id ? next : s)),
    });
    setFuture((f) => f.slice(1));
    setDirty(true);
  };
  const pointer = (e: React.PointerEvent, id: string, resize = false) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const item = scene!.elements.find((x) => x.id === id)!;
    if (item.locked) return;
    setSelectedId(id);
    setHistory((h) => [...h, structuredClone(scene!)]);
    const start = [
      e.clientX,
      e.clientY,
      item.x,
      item.y,
      item.width,
      item.height,
    ];
    const move = (ev: PointerEvent) => {
      const rect = canvas.current!.getBoundingClientRect(),
        dx = ((ev.clientX - start[0]) / rect.width) * 100,
        dy = ((ev.clientY - start[1]) / rect.height) * 100;
      if (resize)
        updateElement(id, {
          width: Math.max(3, start[4] + dx),
          height: item.lockAspect
            ? Math.max(3, start[5] + dx * (start[5] / start[4]))
            : Math.max(3, start[5] + dy),
        });
      else
        updateElement(id, {
          x: Math.max(0, Math.min(97, start[2] + dx)),
          y: Math.max(0, Math.min(97, start[3] + dy)),
        });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const save = async (status = scene?.status) => {
    if (!scene) return;
    try {
      const payload = await galleryRequest(
        `/api/gallery/admin/scenes/${scene.id}`,
        { method: "PUT", body: JSON.stringify({ ...scene, status }) },
      );
      setData(payload);
      setDirty(false);
      setMessage(status === "published" ? "Room published" : "Room saved");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Couldn't save this room. Your changes are still here.",
      );
    }
  };
  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = await galleryRequest("/api/gallery/admin/scenes", {
      method: "POST",
      body: JSON.stringify({
        internalName: form.get("name"),
        wallColor: form.get("wall"),
        floorType: form.get("floor"),
      }),
    });
    setData(payload);
    setActiveId(payload.scenes.at(-1)?.id || "");
    setCreating(false);
    setMessage("Room created");
  };
  const add = (element: GalleryElement) => {
    if (!scene) return;
    updateScene({ elements: [...scene.elements, element] });
    setSelectedId(element.id);
    setMessage(
      element.type === "artwork" ? "Artwork added to the wall" : "Asset added",
    );
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    body.append("productId", "gallery-asset");
    const response = await fetch("/api/admin/product-media", {
      method: "POST",
      headers: { "x-admin-password": galleryAuthHeaders()["x-admin-password"] },
      body,
    });
    const upload = await response.json();
    if (!response.ok) throw new Error(upload.error);
    const payload = await galleryRequest("/api/gallery/admin/assets", {
      method: "POST",
      body: JSON.stringify({
        name: assetName || file.name,
        category: assetCategory,
        imageUrl: upload.imageUrl,
      }),
    });
    setData(payload);
    setMessage("Asset uploaded");
  };
  if (!data)
    return (
      <AdminLayout title="Visual Gallery">
        <p>{message || "Loading visual editor…"}</p>
      </AdminLayout>
    );
  return (
    <AdminLayout
      title="Visual Gallery"
      actions={
        <>
          <button
            className="admin-button"
            disabled={!history.length}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="admin-button"
            disabled={!future.length}
            onClick={redo}
          >
            <Redo2 size={16} />
          </button>
          <button className="button-secondary" onClick={() => save("draft")}>
            <Save size={16} /> Save draft
          </button>
          <button className="button-primary" onClick={() => save("published")}>
            Publish scene
          </button>
        </>
      }
    >
      <div className="gallery-admin-settings">
        <section>
          <h2>Gallery Settings</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              Gallery title EN
              <input
                value={data.settings.titleEn}
                onChange={(e) =>
                  setData({
                    ...data,
                    settings: { ...data.settings, titleEn: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Gallery title TR
              <input
                value={data.settings.titleTr}
                onChange={(e) =>
                  setData({
                    ...data,
                    settings: { ...data.settings, titleTr: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Intro EN
              <textarea
                value={data.settings.introEn}
                onChange={(e) =>
                  setData({
                    ...data,
                    settings: { ...data.settings, introEn: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Intro TR
              <textarea
                value={data.settings.introTr}
                onChange={(e) =>
                  setData({
                    ...data,
                    settings: { ...data.settings, introTr: e.target.value },
                  })
                }
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label>
              <input
                type="checkbox"
                checked={data.settings.enabled}
                onChange={(e) =>
                  setData({
                    ...data,
                    settings: { ...data.settings, enabled: e.target.checked },
                  })
                }
              />{" "}
              Gallery enabled
            </label>
            <select
              value={data.settings.visibility}
              onChange={(e) =>
                setData({
                  ...data,
                  settings: {
                    ...data.settings,
                    visibility: e.target.value as any,
                  },
                })
              }
            >
              <option value="private_preview">Private preview</option>
              <option value="public_unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
            <button
              className="button-secondary"
              onClick={async () => {
                const payload = await galleryRequest(
                  "/api/gallery/admin/settings",
                  { method: "PUT", body: JSON.stringify(data.settings) },
                );
                setData(payload);
                setMessage("Gallery settings updated");
              }}
            >
              Save settings
            </button>
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  `${location.origin}${GALLERY_PREVIEW_PATH}`,
                )
              }
            >
              <Copy size={15} /> Copy preview link
            </button>
            <a href={GALLERY_PREVIEW_PATH} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Open preview
            </a>
          </div>
        </section>
      </div>
      <div className="gallery-admin-toolbar">
        <div>
          <button
            className="button-secondary"
            onClick={() => setCreating(true)}
          >
            + New scene
          </button>
          {scene && (
            <>
              <button
                onClick={async () =>
                  setData(
                    await galleryRequest(
                      `/api/gallery/admin/scenes/${scene.id}/duplicate`,
                      { method: "POST" },
                    ),
                  )
                }
              >
                Duplicate
              </button>
              <button onClick={() => setDeleting(true)}>
                <Trash2 size={15} /> Delete
              </button>
            </>
          )}
        </div>
        <div>
          {(["desktop", "tablet", "mobile"] as const).map((x) => (
            <button
              key={x}
              data-active={device === x || undefined}
              onClick={() => setDevice(x)}
            >
              {x}
            </button>
          ))}
          <button onClick={() => setSnap(!snap)}>
            Snap: {snap ? "ON" : "OFF"}
          </button>
          <span>{dirty ? "Unsaved changes" : "Saved"}</span>
        </div>
      </div>
      {!scene ? (
        <section className="gallery-admin-empty">
          <h2>Visual Gallery</h2>
          <p>
            Create spaces where visitors can see your artwork styled on real
            walls.
          </p>
          <button className="button-primary" onClick={() => setCreating(true)}>
            Create your first room
          </button>
          <small>
            Choose a wall, add artwork and style the space with furniture and
            decor.
          </small>
        </section>
      ) : (
        <div className="gallery-editor-grid">
          <aside className="gallery-editor-panel">
            <h3>Asset / element library</h3>
            <details open>
              <summary>Artwork</summary>
              <div className="gallery-asset-list">
                {[...products.originalProducts, ...products.printProducts].map(
                  (p) => (
                    <button key={p.id} onClick={() => add(artworkElement(p))}>
                      <img src={p.imageUrl} alt="" />
                      <span>
                        {p.name}
                        <small>
                          {p.kind} · {p.dimension || "Size unavailable"}
                        </small>
                      </span>
                    </button>
                  ),
                )}
              </div>
            </details>
            <details>
              <summary>Gallery assets</summary>
              <div className="gallery-asset-list">
                {data.assets
                  .filter((a) => a.enabled)
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() =>
                        add(
                          freshElement(
                            a.category as GalleryElement["type"],
                            a.name,
                            a.imageUrl,
                            a.id,
                          ),
                        )
                      }
                    >
                      <img src={a.imageUrl} alt="" />
                      <span>
                        {a.name}
                        <small>{a.category}</small>
                      </span>
                    </button>
                  ))}
              </div>
              <input
                placeholder="Asset name"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
              />
              <select
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value)}
              >
                {[
                  "furniture",
                  "lighting",
                  "plant",
                  "table",
                  "decor",
                  "rug",
                  "other",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <label className="button-secondary">
                <Upload size={15} /> Upload PNG / WebP
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/webp"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>
            </details>
            <details>
              <summary>
                <Layers size={15} /> Layers
              </summary>
              {[...scene.elements]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((e) => (
                  <button key={e.id} onClick={() => setSelectedId(e.id)}>
                    {e.visible ? <Eye size={14} /> : <EyeOff size={14} />}{" "}
                    {e.label}
                  </button>
                ))}
            </details>
          </aside>
          <main className="gallery-editor-stage" data-device={device}>
            <div
              className="gallery-editor-canvas"
              ref={canvas}
              style={{ backgroundColor: scene.wallColor }}
            >
              {scene.elements.map((e) => (
                <div
                  key={e.id}
                  className={`gallery-editor-element ${selectedId === e.id ? "is-selected" : ""}`}
                  style={{
                    left: `${e.x}%`,
                    top: `${e.y}%`,
                    width: `${e.width}%`,
                    height: `${e.height}%`,
                    zIndex: e.zIndex,
                    transform: `rotate(${e.rotation}deg) scaleX(${e.flipX ? -1 : 1})`,
                    display: e.visible ? undefined : "none",
                  }}
                  onPointerDown={(event) => pointer(event, e.id)}
                >
                  <img src={e.imageUrl} alt="" draggable={false} />
                  {selectedId === e.id && !e.locked && (
                    <button
                      aria-label="Resize"
                      className="gallery-resize-handle"
                      onPointerDown={(event) => pointer(event, e.id, true)}
                    />
                  )}
                </div>
              ))}
              <div
                className={`gallery-editor-floor floor-${scene.floorType}`}
              />
            </div>
          </main>
          <aside className="gallery-editor-panel">
            <h3>Properties</h3>
            <label>
              Room
              <select
                value={scene.id}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  setSelectedId("");
                }}
              >
                {data.scenes.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.internalName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Internal name
              <input
                value={scene.internalName}
                onChange={(e) => updateScene({ internalName: e.target.value })}
              />
            </label>
            <label>
              Public title EN
              <input
                value={scene.titleEn}
                onChange={(e) => updateScene({ titleEn: e.target.value })}
              />
            </label>
            <label>
              Public title TR
              <input
                value={scene.titleTr}
                onChange={(e) => updateScene({ titleTr: e.target.value })}
              />
            </label>
            <label>
              Description EN
              <textarea
                value={scene.descriptionEn}
                onChange={(e) => updateScene({ descriptionEn: e.target.value })}
              />
            </label>
            <label>
              Description TR
              <textarea
                value={scene.descriptionTr}
                onChange={(e) => updateScene({ descriptionTr: e.target.value })}
              />
            </label>
            <label>
              Display order
              <input
                type="number"
                value={scene.displayOrder}
                onChange={(e) =>
                  updateScene({ displayOrder: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Wall color
              <input
                type="color"
                value={scene.wallColor}
                onChange={(e) => updateScene({ wallColor: e.target.value })}
              />
            </label>
            <div className="gallery-palette">
              {palette.map((color) => (
                <button
                  key={color}
                  aria-label={color}
                  style={{ background: color }}
                  onClick={() => updateScene({ wallColor: color })}
                />
              ))}
            </div>
            <label>
              Wall texture
              <select
                value={scene.wallTexture}
                onChange={(e) => updateScene({ wallTexture: e.target.value })}
              >
                {[
                  "none",
                  "subtle_plaster",
                  "fine_limewash",
                  "soft_painted_wall",
                  "paper",
                ].map((x) => (
                  <option key={x}>{x.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label>
              Floor
              <select
                value={scene.floorType}
                onChange={(e) => updateScene({ floorType: e.target.value })}
              >
                {[
                  "none",
                  "light_oak",
                  "medium_oak",
                  "dark_warm_wood",
                  "cream_stone",
                  "warm_concrete",
                ].map((x) => (
                  <option key={x}>{x.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label>
              Lighting
              <select
                value={scene.lightingPreset}
                onChange={(e) =>
                  updateScene({ lightingPreset: e.target.value })
                }
              >
                {[
                  "natural_daylight",
                  "warm_afternoon",
                  "soft_neutral",
                  "cozy_evening",
                ].map((x) => (
                  <option key={x}>{x.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label>
              Mobile crop
              <select
                value={scene.mobileCrop}
                onChange={(e) => updateScene({ mobileCrop: e.target.value })}
              >
                {["left", "center", "right"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {selected && (
              <>
                <hr />
                <h3>{selected.label}</h3>
                {selected.type === "artwork" && (
                  <>
                    <p className="text-xs text-ink/55">
                      Actual artwork size:{" "}
                      {[
                        ...products.originalProducts,
                        ...products.printProducts,
                      ].find((p) => p.id === selected.referenceId)?.dimension ||
                        "Not recorded"}
                    </p>
                    {selected.referenceId &&
                      ![
                        ...products.originalProducts,
                        ...products.printProducts,
                      ].some((p) => p.id === selected.referenceId) && (
                        <p
                          role="alert"
                          className="text-xs font-bold text-coral"
                        >
                          This artwork is no longer publicly available. Replace
                          it or remove it from the scene.
                        </p>
                      )}
                  </>
                )}
                <label>
                  Rotation
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step=".5"
                    value={selected.rotation}
                    onChange={(e) =>
                      updateElement(selected.id, {
                        rotation: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Width
                  <input
                    type="range"
                    min="3"
                    max="80"
                    value={selected.width}
                    onChange={(e) =>
                      updateElement(selected.id, {
                        width: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.locked}
                    onChange={(e) =>
                      updateElement(selected.id, { locked: e.target.checked })
                    }
                  />
                  <Lock size={14} /> Locked
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.visible}
                    onChange={(e) =>
                      updateElement(selected.id, { visible: e.target.checked })
                    }
                  />{" "}
                  Visible
                </label>
                <button
                  onClick={() =>
                    updateElement(selected.id, { flipX: !selected.flipX })
                  }
                >
                  <FlipHorizontal size={15} /> Flip
                </button>
                <button
                  onClick={() =>
                    add({
                      ...selected,
                      id: crypto.randomUUID(),
                      x: selected.x + 3,
                      y: selected.y + 3,
                    })
                  }
                >
                  <Copy size={15} /> Duplicate
                </button>
                <button
                  onClick={() => {
                    updateScene({
                      elements: scene.elements.filter(
                        (e) => e.id !== selected.id,
                      ),
                    });
                    setSelectedId("");
                  }}
                >
                  <Trash2 size={15} /> Delete
                </button>
                {selected.type === "artwork" && (
                  <>
                    <label>
                      Frame
                      <select
                        value={selected.frameStyle}
                        onChange={(e) =>
                          updateElement(selected.id, {
                            frameStyle: e.target.value,
                          })
                        }
                      >
                        {[
                          "none",
                          "thin-black",
                          "thin-white",
                          "natural-oak",
                          "dark-wood",
                          "warm-walnut",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Mat
                      <select
                        value={selected.matStyle}
                        onChange={(e) =>
                          updateElement(selected.id, {
                            matStyle: e.target.value,
                          })
                        }
                      >
                        {["none", "cream", "white", "warm-off-white"].map(
                          (x) => (
                            <option key={x}>{x}</option>
                          ),
                        )}
                      </select>
                    </label>
                  </>
                )}
              </>
            )}
          </aside>
        </div>
      )}
      {creating && (
        <div className="gallery-admin-modal">
          <form onSubmit={create}>
            <h2>Create a room</h2>
            <label>
              Room name
              <input name="name" required autoFocus />
            </label>
            <label>
              Wall color
              <input name="wall" type="color" defaultValue="#efe4d4" />
            </label>
            <label>
              Floor style
              <select name="floor" defaultValue="light_oak">
                <option value="none">No visible floor</option>
                <option value="light_oak">Light oak</option>
                <option value="medium_oak">Medium oak</option>
                <option value="cream_stone">Cream stone</option>
              </select>
            </label>
            <div>
              <button type="button" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button className="button-primary">Create room</button>
            </div>
          </form>
        </div>
      )}
      {deleting && scene && (
        <div className="gallery-admin-modal" role="dialog" aria-modal="true">
          <div className="gallery-admin-confirm">
            <h2>Delete “{scene.internalName}”?</h2>
            <p>
              This removes the room from the Visual Gallery. Your artwork
              products and media files will not be deleted.
            </p>
            <div>
              <button onClick={() => setDeleting(false)}>Cancel</button>
              <button
                className="button-primary"
                onClick={async () => {
                  const payload = await galleryRequest(
                    `/api/gallery/admin/scenes/${scene.id}`,
                    { method: "DELETE" },
                  );
                  setData(payload);
                  setActiveId(payload.scenes[0]?.id || "");
                  setDeleting(false);
                  setMessage("Room deleted");
                }}
              >
                Delete room
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="gallery-admin-message" aria-live="polite">
        {message}
      </p>
    </AdminLayout>
  );
}
