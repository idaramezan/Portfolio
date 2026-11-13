import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useServerNow } from "@/hooks/use-server-now";
import {
  HOMEPAGE_PAGES,
  homepagePageLabel,
  resolveHomepagePage,
} from "@/lib/homepage-mode";
import {
  loadShopSettings,
  saveShopSettingsAndWait,
  type HomepageSourceSettings,
  type ShopSettings,
} from "@/lib/store";

const SITE_TIME_ZONE = "Europe/Istanbul";
const field = "mt-2 min-h-11 w-full border border-ink/20 bg-paper px-3";

function toSiteLocal(iso: string) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(" ", "T");
}

function fromSiteLocal(value: string) {
  if (!value) return "";
  const parsed = new Date(`${value}:00+03:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
}

export default function HomepageSettings() {
  const [settings, setSettings] = useState<ShopSettings>(loadShopSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const now = useServerNow();
  const source = settings.homepageContent.source;
  const activePage = resolveHomepagePage(source, now);

  const update = (changes: Partial<HomepageSourceSettings>) =>
    setSettings((current) => ({
      ...current,
      homepageContent: {
        ...current.homepageContent,
        source: { ...current.homepageContent.source, ...changes },
      },
    }));

  const save = async (next = settings) => {
    setSaving(true);
    setMessage("");
    try {
      await saveShopSettingsAndWait(next);
      setSettings(next);
      setMessage("Homepage settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Homepage settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const restoreDefault = () => {
    const next = {
      ...settings,
      homepageContent: {
        ...settings.homepageContent,
        source: { ...source, mode: "default" as const, scheduleEnabled: false },
      },
    };
    void save(next);
  };

  const status = source.mode === "default"
    ? "Default homepage is live"
    : activePage
      ? `${homepagePageLabel(activePage)} is live on the homepage`
      : source.scheduleEnabled
        ? "Default homepage is live; the alternate page is outside its schedule"
        : "Default homepage is live";

  return (
    <AdminLayout
      title="Homepage Settings"
      actions={<button className="button-primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>}
    >
      {message && <p className="mb-5 border border-ink/15 bg-paper px-4 py-3 text-sm" role="status">{message}</p>}
      <section className="border border-ink/10 bg-paper p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Current status</p>
        <h2 className="mt-2 font-serif text-2xl">{status}</h2>
        <p className="mt-2 text-sm text-ink/60">The public URL remains / and homepage SEO remains unchanged.</p>
        <button className="mt-5 border border-ink/20 px-4 py-2 text-sm font-semibold" onClick={restoreDefault} disabled={saving}>Return to default homepage</button>
      </section>

      <section className="mt-6 border border-ink/10 bg-paper p-5 sm:p-7">
        <h2 className="font-serif text-2xl">Content mode</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer gap-3 border border-ink/15 p-4">
            <input type="radio" name="mode" checked={source.mode === "default"} onChange={() => update({ mode: "default" })} />
            <span><strong className="block">Default homepage</strong><small className="text-ink/60">Use the curated homepage content.</small></span>
          </label>
          <label className="flex cursor-pointer gap-3 border border-ink/15 p-4">
            <input type="radio" name="mode" checked={source.mode === "page"} onChange={() => update({ mode: "page" })} />
            <span><strong className="block">Use another page</strong><small className="text-ink/60">Mount an existing page at / without redirecting.</small></span>
          </label>
        </div>

        <label className="mt-6 block text-sm font-semibold">Page
          <select className={field} value={source.page} onChange={(event) => update({ page: event.target.value as HomepageSourceSettings["page"] })} disabled={source.mode !== "page"}>
            {HOMEPAGE_PAGES.map((page) => <option value={page.value} key={page.value}>{page.label} · {page.canonicalPath}</option>)}
          </select>
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <a className="border border-ink/20 px-4 py-2 text-sm font-semibold" href={`/?homepage-preview=${source.page}`} target="_blank" rel="noreferrer">Preview selected homepage</a>
          <a className="px-4 py-2 text-sm font-semibold underline" href={HOMEPAGE_PAGES.find((page) => page.value === source.page)?.canonicalPath} target="_blank" rel="noreferrer">Open standalone page</a>
        </div>
      </section>

      <section className="mt-6 border border-ink/10 bg-paper p-5 sm:p-7">
        <h2 className="font-serif text-2xl">Publishing schedule</h2>
        <p className="mt-1 text-sm text-ink/60">Times use the site timezone: {SITE_TIME_ZONE} (UTC+3).</p>
        <label className="mt-5 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={source.scheduleEnabled} onChange={(event) => update({ scheduleEnabled: event.target.checked })} /> Schedule this homepage mode</label>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Start
            <input type="datetime-local" className={field} value={toSiteLocal(source.startAt)} onChange={(event) => update({ startAt: fromSiteLocal(event.target.value) })} disabled={!source.scheduleEnabled} />
          </label>
          <label className="text-sm font-semibold">End (optional)
            <input type="datetime-local" className={field} value={toSiteLocal(source.endAt)} onChange={(event) => update({ endAt: fromSiteLocal(event.target.value) })} disabled={!source.scheduleEnabled} />
          </label>
        </div>
      </section>
    </AdminLayout>
  );
}
