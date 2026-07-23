import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { loadShopSettings, saveShopSettings } from "@/lib/store";
import { clearManualCurrencyRate, getManualCurrencyRate, saveManualCurrencyRate } from "@/lib/currency";
const field = "mt-2 h-11 w-full border border-ink/15 bg-paper px-3";
export default function SettingsPage({
  section,
}: {
  section: "whatsapp" | "currency" | "fourthwall" | "links" | "site";
}) {
  const [settings, setSettings] = useState(loadShopSettings());
  const [status, setStatus] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [currencyMessage, setCurrencyMessage] = useState("");
  useEffect(() => {
    if (section === "fourthwall")
      fetch("/api/admin/international/status")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => setStatus({ error: true }));
    if (section === "currency")
      {
      const manual = getManualCurrencyRate();
      if (manual) setStatus({ ...manual, provider: "Manual admin override", isManual: true, isFallback: false });
      fetch("/api/currency")
        .then((r) => r.json())
        .then((data) => { if (!getManualCurrencyRate()) setStatus(data); })
        .catch(() => { if (!getManualCurrencyRate()) setStatus({ error: true }); });
      }
  }, [section]);
  const save = () => {
    saveShopSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const title =
    section === "links"
      ? "Link Hub & Social"
      : section[0].toUpperCase() + section.slice(1);
  return (
    <AdminLayout
      title={title}
      actions={
        !["currency", "fourthwall"].includes(section) ? (
          <button onClick={save} className="button-primary">
            Save settings
          </button>
        ) : undefined
      }
    >
      <p
        aria-live="polite"
        className="mb-4 min-h-5 text-sm font-semibold text-green"
      >
        {saved ? "Settings saved" : ""}
      </p>
      {section === "whatsapp" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Connection">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={settings.whatsapp.enabled}
                onChange={(e) =>
                  setSettings((x) => ({
                    ...x,
                    whatsapp: { ...x.whatsapp, enabled: e.target.checked },
                  }))
                }
              />
              Ordering enabled
            </label>
            <label>
              WhatsApp number
              <input
                value={settings.whatsapp.number}
                onChange={(e) =>
                  setSettings((x) => ({
                    ...x,
                    whatsapp: {
                      ...x.whatsapp,
                      number: e.target.value.replace(/\D/g, ""),
                    },
                  }))
                }
                className={field}
              />
              <small className="text-ink/45">
                E.164 digits only. Status:{" "}
                {/^[0-9]{8,15}$/.test(settings.whatsapp.number)
                  ? "Valid"
                  : "Invalid"}
              </small>
            </label>
          </Card>
          <Card title="Message">
            <label>
              Default greeting
              <input
                value={settings.whatsapp.greeting}
                onChange={(e) =>
                  setSettings((x) => ({
                    ...x,
                    whatsapp: { ...x.whatsapp, greeting: e.target.value },
                  }))
                }
                className={field}
              />
            </label>
            <label>
              Reference prefix
              <input
                value={settings.whatsapp.referencePrefix}
                onChange={(e) =>
                  setSettings((x) => ({
                    ...x,
                    whatsapp: {
                      ...x.whatsapp,
                      referencePrefix: e.target.value
                        .replace(/[^A-Z0-9]/gi, "")
                        .toUpperCase(),
                    },
                  }))
                }
                className={field}
              />
            </label>
            <label>
              Shipping note
              <textarea
                value={settings.whatsapp.shippingNote}
                onChange={(e) =>
                  setSettings((x) => ({
                    ...x,
                    whatsapp: { ...x.whatsapp, shippingNote: e.target.value },
                  }))
                }
                className="mt-2 min-h-24 w-full border bg-paper p-3"
              />
            </label>
          </Card>
        </div>
      )}
      {section === "currency" && (
        <div className="grid gap-6 xl:grid-cols-2">
        <Card title="USD to TRY exchange rate">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="Base currency" value="USD" />
            <Item
              label="Current rate"
              value={
                status?.rate
                  ? `1 USD = ${status.rate} TRY`
                  : "Unavailable — storefront uses USD"
              }
            />
            <Item label="Rate date" value={status?.rateDate || "—"} />
            <Item
              label="Provider"
              value={status?.provider || "Not configured"}
            />
            <Item label="Cache" value={status?.isStale ? "Stale" : "Current"} />
            <Item label="Rate source" value={status?.isManual ? "Manual rate" : "Automatic provider"} />
          </dl>
          <button
            onClick={() =>
              fetch("/api/admin/currency/refresh", { method: "POST" })
                .then((r) => r.json())
                .then(setStatus)
            }
            className="button-primary mt-6"
          >
            Refresh now
          </button>
        </Card>
        <Card title="Set the Türkiye originals rate">
          <p className="text-sm leading-relaxed text-ink/60">
            Enter how many Turkish lira equal 1 US dollar. Original prices remain stored in USD; only their Türkiye storefront prices are recalculated.
          </p>
          <label className="mt-5 block font-semibold">
            1 USD equals
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="0.0001"
                max="10000"
                step="0.0001"
                inputMode="decimal"
                value={manualRate}
                onChange={(event) => setManualRate(event.target.value)}
                placeholder={status?.rate ? String(status.rate) : "For example, 43.1254"}
                className={field}
              />
              <span className="font-bold">TRY</span>
            </div>
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="button-primary"
              onClick={async () => {
                setCurrencyMessage("");
                const numericRate = Number(manualRate);
                if (!Number.isFinite(numericRate) || numericRate <= 0 || numericRate > 10000) {
                  setCurrencyMessage("Enter a valid positive USD to TRY rate.");
                  return;
                }
                saveManualCurrencyRate(numericRate);
                const localStatus = { rate: numericRate, rateDate: getManualCurrencyRate()?.rateDate, provider: "Manual admin override", isManual: true, isFallback: false };
                setStatus(localStatus);
                setManualRate("");
                setCurrencyMessage("Rate saved. Türkiye original prices have been updated.");
                window.dispatchEvent(new Event("currency-rate:updated"));
                const response = await fetch("/api/admin/currency/rate", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rate: numericRate }),
                }).catch(() => null);
                if (response?.ok) setStatus(await response.json());
              }}
            >Save manual rate</button>
            {status?.isManual && <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                clearManualCurrencyRate();
                setCurrencyMessage("Automatic exchange rates restored.");
                window.dispatchEvent(new Event("currency-rate:updated"));
                const response = await fetch("/api/admin/currency/rate", { method: "DELETE" }).catch(() => null);
                if (response?.ok) setStatus(await response.json());
                else setStatus({ error: true, isManual: false });
              }}
            >Use automatic rate</button>}
          </div>
          <p aria-live="polite" className={`mt-4 min-h-5 text-sm font-semibold ${currencyMessage.includes("could not") ? "text-coral" : "text-green"}`}>{currencyMessage}</p>
          {status?.rate && <p className="mt-2 text-sm text-ink/55">Current storefront calculation: USD original price × {status.rate}.</p>}
        </Card>
        </div>
      )}
      {section === "fourthwall" && (
        <Card title="Fourthwall connection">
          <p className="mb-5 text-sm text-ink/55">
            Product content, prices and availability are managed in Fourthwall.
            The API token is never displayed.
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item
              label="Integration"
              value={status?.enabled ? "Enabled" : "Disabled"}
            />
            <Item
              label="Storefront token"
              value={status?.tokenConfigured ? "Configured" : "Missing"}
            />
            <Item label="Collection" value={status?.collection || "all"} />
            <Item
              label="Product count"
              value={String(status?.productCount || 0)}
            />
            <Item label="Cache" value={status?.cacheStatus || "Empty"} />
            <Item
              label="Last fetch"
              value={status?.lastSuccessfulSync || "Never"}
            />
          </dl>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() =>
                fetch("/api/admin/international/refresh", { method: "POST" })
                  .then((r) => r.json())
                  .then(setStatus)
              }
              className="button-primary"
            >
              Refresh products
            </button>
            <a href="/shop/international/prints" className="button-secondary">
              Preview International
            </a>
          </div>
        </Card>
      )}
      {section === "links" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Link Hub">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={settings.siteLinks.linkHubEnabled}
                onChange={(e) =>
                  setSettings((x) => ({
                    ...x,
                    siteLinks: {
                      ...x.siteLinks,
                      linkHubEnabled: e.target.checked,
                    },
                  }))
                }
              />
              Link Hub enabled
            </label>
            <label>
              Short description
              <textarea
                value={settings.siteLinks.linkHubDescription}
                onChange={(e) =>
                  setSettings((x) => ({
                    ...x,
                    siteLinks: {
                      ...x.siteLinks,
                      linkHubDescription: e.target.value,
                    },
                  }))
                }
                className="mt-2 min-h-24 w-full border bg-paper p-3"
              />
            </label>
            <a href="/links" className="button-secondary mt-4">
              Preview Link Hub
            </a>
          </Card>
          <Card title="Social links">
            {(
              [
                ["instagramUrl", "Instagram URL"],
                ["instagramHandle", "Instagram handle"],
                ["tiktokUrl", "TikTok URL"],
                ["tiktokHandle", "TikTok handle"],
                ["youtubeUrl", "YouTube URL"],
                ["youtubeLabel", "YouTube channel"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={settings.siteLinks[key]}
                  onChange={(e) =>
                    setSettings((x) => ({
                      ...x,
                      siteLinks: { ...x.siteLinks, [key]: e.target.value },
                    }))
                  }
                  className={field}
                />
              </label>
            ))}
          </Card>
        </div>
      )}
      {section === "site" && (
        <Card title="Site settings">
          <p className="text-sm text-ink/55">
            Public storefront identity and routing settings remain managed in
            the codebase. Additional production settings require server-backed
            persistence.
          </p>
        </Card>
      )}
    </AdminLayout>
  );
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 border border-ink/10 bg-paper p-5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-ink/10 pt-3">
      <dt className="text-xs font-bold uppercase tracking-wider text-ink/45">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
