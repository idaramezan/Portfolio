import { useEffect, useState } from "react";
import { Copy, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { useShopSettings } from "@/hooks/use-shop-settings";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const auth = () => ({
  "x-admin-password": sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
});
const initial = {
  internalName: "",
  slug: "",
  status: "draft",
  startAt: "",
  endAt: "",
  timezone: "Europe/Istanbul",
  englishEyebrow: "NEW STICKER PACK",
  englishTitle: "A new sticker pack just landed.",
  englishDescription: "Small studio-made stickers created from Aida’s artwork.",
  turkishEyebrow: "YENİ STICKER PAKETİ",
  turkishTitle: "Yeni sticker paketi geldi.",
  turkishDescription:
    "Aida’nın eserlerinden hazırlanan, stüdyodan çıkan küçük stickerlar.",
  animationDurationMs: 3000,
  maximumDesktopStickers: 12,
  maximumMobileStickers: 7,
  showOnHomepage: true,
  showOnTurkiyeShop: true,
  showOnInternationalShop: true,
  showOnOtherStorefrontPages: true,
  frequencyMode: "once_per_campaign",
  repeatAfterDays: 7,
  turkiyeEnabled: true,
  turkiyeDestinationType: "local_product",
  turkiyeLocalProductId: "",
  turkiyeCustomProductUrl: "",
  internationalEnabled: true,
  internationalDestinationType: "fourthwall_product",
  internationalLocalProductId: "",
  internationalFourthwallProductId: "",
  internationalExternalProductUrl: "",
};
const camel = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, x) => x.toUpperCase()),
      value,
    ]),
  );
const localTime = (value: string) =>
  value
    ? new Date(value)
        .toLocaleString("sv-SE", { timeZone: "Europe/Istanbul" })
        .slice(0, 16)
    : "";
const bodyFor = (form: typeof initial) => {
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 86400000);
  return {
    ...form,
    startAt: form.startAt
      ? new Date(`${form.startAt}:00+03:00`).toISOString()
      : now.toISOString(),
    endAt: form.endAt
      ? new Date(`${form.endAt}:00+03:00`).toISOString()
      : later.toISOString(),
  };
};

export function StickerDropList() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [error, setError] = useState("");
  const load = () =>
    fetch("/api/sticker-drops", { headers: auth(), cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setCampaigns(result.campaigns || []);
      })
      .catch((reason) => setError(reason.message));
  useEffect(() => {
    void load();
  }, []);
  const duplicate = async (id: string) => {
    await fetch(`/api/sticker-drops/${id}/duplicate`, {
      method: "POST",
      headers: auth(),
    });
    load();
  };
  return (
    <AdminLayout
      title="Sticker Drop"
      actions={
        <Link href="/admin/sticker-drop/new" className="button-primary">
          <Plus size={16} /> Create Sticker Drop
        </Link>
      }
    >
      <p className="text-sm text-ink/60">
        Schedule playful sticker launches for the storefront.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-coral">
          {error}
        </p>
      )}
      <section className="mt-6 overflow-x-auto border border-ink/10 bg-paper">
        {!campaigns.length ? (
          <div className="p-8">
            <h2 className="font-serif text-2xl">No sticker drops yet.</h2>
            <p className="mt-2 text-sm text-ink/60">
              Create a timed campaign to introduce a new sticker pack.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#f3efe6] text-xs uppercase tracking-wider text-ink/50">
              <tr>
                {[
                  "Campaign",
                  "Status",
                  "Schedule",
                  "PNGs",
                  "Markets",
                  "Updated",
                  "Actions",
                ].map((x) => (
                  <th className="px-4 py-3" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-4 font-semibold">{c.internal_name}</td>
                  <td className="px-4 py-4 capitalize">{c.status}</td>
                  <td className="px-4 py-4">
                    {new Date(c.start_at).toLocaleString()}
                    <br />
                    {new Date(c.end_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-4">{c.asset_count}</td>
                  <td className="px-4 py-4">
                    {c.turkiye_enabled && "TR "}
                    {c.international_enabled && "International"}
                  </td>
                  <td className="px-4 py-4">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/sticker-drop/${c.id}`}
                        className="admin-button"
                      >
                        Edit
                      </Link>
                      <button
                        className="admin-button"
                        aria-label={`Duplicate ${c.internal_name}`}
                        onClick={() => void duplicate(c.id)}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminLayout>
  );
}

export function StickerDropEditor({ id }: { id: "new" | string }) {
  const [, navigate] = useLocation();
  const settings = useShopSettings();
  const products = settings.printProducts.filter(
    (product) =>
      product.category === "sticker" &&
      !["draft", "archived"].includes(product.status),
  );
  const [form, setForm] = useState<any>(initial);
  const [assets, setAssets] = useState<any[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(
    id === "new" ? null : id,
  );
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const set = (key: string, value: unknown) =>
    setForm((current: any) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (id === "new") return;
    fetch(`/api/sticker-drops/${id}`, { headers: auth() })
      .then((response) => response.json())
      .then((result) => {
        const next: any = camel(result.campaign);
        next.startAt = localTime(result.campaign.start_at);
        next.endAt = localTime(result.campaign.end_at);
        setForm(next);
        setAssets(
          (result.assets || []).map((asset: any) => ({
            ...camel(asset),
            altText: asset.alt_text || "",
          })),
        );
      });
  }, [id]);
  const save = async (status = form.status) => {
    setError("");
    const response = await fetch(
      campaignId ? `/api/sticker-drops/${campaignId}` : "/api/sticker-drops",
      {
        method: campaignId ? "PUT" : "POST",
        headers: { ...auth(), "Content-Type": "application/json" },
        body: JSON.stringify(bodyFor({ ...form, status })),
      },
    );
    const result = await response.json();
    if (!response.ok)
      return setError((result.errors || [result.error]).join(" · "));
    setNotice(result.warning || "Campaign saved.");
    setForm((current: any) => ({ ...current, status: result.campaign.status }));
    if (!campaignId) {
      setCampaignId(result.campaign.id);
      navigate(`/admin/sticker-drop/${result.campaign.id}`);
    }
  };
  const upload = async (files: FileList) => {
    setError("");
    setNotice("Preparing campaign and uploading sticker PNGs…");
    let uploadCampaignId = campaignId;
    if (!uploadCampaignId) {
      const temporaryName =
        form.internalName.trim() ||
        `Sticker Drop ${new Date().toLocaleDateString("en-CA")}`;
      const temporarySlug =
        form.slug.trim() ||
        `${temporaryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
      try {
        const draftResponse = await fetch("/api/sticker-drops", {
          method: "POST",
          headers: { ...auth(), "Content-Type": "application/json" },
          body: JSON.stringify(
            bodyFor({
              ...form,
              internalName: temporaryName,
              slug: temporarySlug,
              status: "draft",
            }),
          ),
        });
        const draftResult = await draftResponse.json();
        if (!draftResponse.ok)
          return setError(
            (draftResult.errors || [draftResult.error]).join(" · "),
          );
        uploadCampaignId = draftResult.campaign.id;
        setCampaignId(uploadCampaignId);
        setForm((current: any) => ({
          ...current,
          internalName: temporaryName,
          slug: temporarySlug,
          status: "draft",
          startAt: localTime(draftResult.campaign.start_at),
          endAt: localTime(draftResult.campaign.end_at),
        }));
        navigate(`/admin/sticker-drop/${uploadCampaignId}`);
      } catch {
        return setError("The campaign draft could not be created.");
      }
    }
    const data = new FormData();
    Array.from(files).forEach((file) => data.append("stickers", file));
    try {
      const response = await fetch(
        `/api/sticker-drops/${uploadCampaignId}/assets`,
        { method: "POST", headers: auth(), body: data },
      );
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };
      if (!response.ok)
        return setError(
          result.error ||
            "Sticker upload failed. Each file must be a transparent PNG under 5 MB.",
        );
      setAssets((current) => [...current, ...result.assets]);
      setNotice(
        `${result.assets.length} sticker PNG${result.assets.length === 1 ? "" : "s"} uploaded.`,
      );
    } catch {
      setError("Sticker upload could not reach the server. Please try again.");
    }
  };
  const remove = async (assetId: string) => {
    await fetch(`/api/sticker-drops/${campaignId}/assets/${assetId}`, {
      method: "DELETE",
      headers: auth(),
    });
    setAssets((current) => current.filter((asset) => asset.id !== assetId));
  };
  const health = [
    form.startAt && form.endAt && form.endAt > form.startAt
      ? "Schedule valid"
      : "Schedule needs attention",
    assets.length ? `${assets.length} PNGs uploaded` : "Upload PNG stickers",
    form.turkiyeLocalProductId
      ? "Türkiye destination valid"
      : "Türkiye destination incomplete",
    form.internationalExternalProductUrl || form.internationalLocalProductId
      ? "International destination valid"
      : "International destination incomplete",
  ];
  return (
    <AdminLayout
      title={campaignId ? "Edit Sticker Drop" : "Create Sticker Drop"}
      actions={
        <Link href="/admin/sticker-drop" className="admin-button">
          Back
        </Link>
      }
    >
      <div aria-live="polite">
        {error && (
          <p role="alert" className="mb-4 text-coral">
            {error}
          </p>
        )}
        {notice && <p className="mb-4 text-green-800">{notice}</p>}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Section title="Campaign">
            <Grid>
              <Field
                label="Internal name"
                value={form.internalName}
                set={(value) => {
                  set("internalName", value);
                  if (!form.slug)
                    set(
                      "slug",
                      value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    );
                }}
              />
              <Field
                label="Slug"
                value={form.slug}
                set={(value) => set("slug", value)}
              />
              <Field
                label="Starts (Istanbul)"
                type="datetime-local"
                value={form.startAt}
                set={(value) => set("startAt", value)}
              />
              <Field
                label="Ends (Istanbul)"
                type="datetime-local"
                value={form.endAt}
                set={(value) => set("endAt", value)}
              />
            </Grid>
          </Section>
          <Section title="Public copy">
            <h3 className="font-semibold">English</h3>
            <Grid>
              <Field
                label="Eyebrow"
                value={form.englishEyebrow}
                set={(v) => set("englishEyebrow", v)}
              />
              <Field
                label="Title"
                value={form.englishTitle}
                set={(v) => set("englishTitle", v)}
              />
            </Grid>
            <Text
              label="Description"
              value={form.englishDescription}
              set={(v) => set("englishDescription", v)}
            />
            <h3 className="mt-5 font-semibold">Turkish</h3>
            <Grid>
              <Field
                label="Eyebrow"
                value={form.turkishEyebrow}
                set={(v) => set("turkishEyebrow", v)}
              />
              <Field
                label="Title"
                value={form.turkishTitle}
                set={(v) => set("turkishTitle", v)}
              />
            </Grid>
            <Text
              label="Description"
              value={form.turkishDescription}
              set={(v) => set("turkishDescription", v)}
            />
          </Section>
          <Section title="Falling sticker PNGs">
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center border border-dashed border-ink/25 bg-[#f3efe6] p-5 text-center">
              <ImagePlus />
              <span className="mt-2 font-semibold">
                Choose transparent PNG files
              </span>
              <span className="text-xs text-ink/50">5 MB each, up to 20</span>
              <input
                className="sr-only"
                type="file"
                accept="image/png"
                multiple
                onChange={(event) =>
                  event.target.files && void upload(event.target.files)
                }
              />
            </label>
            {assets.length < 4 && (
              <p className="mt-2 text-sm text-amber-800">
                Four or more stickers are recommended.
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {assets.map((asset) => (
                <div className="border border-ink/10 p-3" key={asset.id}>
                  <img
                    className="mx-auto h-28 w-28 object-contain"
                    src={asset.fileUrl || asset.file_url}
                    alt=""
                  />
                  <button
                    className="admin-button mt-2 w-full"
                    onClick={() => void remove(asset.id)}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
            <Grid>
              <Field
                label="Duration (ms)"
                type="number"
                value={form.animationDurationMs}
                set={(v) => set("animationDurationMs", Number(v))}
              />
              <Field
                label="Desktop maximum"
                type="number"
                value={form.maximumDesktopStickers}
                set={(v) => set("maximumDesktopStickers", Number(v))}
              />
              <Field
                label="Mobile maximum"
                type="number"
                value={form.maximumMobileStickers}
                set={(v) => set("maximumMobileStickers", Number(v))}
              />
            </Grid>
          </Section>
          <Section title="Türkiye destination">
            <Check
              label="Enabled"
              checked={form.turkiyeEnabled}
              set={(v) => set("turkiyeEnabled", v)}
            />
            <ProductSelect
              products={products}
              value={form.turkiyeLocalProductId}
              set={(v) => set("turkiyeLocalProductId", v)}
            />
          </Section>
          <Section title="International destination">
            <Check
              label="Enabled"
              checked={form.internationalEnabled}
              set={(v) => set("internationalEnabled", v)}
            />
            <Select
              label="Destination type"
              value={form.internationalDestinationType}
              set={(v) => set("internationalDestinationType", v)}
              options={[
                ["fourthwall_product", "Fourthwall product"],
                ["external_url", "External URL"],
                ["local_product", "Local product"],
              ]}
            />
            {form.internationalDestinationType === "local_product" ? (
              <ProductSelect
                products={products}
                value={form.internationalLocalProductId}
                set={(v) => set("internationalLocalProductId", v)}
              />
            ) : (
              <Field
                label="External HTTPS product URL"
                value={form.internationalExternalProductUrl}
                set={(v) => set("internationalExternalProductUrl", v)}
              />
            )}
          </Section>
          <Section title="Placement and frequency">
            <div className="grid sm:grid-cols-2">
              <Check
                label="Homepage"
                checked={form.showOnHomepage}
                set={(v) => set("showOnHomepage", v)}
              />
              <Check
                label="Türkiye shop"
                checked={form.showOnTurkiyeShop}
                set={(v) => set("showOnTurkiyeShop", v)}
              />
              <Check
                label="International shop"
                checked={form.showOnInternationalShop}
                set={(v) => set("showOnInternationalShop", v)}
              />
              <Check
                label="Other storefront pages"
                checked={form.showOnOtherStorefrontPages}
                set={(v) => set("showOnOtherStorefrontPages", v)}
              />
            </div>
            <Select
              label="Visitor frequency"
              value={form.frequencyMode}
              set={(v) => set("frequencyMode", v)}
              options={[
                ["once_per_campaign", "Once per campaign"],
                ["once_per_session", "Once per session"],
                ["repeat_after_days", "Repeat after days"],
              ]}
            />
            {form.frequencyMode === "repeat_after_days" && (
              <Field
                label="Repeat after days"
                type="number"
                value={form.repeatAfterDays}
                set={(v) => set("repeatAfterDays", Number(v))}
              />
            )}
          </Section>
        </div>
        <aside>
          <Section title="Campaign health">
            <ul className="space-y-2 text-sm">
              {health.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </Section>
          <div className="mt-4 grid gap-2">
            <button className="admin-button" onClick={() => void save("draft")}>
              Save draft
            </button>
            <button
              className="button-primary"
              onClick={() => void save("scheduled")}
            >
              Publish campaign
            </button>
            <button
              className="admin-button"
              onClick={() => void save("paused")}
            >
              Pause campaign
            </button>
            <button
              className="admin-button"
              onClick={() => void save("archived")}
            >
              Archive
            </button>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-ink/10 bg-paper p-5">
      <h2 className="mb-4 font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({
  label,
  value,
  set,
  type = "text",
}: {
  label: string;
  value: any;
  set: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="mt-3 block text-sm font-semibold">
      {label}
      <input
        className="admin-input"
        type={type}
        value={value ?? ""}
        onChange={(event) => set(event.target.value)}
      />
    </label>
  );
}
function Text({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
}) {
  return (
    <label className="mt-3 block text-sm font-semibold">
      {label}
      <textarea
        className="admin-input min-h-24"
        value={value}
        onChange={(event) => set(event.target.value)}
      />
    </label>
  );
}
function Check({
  label,
  checked,
  set,
}: {
  label: string;
  checked: boolean;
  set: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => set(event.target.checked)}
      />
      {label}
    </label>
  );
}
function Select({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="mt-3 block text-sm font-semibold">
      {label}
      <select
        className="admin-input"
        value={value}
        onChange={(event) => set(event.target.value)}
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
function ProductSelect({
  products,
  value,
  set,
}: {
  products: any[];
  value: string;
  set: (value: string) => void;
}) {
  return (
    <label className="mt-3 block text-sm font-semibold">
      Published sticker product
      <select
        className="admin-input"
        value={value || ""}
        onChange={(event) => set(event.target.value)}
      >
        <option value="">Choose a sticker product</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} · {product.available ? "Available" : "Sold out"}
          </option>
        ))}
      </select>
    </label>
  );
}
