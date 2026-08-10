import { FormEvent, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { loadShopSettings, saveShopSettingsAndWait } from "@/lib/store";
export default function HundredWindowsAdmin() {
  const [settings, setSettings] = useState(loadShopSettings),
    [day, setDay] = useState(settings.hundredWindows?.currentDay || 1),
    [productId, setProductId] = useState(
      settings.hundredWindows?.currentProductId || "",
    ),
    [heroImageUrl, setHeroImageUrl] = useState(
      settings.hundredWindows?.heroImageUrl || "",
    ),
    [heroUpdatedAt, setHeroUpdatedAt] = useState(
      settings.hundredWindows?.heroUpdatedAt || "",
    ),
    [search, setSearch] = useState(""),
    [message, setMessage] = useState(""),
    [uploading, setUploading] = useState(false);
  const products = useMemo(
    () =>
      settings.printProducts.filter(
        (p) =>
          p.isHundredWindowsProduct &&
          p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [settings, search],
  );
  const selected = settings.printProducts.find((p) => p.id === productId);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("productId", "hundred-windows-hero");
      const password = sessionStorage.getItem("aida-admin-password") || "";
      const response = await fetch("/api/admin/product-media", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const result = await response.json();
      if (!response.ok || !result.imageUrl)
        throw new Error(result.error || "Hero upload failed");
      setHeroImageUrl(result.imageUrl);
      setHeroUpdatedAt(new Date().toISOString());
      setMessage("New project cover uploaded. Save the project to publish it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hero upload failed");
    } finally {
      setUploading(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(day) || day < 1 || day > 100) {
      setMessage("Current day must be a whole number from 1 to 100.");
      return;
    }
    const next = {
      ...settings,
      hundredWindows: {
        currentDay: day,
        currentProductId: productId || null,
        heroImageUrl: heroImageUrl || null,
        heroUpdatedAt: heroUpdatedAt || null,
      },
    };
    await saveShopSettingsAndWait(next);
    setSettings(next);
    setMessage("100 Windows project saved.");
  }
  const heroSrc = heroImageUrl
    ? `${heroImageUrl}${heroImageUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(heroUpdatedAt || "current")}`
    : "";
  return (
    <AdminLayout title="100 Windows">
      <form onSubmit={save} className="max-w-4xl space-y-6">
        <section className="border border-ink/10 bg-paper p-6">
          <p className="text-xs font-bold tracking-[.18em] text-coral">
            100 WINDOWS / 100 DAYS
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <strong className="font-serif text-3xl">
                Day {String(day).padStart(2, "0")} / 100
              </strong>
              <p>{day}% complete</p>
            </div>
            <div>
              <strong>
                {
                  settings.printProducts.filter(
                    (p) => p.isHundredWindowsProduct,
                  ).length
                }{" "}
                project prints
              </strong>
              <p className="text-sm text-ink/55">Ordered by creation date</p>
            </div>
            <div className="flex gap-3">
              {selected?.imageUrl && (
                <img
                  className="h-16 w-16 object-contain"
                  src={selected.imageUrl}
                  alt=""
                />
              )}
              <div>
                <strong>
                  {selected?.name || "No current window selected"}
                </strong>
                {selected && (
                  <p className="text-sm">
                    International:{" "}
                    {selected.fourthwallProductId
                      ? "Connected to Fourthwall ✓"
                      : "Not connected"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="border border-ink/10 bg-paper p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
            Project status
          </p>
          <label className="mt-4 block font-semibold">
            Current day
            <input
              className="admin-input max-w-48"
              type="number"
              min="1"
              max="100"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            />
            <span className="mt-2 block text-sm text-ink/55">
              DAY {String(day).padStart(2, "0")} / 100 · {day}% complete
            </span>
          </label>
        </section>
        <section className="border border-ink/10 bg-paper p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
            Today’s window
          </p>
          <div className="mt-4 flex items-center gap-4">
            {selected?.imageUrl && (
              <img
                className="h-20 w-20 object-contain"
                src={selected.imageUrl}
                alt=""
              />
            )}
            <div>
              <strong className="font-serif text-xl">
                {selected?.name || "Choose today’s product"}
              </strong>
              <p className="text-sm text-ink/55">
                This product is independent from the project Hero.
              </p>
            </div>
          </div>
          <label className="mt-5 block font-semibold">
            Search project products
            <input
              className="admin-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product title"
            />
          </label>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {products.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 border p-3 ${productId === p.id ? "border-coral bg-coral/5" : "border-ink/10"}`}
              >
                <input
                  type="radio"
                  name="current-window"
                  checked={productId === p.id}
                  onChange={() => setProductId(p.id)}
                />
                {p.imageUrl ? (
                  <img
                    className="h-14 w-14 object-contain"
                    src={p.imageUrl}
                    alt=""
                  />
                ) : (
                  <span className="h-14 w-14 bg-ink/5" />
                )}
                <span>
                  <strong className="block">{p.name}</strong>
                  <small>
                    {p.status} · {p.available ? "Available" : "Unavailable"}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {!products.length && (
            <p className="mt-3 bg-[#f3efe6] p-4">
              No matching project products. Enable “Part of 100 Windows / 100
              Days” in a Prints & Goods product first.
            </p>
          )}
          {selected && !selected.isHundredWindowsProduct && (
            <p role="alert" className="mt-3 text-coral">
              The selected product is no longer marked as part of this project.
            </p>
          )}
        </section>
        <section className="border border-ink/10 bg-paper p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
            Project Hero
          </p>
          <h2 className="mt-2 font-serif text-2xl">Hero cover image</h2>
          <p className="mt-1 text-sm text-ink/55">
            Used as the main visual for the 100 Windows project page. Replace it
            as the project moves to a new day.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-[240px_1fr]">
            {heroSrc ? (
              <img
                className="h-72 w-full bg-[#f3efe6] object-contain p-2"
                src={heroSrc}
                alt="Current 100 Windows project cover"
              />
            ) : (
              <div className="grid h-72 place-items-center bg-[#f3efe6] text-sm text-ink/50">
                No project cover uploaded
              </div>
            )}
            <div>
              <strong>Current project cover</strong>
              <label className="button-primary mt-4 inline-flex cursor-pointer">
                {uploading ? "Uploading…" : "Replace image"}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>
              {heroImageUrl && (
                <button
                  type="button"
                  className="button-secondary mt-3 block"
                  onClick={() => {
                    setHeroImageUrl("");
                    setHeroUpdatedAt(new Date().toISOString());
                  }}
                >
                  Remove image
                </button>
              )}
              <p className="mt-4 text-xs text-ink/50">
                The upload is optimized to WebP with a maximum 2000px longest
                side. Replacing it changes only this project reference; shared
                Media Library images are never deleted.
              </p>
            </div>
          </div>
        </section>
        <button className="button-primary">Save project</button>
        {message && (
          <p role="status" className="border border-ink/10 bg-paper p-3">
            {message}
          </p>
        )}
      </form>
    </AdminLayout>
  );
}
