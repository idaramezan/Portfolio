import { useEffect, useState } from "react";
import { Plus, Ticket, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

type DiscountCode = {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  max_uses: number | null;
  usage_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  id: string | null;
  code: string;
  discountPercent: string;
  limited: boolean;
  maxUses: string;
  expiring: boolean;
  expiresAt: string;
  isActive: boolean;
  usageCount: number;
};

const emptyForm: FormState = {
  id: null,
  code: "",
  discountPercent: "10",
  limited: false,
  maxUses: "",
  expiring: false,
  expiresAt: "",
  isActive: true,
  usageCount: 0,
};

const dateInputValue = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
      })
    : "";

function effectiveStatus(code: DiscountCode) {
  if (!code.is_active) return "Inactive";
  if (code.expires_at && new Date(code.expires_at) <= new Date())
    return "Expired";
  if (code.max_uses !== null && code.usage_count >= code.max_uses)
    return "Limit reached";
  return "Active";
}

export default function DiscountCodes() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const headers = {
    "content-type": "application/json",
    "x-admin-password": password,
  };
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/checkout/discount-codes", {
      headers,
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Discount codes could not be loaded.");
    setCodes(result.discountCodes);
  };

  useEffect(() => {
    void load().catch((reason) => setError(reason.message));
  }, []);

  const edit = (code: DiscountCode) =>
    setForm({
      id: code.id,
      code: code.code,
      discountPercent: String(code.discount_percent),
      limited: code.max_uses !== null,
      maxUses: code.max_uses === null ? "" : String(code.max_uses),
      expiring: Boolean(code.expires_at),
      expiresAt: dateInputValue(code.expires_at),
      isActive: code.is_active,
      usageCount: code.usage_count,
    });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (
      form.id &&
      !form.isActive &&
      form.usageCount > 0 &&
      codes.find((code) => code.id === form.id)?.is_active &&
      !confirm(
        `Deactivate ${form.code}?\n\nThis code will stop working for new orders. Existing orders will not change.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    const response = await fetch(
      form.id
        ? `/api/admin/checkout/discount-codes/${form.id}`
        : "/api/admin/checkout/discount-codes",
      {
        method: form.id ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          code: form.code,
          discountPercent: Number(form.discountPercent),
          maxUses: form.limited ? Number(form.maxUses) : null,
          expiresAt: form.expiring ? form.expiresAt : null,
          isActive: form.isActive,
        }),
      },
    );
    const result = await response.json();
    setBusy(false);
    if (!response.ok)
      return setError(result.error || "The code could not be saved.");
    setMessage(form.id ? "Discount code updated." : "Discount code created.");
    setForm(null);
    await load();
  };

  const remove = async (code: DiscountCode) => {
    const wording =
      code.usage_count > 0
        ? `Archive ${code.code}? It will stop working for new orders. Existing orders will not change.`
        : `Delete ${code.code}?`;
    if (!confirm(wording)) return;
    const response = await fetch(
      `/api/admin/checkout/discount-codes/${code.id}`,
      {
        method: "DELETE",
        headers,
      },
    );
    const result = await response.json();
    if (!response.ok)
      return setError(result.error || "The code could not be removed.");
    setMessage(
      code.usage_count > 0
        ? "Discount code archived."
        : "Discount code deleted.",
    );
    await load();
  };

  return (
    <AdminLayout
      title="Discount Codes"
      actions={
        <button
          className="admin-button flex items-center gap-2"
          onClick={() => setForm({ ...emptyForm })}
        >
          <Plus size={16} /> New discount code
        </button>
      }
    >
      <div className="space-y-6">
        <p className="max-w-2xl text-ink/65">
          Create percentage discounts for orders placed through the Türkiye
          shop.
        </p>
        {message && (
          <p role="status" className="border border-green/25 bg-green/10 p-3">
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="border border-coral/30 bg-paper p-3 text-coral"
          >
            {error}
          </p>
        )}

        {form && (
          <form
            onSubmit={save}
            className="border border-ink/10 bg-paper p-5 md:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{form.id ? "Edit code" : "New code"}</p>
                <h2 className="mt-2 font-serif text-3xl">
                  {form.id ? form.code : "Create a discount code"}
                </h2>
              </div>
              <button
                type="button"
                className="button-link"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink/45">
                  Code
                </h3>
                <label className="mt-3 block text-sm font-semibold">
                  Discount code
                  <input
                    className="admin-input mt-1 uppercase"
                    required
                    disabled={Boolean(form.id)}
                    pattern="[A-Za-z0-9-]+"
                    placeholder="e.g. AIDA10"
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                  />
                </label>
                <p className="mt-1 text-xs text-ink/55">
                  Codes are not case-sensitive. Use letters, numbers and
                  hyphens.
                </p>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink/45">
                  Discount
                </h3>
                <label className="mt-3 block text-sm font-semibold">
                  Discount percentage
                  <span className="mt-1 flex items-center gap-2">
                    <input
                      className="admin-input"
                      required
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={form.discountPercent}
                      onChange={(e) =>
                        setForm({ ...form, discountPercent: e.target.value })
                      }
                    />
                    <strong>%</strong>
                  </span>
                </label>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink/45">
                  Usage
                </h3>
                <label className="mt-3 flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    checked={!form.limited}
                    onChange={() =>
                      setForm({ ...form, limited: false, maxUses: "" })
                    }
                  />{" "}
                  Unlimited uses
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    checked={form.limited}
                    onChange={() => setForm({ ...form, limited: true })}
                  />{" "}
                  Limit number of orders
                </label>
                {form.limited && (
                  <label className="mt-2 block text-sm font-semibold">
                    Maximum uses
                    <input
                      className="admin-input mt-1"
                      required
                      type="number"
                      min={Math.max(1, form.usageCount)}
                      step="1"
                      value={form.maxUses}
                      onChange={(e) =>
                        setForm({ ...form, maxUses: e.target.value })
                      }
                    />
                  </label>
                )}
                {form.id && (
                  <p className="mt-2 text-sm">
                    Used on <strong>{form.usageCount}</strong> order
                    {form.usageCount === 1 ? "" : "s"}.
                  </p>
                )}
                <p className="mt-2 text-xs text-ink/55">
                  One use is counted when an order is successfully submitted.
                </p>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink/45">
                  Expiration
                </h3>
                <label className="mt-3 flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    checked={!form.expiring}
                    onChange={() =>
                      setForm({ ...form, expiring: false, expiresAt: "" })
                    }
                  />{" "}
                  No expiration
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    checked={form.expiring}
                    onChange={() => setForm({ ...form, expiring: true })}
                  />{" "}
                  Set expiration date
                </label>
                {form.expiring && (
                  <label className="mt-2 block text-sm font-semibold">
                    Expiration date
                    <input
                      className="admin-input mt-1"
                      required
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) =>
                        setForm({ ...form, expiresAt: e.target.value })
                      }
                    />
                  </label>
                )}
                <p className="mt-2 text-xs text-ink/55">
                  Expiration is at the end of the selected day in Istanbul.
                </p>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink/45">
                  Status
                </h3>
                <label className="mt-3 flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />{" "}
                  <strong>Active</strong>
                </label>
              </section>
            </div>
            <button disabled={busy} className="admin-button mt-7">
              {busy
                ? "Saving…"
                : form.id
                  ? "Save changes"
                  : "Create discount code"}
            </button>
          </form>
        )}

        {!codes.length && !form ? (
          <section className="border border-dashed border-ink/20 bg-paper p-10 text-center">
            <Ticket className="mx-auto" />
            <h2 className="mt-4 font-serif text-3xl">No discount codes yet.</h2>
            <p className="mx-auto mt-2 max-w-lg text-ink/60">
              Create a code when you want to offer a percentage off Türkiye shop
              orders.
            </p>
            <button
              className="admin-button mt-5"
              onClick={() => setForm({ ...emptyForm })}
            >
              Create your first code
            </button>
          </section>
        ) : (
          <div className="overflow-x-auto border border-ink/10 bg-paper">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink/45">
                  <th className="p-4">Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Usage</th>
                  <th className="p-4">Expiration</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-b border-ink/10">
                    <td className="p-4 font-bold">{code.code}</td>
                    <td className="p-4">{code.discount_percent}%</td>
                    <td className="p-4">
                      {code.usage_count} / {code.max_uses ?? "Unlimited"}
                    </td>
                    <td className="p-4">
                      {code.expires_at
                        ? new Date(code.expires_at).toLocaleDateString()
                        : "No expiration"}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">
                        {effectiveStatus(code)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          className="button-link"
                          onClick={() => edit(code)}
                        >
                          Edit
                        </button>
                        <button
                          className="button-link text-coral"
                          aria-label={`${code.usage_count ? "Archive" : "Delete"} ${code.code}`}
                          onClick={() => void remove(code)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
