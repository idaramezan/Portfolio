import { FormEvent, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { loadShopSettings, saveShopSettingsAndWait } from "@/lib/store";
export default function HundredWindowsAdmin() {
  const [settings, setSettings] = useState(loadShopSettings);
  const [day, setDay] = useState(settings.hundredWindows?.currentDay || 1);
  const [productId, setProductId] = useState(
    settings.hundredWindows?.currentProductId || "",
  );
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
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
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(day) || day < 1 || day > 100) {
      setMessage("Current day must be a whole number from 1 to 100.");
      return;
    }
    const next = {
      ...settings,
      hundredWindows: { currentDay: day, currentProductId: productId || null },
    };
    await saveShopSettingsAndWait(next);
    setSettings(next);
    setMessage("100 Windows project saved.");
  }
  return (
    <AdminLayout title="100 Windows">
      <form onSubmit={save} className="max-w-4xl space-y-6">
        <section className="rounded border border-ink/10 bg-paper p-6">
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
        <section className="space-y-5 rounded border border-ink/10 bg-paper p-6">
          <label className="block font-semibold">
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
          <label className="block font-semibold">
            Search project prints
            <input
              className="admin-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product title"
            />
          </label>
          <fieldset>
            <legend className="mb-2 font-semibold">Today’s window</legend>
            <div className="max-h-80 space-y-2 overflow-y-auto">
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
              <p className="rounded bg-[#f3efe6] p-4">
                No matching project prints. Enable “Part of 100 Windows / 100
                Days” in a Prints & Goods product first.
              </p>
            )}
            {selected && !selected.isHundredWindowsProduct && (
              <p role="alert" className="mt-3 text-coral">
                The selected product is no longer marked as part of this
                project. Choose another product.
              </p>
            )}
          </fieldset>
        </section>
        <button className="button-primary">Save project</button>
        {message && <p role="status">{message}</p>}
      </form>
    </AdminLayout>
  );
}
