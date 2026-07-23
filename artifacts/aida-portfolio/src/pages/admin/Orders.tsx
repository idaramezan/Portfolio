import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";
import { loadShopSettings, type ManagedProduct, type StudioMailPackage } from "@/lib/store";

type Kind = "original" | "print" | "studio-mail";
type OrderItem = { kind: Kind; productId: string; quantity: number };
type Order = { id: string; order_no: string; customer_name: string; customer_email: string; country_code: string; status: string; items: Array<OrderItem & { name: string; lineTotalMinor: number; currency: string }>; totals: Record<string, number>; created_at: string };
const ORDER_STATUSES = ["order_placed", "packing", "shipping", "cancelled", "returned"];
const STATUS_LABELS: Record<string, string> = { order_placed: "Order Placed", packing: "Packing", shipping: "Shipping", cancelled: "Cancelled", returned: "Returned" };
const REGION_CODES = "AD AE AF AG AI AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW".split(" ");

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", { style: "currency", currency }).format(minor / 100);
}

export default function Orders() {
  const settings = loadShopSettings();
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const products = useMemo(() => ({ original: settings.originalProducts.filter((p) => !["sold", "sold_out", "archived"].includes(p.status) && p.available !== false), print: settings.printProducts, "studio-mail": settings.studioMailPackages }), [settings]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([{ kind: "print", productId: settings.printProducts[0]?.id || "", quantity: 1 }]);
  const [form, setForm] = useState({ customerName: "", customerAddress: "", customerPhone: "", customerEmail: "", countryCode: "TR", status: "order_placed", shippingStatus: "customer_side", shippingPrice: "", shippingCurrency: "TRY", notes: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const countryNames = useMemo(() => new Intl.DisplayNames(["en"], { type: "region" }), []);
  const headers = { "Content-Type": "application/json", "x-admin-password": password };

  const loadOrders = async () => {
    const response = await fetch("/api/admin/orders", { headers, cache: "no-store" });
    if (!response.ok) throw new Error("Orders could not be loaded");
    setOrders((await response.json()).orders);
  };
  useEffect(() => { void loadOrders().catch((error) => setMessage(error.message)); }, []);

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const item of items) {
      const product = (products[item.kind] as Array<ManagedProduct | StudioMailPackage>).find((p) => p.id === item.productId);
      if (!product) continue;
      const currency = product.priceCurrency || (item.kind === "original" ? "USD" : "TRY");
      const price = product.priceMinor ?? product.priceUsdCents;
      result[currency] = (result[currency] || 0) + price * item.quantity;
    }
    if (form.shippingStatus !== "customer_side" && form.shippingPrice) result[form.shippingCurrency] = (result[form.shippingCurrency] || 0) + Math.round(Number(form.shippingPrice) * 100);
    return result;
  }, [items, products, form.shippingStatus, form.shippingPrice, form.shippingCurrency]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/orders", { method: "POST", headers, body: JSON.stringify({ ...form, items }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order could not be created");
      setMessage(result.emailSent ? `Order ${result.order.order_no} created and the customer was emailed.` : `Order ${result.order.order_no} was created, but Resend could not send the email. Check the server logs and email variables.`);
      setForm({ customerName: "", customerAddress: "", customerPhone: "", customerEmail: "", countryCode: "TR", status: "order_placed", shippingStatus: "customer_side", shippingPrice: "", shippingCurrency: "TRY", notes: "" });
      await loadOrders();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Order could not be created"); } finally { setBusy(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setMessage("");
    const response = await fetch(`/api/admin/orders/${id}/status`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "Status could not be updated");
    if (status === "shipping") setMessage(result.emailSent ? "Status updated and the shipping email was sent." : "Status updated, but the shipping email could not be sent.");
    await loadOrders();
  };

  return <AdminLayout title="Orders">
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
      <form onSubmit={submit} className="border border-ink/10 bg-paper p-5 md:p-6">
        <h2 className="font-serif text-2xl">Add an order</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Customer full name"><input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="admin-input" /></Field>
          <Field label="Purchaser email"><input required type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="admin-input" /></Field>
          <Field label="Customer phone number"><input required type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="admin-input" /></Field>
          <Field label="Purchaser country"><select required value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} className="admin-input">{REGION_CODES.map((code) => <option key={code} value={code}>{countryNames.of(code) || code}</option>)}</select></Field>
          <div className="md:col-span-2"><Field label="Customer address"><textarea required rows={3} value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} className="admin-input py-3" /></Field></div>
        </div>

        <div className="mt-7 flex items-center justify-between"><h3 className="font-bold">Items purchased</h3><button type="button" onClick={() => setItems([...items, { kind: "print", productId: products.print[0]?.id || "", quantity: 1 }])} className="button-secondary"><Plus size={16} /> Add item</button></div>
        <div className="mt-3 space-y-3">{items.map((item, index) => {
          const options = products[item.kind];
          return <div key={index} className="grid gap-2 border border-ink/10 p-3 md:grid-cols-[140px_1fr_90px_44px]">
            <select value={item.kind} onChange={(e) => { const kind = e.target.value as Kind; const next = [...items]; next[index] = { kind, productId: products[kind][0]?.id || "", quantity: 1 }; setItems(next); }} className="admin-input"><option value="original">Original</option><option value="print">Prints & goods</option><option value="studio-mail">Mail letter</option></select>
            <select required value={item.productId} onChange={(e) => { const next = [...items]; next[index] = { ...item, productId: e.target.value }; setItems(next); }} className="admin-input"><option value="">Choose an item</option>{options.map((product) => <option key={product.id} value={product.id}>{"name" in product ? product.name : product.title}</option>)}</select>
            <input aria-label="Quantity" type="number" min="1" max={item.kind === "original" ? 1 : undefined} value={item.quantity} onChange={(e) => { const next = [...items]; next[index] = { ...item, quantity: item.kind === "original" ? 1 : Math.max(1, Number(e.target.value)) }; setItems(next); }} className="admin-input" />
            <button type="button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== index))} aria-label="Remove item" className="border border-ink/15 disabled:opacity-30"><Trash2 size={16} className="mx-auto" /></button>
          </div>;
        })}</div>
        <div className="mt-3 bg-[#f3efe6] p-4 text-right"><span className="text-sm text-ink/55">Order total</span><p className="font-serif text-2xl">{Object.entries(totals).map(([currency, amount]) => formatMoney(amount, currency)).join(" + ") || "—"}</p></div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Order status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="admin-input">{ORDER_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></Field>
          <Field label="Shipping payment"><select value={form.shippingStatus} onChange={(e) => setForm({ ...form, shippingStatus: e.target.value, shippingPrice: e.target.value === "customer_side" ? "" : form.shippingPrice })} className="admin-input"><option value="customer_side">Paid by customer on their side</option><option value="customer_in_order">Paid by customer in order</option><option value="paid_by_me">Paid by me</option></select></Field>
          {form.shippingStatus !== "customer_side" && <Field label="Shipping price (optional)"><div className="flex"><input min="0" step="0.01" type="number" value={form.shippingPrice} onChange={(e) => setForm({ ...form, shippingPrice: e.target.value })} className="admin-input min-w-0" /><select value={form.shippingCurrency} onChange={(e) => setForm({ ...form, shippingCurrency: e.target.value })} className="border border-l-0 border-ink/15 bg-paper px-2"><option>TRY</option><option>USD</option><option>EUR</option></select></div></Field>}
          <div className="md:col-span-2"><Field label="Private customer note (optional)"><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="admin-input py-3" /></Field></div>
        </div>
        {message && <p role="status" className="mt-4 border border-coral/25 bg-coral/5 p-3 text-sm">{message}</p>}
        <button disabled={busy} className="button-primary mt-5">{busy ? "Creating order…" : "Create order & email customer"}</button>
      </form>

      <section><h2 className="font-serif text-2xl">Recent orders</h2><div className="mt-4 space-y-3">{orders.length === 0 && <p className="border border-ink/10 bg-paper p-5 text-sm text-ink/55">No manual orders yet.</p>}{orders.map((order) => <article key={order.id} className="border border-ink/10 bg-paper p-4"><div className="flex items-start justify-between gap-3"><div><strong>{order.order_no}</strong><p className="text-sm">{order.customer_name} · {countryNames.of(order.country_code) || order.country_code}</p><p className="text-xs text-ink/45">{new Date(order.created_at).toLocaleString()}</p></div><select aria-label={`Status for ${order.order_no}`} value={order.status} onChange={(e) => void updateStatus(order.id, e.target.value)} className="min-h-10 border border-ink/15 bg-paper px-2 text-sm">{ORDER_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></div><ul className="mt-3 border-t border-ink/10 pt-2 text-sm">{order.items.map((item, index) => <li key={index} className="flex justify-between py-1"><span>{item.name} × {item.quantity}</span><span>{formatMoney(item.lineTotalMinor, item.currency)}</span></li>)}</ul><p className="mt-2 text-right font-bold">{Object.entries(order.totals).map(([currency, amount]) => formatMoney(amount, currency)).join(" + ")}</p><a href={`mailto:${order.customer_email}`} className="mt-2 block text-sm text-coral">{order.customer_email}</a></article>)}</div></section>
    </div>
  </AdminLayout>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold">{label}{<span className="mt-2 block">{children}</span>}</label>; }
