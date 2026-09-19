import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import type {
  CustomPaletteTypeId,
  PaletteColorOption,
  ShopSettings,
} from "@/lib/store";
import SaleEditor from "@/components/admin/SaleEditor";

export default function CustomPaletteAdmin({
  settings,
  onChange,
}: {
  settings: ShopSettings;
  onChange: (settings: ShopSettings) => void;
}) {
  const [activeType, setActiveType] = useState<CustomPaletteTypeId>("resin");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const palette = settings.paletteSettings;
  const update = (changes: Partial<typeof palette>) =>
    onChange({ ...settings, paletteSettings: { ...palette, ...changes } });
  const colors = palette.colors
    .filter((color) => color.paletteType === activeType)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const patchColor = (id: string, changes: Partial<PaletteColorOption>) =>
    update({
      colors: palette.colors.map((color) =>
        color.id === id
          ? { ...color, ...changes, updatedAt: new Date().toISOString() }
          : color,
      ),
    });
  const uploadCover = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("productId", "custom-palette-cover");
      const password =
        sessionStorage.getItem("aida-admin-password") ||
        import.meta.env.VITE_ADMIN_PASSWORD ||
        "a0019280718";
      const response = await fetch("/api/admin/product-media", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.imageUrl)
        throw new Error(payload.error || "Image upload failed.");
      update({ coverImage: payload.imageUrl });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  };
  const addColor = () => {
    const now = new Date().toISOString();
    update({
      colors: [
        ...palette.colors,
        {
          id: crypto.randomUUID(),
          paletteType: activeType,
          nameEn: "New colour",
          nameTr: "Yeni renk",
          hex: "#9ca98c",
          enabled: true,
          displayOrder: colors.length,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
  };
  const move = (id: string, direction: -1 | 1) => {
    const ordered = [...colors];
    const index = ordered.findIndex((color) => color.id === id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const order = new Map(ordered.map((color, i) => [color.id, i]));
    update({
      colors: palette.colors.map((color) =>
        color.paletteType === activeType
          ? {
              ...color,
              displayOrder: order.get(color.id) ?? color.displayOrder,
            }
          : color,
      ),
    });
  };
  return (
    <section className="space-y-7">
      <div className="admin-card">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">
          General
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={palette.enabled}
              onChange={(event) => update({ enabled: event.target.checked })}
            />
            Enabled
          </label>
          <label className="font-semibold">
            Price (TL)
            <input
              className="mt-2 min-h-11 w-full border border-ink/20 px-3"
              type="number"
              min="1"
              value={palette.priceMinor / 100}
              onChange={(event) =>
                update({
                  priceMinor: Math.round(Number(event.target.value) * 100),
                })
              }
            />
          </label>
          <div className="md:col-span-2">
            <span className="font-semibold">Cover image</span>
            <div className="mt-2 flex items-center gap-4">
              {palette.coverImage ? (
                <img
                  className="h-28 w-24 object-cover"
                  src={palette.coverImage}
                  alt="Custom palette cover"
                />
              ) : (
                <span className="grid h-28 w-24 place-items-center bg-ink/5">
                  <ImagePlus />
                </span>
              )}
              <label className="inline-flex min-h-11 cursor-pointer items-center border border-ink/20 px-4 font-semibold">
                {uploading ? "Uploading…" : "Replace image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => uploadCover(event.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-sm font-semibold text-coral">{error}</p>
        )}
        <div className="mt-6">
          <SaleEditor regularPriceMinor={palette.priceMinor} currency="TRY" sale={palette.sale} onChange={(sale) => update({ sale })} />
        </div>
      </div>
      <div className="admin-card">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">
          Palette types
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {palette.types.map((type) => (
            <label
              key={type.id}
              className="flex min-h-16 items-center justify-between border border-ink/10 px-4"
            >
              <span>
                <strong className="block">{type.nameEn}</strong>
                <small className="text-ink/50">{type.nameTr}</small>
              </span>
              <input
                type="checkbox"
                checked={type.enabled}
                onChange={(event) =>
                  update({
                    types: palette.types.map((entry) =>
                      entry.id === type.id
                        ? { ...entry, enabled: event.target.checked }
                        : entry,
                    ),
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
      <div className="admin-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">
              Color availability
            </p>
            <h2 className="mt-1 font-serif text-2xl">Palette colour options</h2>
          </div>
          <button type="button" className="button-primary" onClick={addColor}>
            Add colour
          </button>
        </div>
        <div className="mt-5 flex border-b border-ink/10">
          {palette.types.map((type) => (
            <button
              type="button"
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`min-h-11 border-b-2 px-5 text-sm font-bold uppercase tracking-wider ${activeType === type.id ? "border-coral text-coral" : "border-transparent text-ink/50"}`}
            >
              {type.nameEn} colors
            </button>
          ))}
        </div>
        <div className="divide-y divide-ink/10">
          {colors.map((color, index) => (
            <div
              key={color.id}
              className="grid gap-3 py-4 md:grid-cols-[auto_52px_1fr_1fr_110px_auto_auto]"
            >
              <div className="flex">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(color.id, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === colors.length - 1}
                  onClick={() => move(color.id, 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
              <input
                aria-label="Swatch color"
                type="color"
                className="h-11 w-13"
                value={color.hex}
                onChange={(event) =>
                  patchColor(color.id, { hex: event.target.value })
                }
              />
              <input
                aria-label="English name"
                className="border border-ink/20 px-3"
                value={color.nameEn}
                onChange={(event) =>
                  patchColor(color.id, { nameEn: event.target.value })
                }
              />
              <input
                aria-label="Turkish name"
                className="border border-ink/20 px-3"
                value={color.nameTr}
                onChange={(event) =>
                  patchColor(color.id, { nameTr: event.target.value })
                }
              />
              <input
                aria-label="Hex value"
                className="border border-ink/20 px-3 font-mono text-sm"
                pattern="#[0-9A-Fa-f]{6}"
                value={color.hex}
                onChange={(event) =>
                  patchColor(color.id, { hex: event.target.value })
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={color.enabled}
                  onChange={(event) =>
                    patchColor(color.id, { enabled: event.target.checked })
                  }
                />
                Enabled
              </label>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center text-coral"
                aria-label={`Delete ${color.nameEn}`}
                onClick={() =>
                  update({
                    colors: palette.colors.filter(
                      (entry) => entry.id !== color.id,
                    ),
                  })
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
