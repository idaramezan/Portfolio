import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const tabs = [
  ["/admin/analytics", "Overview"],
  ["/admin/analytics/pages", "Pages"],
  ["/admin/analytics/sources", "Sources"],
  ["/admin/analytics/subscribers", "Subscribers"],
  ["/admin/analytics/products", "Products"],
  ["/admin/analytics/geography", "Geography"],
  ["/admin/analytics/links", "Tracked Links"],
] as const;
const auth = () => ({
  "x-admin-password": sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
});
const n = (value: unknown) => Number(value || 0).toLocaleString();
const pct = (a: unknown, b: unknown) =>
  Number(b) ? `${((Number(a) / Number(b)) * 100).toFixed(1)}%` : "0%";
const change = (current: unknown, previous: unknown) => {
  const before = Number(previous || 0);
  if (!before) return Number(current) ? "New in this period" : "No change";
  const value = ((Number(current) - before) / before) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}% vs previous period`;
};

export default function Analytics() {
  const [location] = useLocation();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboard, subscriberData] = await Promise.all([
        fetch(`/api/analytics/dashboard?days=${days}`, {
          headers: auth(),
          cache: "no-store",
        }),
        fetch(`/api/analytics/subscribers?days=${days}`, {
          headers: auth(),
          cache: "no-store",
        }),
      ]);
      if (!dashboard.ok || !subscriberData.ok)
        throw new Error(
          dashboard.status === 401
            ? "Permission denied"
            : "Analytics could not be loaded",
        );
      setData(await dashboard.json());
      setSubscribers((await subscriberData.json()).subscribers || []);
      setNotice("Analytics refreshed.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Analytics could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [days]);
  return (
    <AdminLayout
      title="Studio analytics"
      actions={
        <>
          <select
            className="admin-input !mt-0"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Analytics date range"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={366}>This year</option>
          </select>
          <button className="admin-button" onClick={() => void load()}>
            <RefreshCw size={15} /> Refresh
          </button>
        </>
      }
    >
      <p className="max-w-3xl text-sm text-ink/60">
        See how visitors discover the studio, explore the collection and join
        the Studio Letter.
      </p>
      <nav
        className="mt-5 flex gap-1 overflow-x-auto border-b border-ink/10"
        aria-label="Analytics reports"
      >
        {tabs.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${location === href ? "border-b-2 border-coral text-coral" : "text-ink/60"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div aria-live="polite" className="mt-3 text-sm">
        {notice && !error && <span className="text-green-800">{notice}</span>}
        {error && (
          <span role="alert" className="text-coral">
            {error}
          </span>
        )}
      </div>
      {loading ? (
        <p className="mt-8">Loading analytics…</p>
      ) : !data ? (
        <Empty />
      ) : location.endsWith("/links") ? (
        <TrackedLinks />
      ) : location.endsWith("/subscribers") ? (
        <SubscriberReport rows={subscribers} />
      ) : (
        <Report location={location} data={data} />
      )}
    </AdminLayout>
  );
}

function Empty() {
  return (
    <section className="mt-8 border border-ink/10 bg-paper p-8">
      <h2 className="font-serif text-2xl">
        No analytics have been collected yet.
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Analytics will begin appearing after visitors consent and use the
        storefront.
      </p>
    </section>
  );
}
function Kpi({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="border border-ink/10 bg-paper p-5">
      <p className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">
        {label}
      </p>
      <p className="mt-2 font-serif text-4xl">{value}</p>
      {note && <p className="mt-2 text-xs text-ink/50">{note}</p>}
    </article>
  );
}
function Report({ location, data }: { location: string; data: any }) {
  if (!data.kpis || Number(data.kpis.visitors) === 0) return <Empty />;
  if (location.endsWith("/pages"))
    return (
      <Table
        title="Pages report"
        headers={[
          "Page",
          "Visitors",
          "Views",
          "Subscribers",
          "Basket",
          "WhatsApp",
        ]}
        rows={data.pages.map((x: any) => [
          x.page_title || x.page_path,
          x.visitors,
          x.views,
          x.subscribers,
          x.basket,
          x.whatsapp,
        ])}
      />
    );
  if (location.endsWith("/sources"))
    return (
      <Table
        title="Traffic sources"
        headers={[
          "Source",
          "Visitors",
          "Sessions",
          "Subscribers",
          "Conversion",
          "WhatsApp",
        ]}
        rows={data.sources.map((x: any) => [
          x.source,
          x.visitors,
          x.sessions,
          x.subscribers,
          pct(x.subscribers, x.visitors),
          x.whatsapp,
        ])}
      />
    );
  if (location.endsWith("/products"))
    return (
      <Table
        title="Product performance"
        headers={[
          "Product",
          "Type",
          "Views",
          "Options",
          "Basket",
          "Basket rate",
        ]}
        rows={data.products.map((x: any) => [
          x.entity_name || x.entity_id,
          x.entity_type,
          x.views,
          x.options,
          x.basket,
          pct(x.basket, x.views),
        ])}
      />
    );
  if (location.endsWith("/geography"))
    return (
      <>
        <Table
          title="Approximate geography"
          headers={["Country", "City", "Visitors", "Subscribers", "Conversion"]}
          rows={data.geography.map((x: any) => [
            x.country,
            x.city,
            x.visitors,
            x.subscribers,
            pct(x.subscribers, x.visitors),
          ])}
        />
        <p className="mt-3 text-xs text-ink/50">
          City is approximate. Raw IP addresses are never stored.
        </p>
      </>
    );
  const k = data.kpis;
  const f = data.funnel || {};
  return (
    <>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          label="Tracked visitors"
          value={n(k.visitors)}
          note={`${change(k.visitors, k.previous_visitors)} · Visitors who accepted analytics`}
        />
        <Kpi
          label="Sessions"
          value={n(k.sessions)}
          note={change(k.sessions, k.previous_sessions)}
        />
        <Kpi
          label="Page views"
          value={n(k.page_views)}
          note={change(k.page_views, k.previous_page_views)}
        />
        <Kpi
          label="New subscribers"
          value={n(k.subscribers)}
          note={change(k.subscribers, k.previous_subscribers)}
        />
        <Kpi
          label="Visitor conversion rate"
          value={`${k.conversion_rate}%`}
          note="Subscribers divided by tracked visitors"
        />
        <Kpi
          label="WhatsApp continuations"
          value={n(k.whatsapp)}
          note={change(k.whatsapp, k.previous_whatsapp)}
        />
      </section>
      <section className="mt-6 border border-ink/10 bg-paper p-5">
        <h2 className="font-serif text-2xl">Activity over time</h2>
        <p className="sr-only">
          Daily trend for tracked visitors over the selected period.
        </p>
        <TrendChart rows={data.trends} />
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-2xl">Subscriber funnel</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Tracked visitors" value={n(f.visitors)} />
          <Kpi
            label="Section viewers"
            value={n(f.viewers)}
            note={pct(f.viewers, f.visitors)}
          />
          <Kpi
            label="Form starters"
            value={n(f.starters)}
            note={pct(f.starters, f.viewers)}
          />
          <Kpi
            label="Successful subscribers"
            value={n(f.subscribers)}
            note={pct(f.subscribers, f.starters)}
          />
        </div>
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Table
          title="Top sources"
          headers={["Source", "Visitors", "Subscribers", "Conversion"]}
          rows={data.sources
            .slice(0, 8)
            .map((x: any) => [
              x.source,
              x.visitors,
              x.subscribers,
              pct(x.subscribers, x.visitors),
            ])}
        />
        <Table
          title="Device overview"
          headers={["Device", "Visitors"]}
          rows={data.devices.map((x: any) => [x.device, x.visitors])}
        />
      </section>
      <section className="mt-6 border border-ink/10 bg-paper p-5">
        <h2 className="font-serif text-2xl">Recent activity</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Kpi label="Active sessions" value={n(data.recent.active_sessions)} />
          <Kpi
            label="Popular page"
            value={data.recent.popular_page || "None"}
          />
          <Kpi label="Subscriptions" value={n(data.recent.subscriptions)} />
          <Kpi label="Basket additions" value={n(data.recent.basket)} />
        </div>
      </section>
      <section className="mt-6 border border-ink/10 bg-paper p-5">
        <h2 className="font-serif text-2xl">
          How traffic sources are detected
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          UTM-tagged links give the clearest source reporting. Referrer
          information is used as a fallback. Direct includes visits without a
          detectable campaign or referral source. Some visitors will not be
          counted if they decline analytics.
        </p>
      </section>
    </>
  );
}

function TrendChart({
  rows,
}: {
  rows: Array<{ date: string; visitors: number }>;
}) {
  const values = rows.map((row) => Number(row.visitors));
  const maximum = Math.max(1, ...values);
  const points = rows
    .map((row, index) => {
      const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100;
      const y = 46 - (Number(row.visitors) / maximum) * 40;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="mt-4">
      <svg
        viewBox="0 0 100 50"
        role="img"
        aria-label={`Tracked visitors trend. Highest daily value ${maximum}.`}
        className="h-64 w-full overflow-visible border-b border-l border-ink/15"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#c94f3d"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-ink/45">
        <span>{rows[0]?.date || "No data"}</span>
        <span>{rows.at(-1)?.date || ""}</span>
      </div>
    </div>
  );
}
function Table({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: any[][];
}) {
  return (
    <section className="mt-6 overflow-hidden border border-ink/10 bg-paper">
      <h2 className="p-5 font-serif text-2xl">{title}</h2>
      {!rows.length ? (
        <p className="px-5 pb-5 text-sm text-ink/55">
          No data for this date range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-[#f3efe6] text-xs uppercase tracking-wider text-ink/50">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3">
                      {String(cell ?? "Unknown")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function SubscriberReport({ rows }: { rows: any[] }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter((x) =>
    x.email.toLowerCase().includes(search.toLowerCase()),
  );
  const exportCsv = () => {
    const header = [
      "email",
      "subscribed_at",
      "source",
      "campaign",
      "signup_path",
      "landing_path",
      "country",
      "city",
      "sessions",
      "page_views",
    ];
    const content = [
      header.join(","),
      ...filtered.map((x) =>
        [
          x.email,
          x.subscribed_at,
          x.signup_source,
          x.signup_campaign,
          x.signup_path,
          x.signup_landing_path,
          x.country_name,
          x.city,
          x.sessions_before_subscription,
          x.page_views_before_subscription,
        ]
          .map((v) => `"${String(v || "").replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscriber-attribution.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        <input
          className="admin-input !mt-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subscriber email"
          aria-label="Search subscriber email"
        />
        <button className="admin-button" onClick={exportCsv}>
          Export filtered CSV
        </button>
      </div>
      <Table
        title="Subscriber attribution"
        headers={[
          "Subscriber",
          "Date",
          "Source",
          "Campaign",
          "Signup page",
          "Landing page",
          "Country",
          "City",
          "Sessions",
          "Views",
        ]}
        rows={filtered.map((x) => [
          x.email,
          x.subscribed_at ? new Date(x.subscribed_at).toLocaleDateString() : "",
          x.signup_source,
          x.signup_campaign,
          x.signup_path,
          x.signup_landing_path,
          x.country_name,
          x.city,
          x.sessions_before_subscription,
          x.page_views_before_subscription,
        ])}
      />
    </>
  );
}
function TrackedLinks() {
  const [destination, setDestination] = useState("https://www.aedaart.com/");
  const [source, setSource] = useState("instagram");
  const [medium, setMedium] = useState("social");
  const [campaign, setCampaign] = useState("profile");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    try {
      const u = new URL(destination);
      u.searchParams.set("utm_source", source);
      u.searchParams.set("utm_medium", medium);
      u.searchParams.set("utm_campaign", campaign);
      if (content) u.searchParams.set("utm_content", content);
      return u.toString();
    } catch {
      return "Enter a valid destination URL";
    }
  }, [destination, source, medium, campaign, content]);
  return (
    <section className="mt-6 max-w-3xl border border-ink/10 bg-paper p-6">
      <h2 className="font-serif text-3xl">Tracked Links</h2>
      <p className="mt-2 text-sm text-ink/60">
        Create a campaign URL for social bios, videos and Studio Letter links.
        This is not a URL shortener.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Destination page"
          value={destination}
          set={setDestination}
        />
        <label className="text-sm font-semibold">
          Preset
          <select
            className="admin-input"
            value={source}
            onChange={(e) => {
              const value = e.target.value;
              setSource(value);
              setMedium(value === "studio_letter" ? "email" : "social");
              setCampaign(value === "studio_letter" ? "newsletter" : "profile");
            }}
          >
            <option value="instagram">Instagram bio</option>
            <option value="tiktok">TikTok profile</option>
            <option value="youtube">YouTube description</option>
            <option value="studio_letter">Studio Letter</option>
            <option value="pinterest">Pinterest</option>
            <option value="other">Other</option>
          </select>
        </label>
        <Field label="Source" value={source} set={setSource} />
        <Field label="Medium" value={medium} set={setMedium} />
        <Field label="Campaign" value={campaign} set={setCampaign} />
        <Field label="Optional content" value={content} set={setContent} />
      </div>
      <div className="mt-5 border border-ink/10 bg-[#f3efe6] p-4 break-all text-sm">
        {url}
      </div>
      <button
        className="button-primary mt-3"
        onClick={() =>
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
        }
      >
        <Copy size={15} />
        {copied ? "Copied" : "Copy tracked URL"}
      </button>
      <p aria-live="polite" className="mt-2 text-sm text-green-800">
        {copied ? "Tracked URL copied." : ""}
      </p>
    </section>
  );
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        className="admin-input"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );
}
