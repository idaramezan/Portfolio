import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const STATUSES = ["pending", "packaging", "shipped", "completed", "cancelled"];

type OrderItem = {
  id: string;
  product_name: string;
  product_type: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
  selected_options?: Record<string, unknown>;
  sku?: string | null;
};

type Order = {
  id: string;
  order_number: string;
  payment_reference: string;
  customer_full_name: string;
  customer_email: string;
  customer_phone: string;
  customer_language: string;
  country_code: string;
  country_name: string;
  province_or_region?: string | null;
  district?: string | null;
  city: string;
  postal_code: string;
  address_line: string;
  delivery_notes?: string | null;
  market: string;
  currency: string;
  subtotal_minor: number;
  shipping_minor: number;
  grand_total_minor: number;
  status: string;
  receipt_original_name: string;
  receipt_mime_type: string;
  receipt_size: number;
  consent_version: string;
  consent_at: string;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  internal_note?: string | null;
  created_at: string;
  submitted_at: string;
  updated_at: string;
  items: OrderItem[];
};

type Account = {
  currency: "TRY" | "USD";
  enabled: boolean;
  account_holder: string;
  bank_name: string;
  iban: string;
  swift_bic?: string;
  branch_info?: string;
  instructions?: string;
  notification_email?: string;
};

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
  }).format(minor / 100);

const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "Not provided";

const optionText = (options?: Record<string, unknown>) =>
  Object.entries(options || {})
    .filter(([, value]) => value !== "" && value != null)
    .map(
      ([key, value]) => `${key.replace(/([A-Z])/g, " $1")}: ${String(value)}`,
    )
    .join(" · ");

function DetailField({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="text-xs font-bold uppercase tracking-wider text-ink/45">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm leading-6 text-ink">
        {children || "Not provided"}
      </dd>
    </div>
  );
}

export default function Orders() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const headers = {
    "content-type": "application/json",
    "x-admin-password": password,
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const [ordersResponse, bankResponse] = await Promise.all([
      fetch("/api/admin/checkout/orders", { headers }),
      fetch("/api/admin/checkout/bank", { headers }),
    ]);
    if (!ordersResponse.ok || !bankResponse.ok)
      throw new Error("Order administration could not be loaded");
    setOrders((await ordersResponse.json()).orders);
    setAccounts((await bankResponse.json()).accounts);
  };

  useEffect(() => {
    void load().catch((error) => setMessage(error.message));
  }, []);

  const visible = useMemo(
    () =>
      orders.filter(
        (order) =>
          (!filter || order.status === filter) &&
          `${order.order_number} ${order.customer_full_name} ${order.customer_email} ${order.customer_phone} ${order.address_line} ${order.city} ${order.country_name}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [orders, filter, query],
  );

  const updateStatus = async (order: Order, next: string) => {
    if (
      !confirm(`Change ${order.order_number} from ${order.status} to ${next}?`)
    )
      return;
    const trackingNumber =
      next === "shipped" ? prompt("Tracking number (optional)") || "" : "";
    const response = await fetch(
      `/api/admin/checkout/orders/${order.id}/status`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: next, trackingNumber }),
      },
    );
    const result = await response.json();
    setMessage(response.ok ? `Order updated to ${next}.` : result.error);
    await load();
  };

  const saveBank = async (account: Account) => {
    const response = await fetch(
      `/api/admin/checkout/bank/${account.currency}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          enabled: account.enabled,
          accountHolder: account.account_holder,
          bankName: account.bank_name,
          iban: account.iban,
          swiftBic: account.swift_bic,
          branchInfo: account.branch_info,
          instructions: account.instructions,
          notificationEmail: account.notification_email,
        }),
      },
    );
    setMessage(
      response.ok
        ? `${account.currency} bank settings saved.`
        : "Bank settings could not be saved.",
    );
    await load();
  };

  const openReceipt = async (order: Order) => {
    const response = await fetch(
      `/api/admin/checkout/orders/${order.id}/receipt`,
      { headers },
    );
    if (!response.ok) return setMessage("Receipt access was denied.");
    const url = URL.createObjectURL(await response.blob());
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <AdminLayout title="Orders">
      <div className="space-y-8">
        {message && (
          <p role="status" className="border border-coral/25 bg-paper p-3">
            {message}
          </p>
        )}

        <section className="border border-ink/10 bg-paper p-5">
          <h2 className="font-serif text-2xl">Bank-transfer settings</h2>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {accounts.map((account, index) => (
              <div key={account.currency} className="border border-ink/10 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl">{account.currency} account</h3>
                  <label>
                    <input
                      type="checkbox"
                      checked={account.enabled}
                      onChange={(event) =>
                        setAccounts((current) =>
                          current.map((value, itemIndex) =>
                            itemIndex === index
                              ? { ...value, enabled: event.target.checked }
                              : value,
                          ),
                        )
                      }
                    />{" "}
                    Enabled
                  </label>
                </div>
                {[
                  ["Account holder", "account_holder"],
                  ["Bank name", "bank_name"],
                  [
                    account.currency === "USD"
                      ? "IBAN / account number"
                      : "IBAN",
                    "iban",
                  ],
                  ["SWIFT / BIC", "swift_bic"],
                  ["Branch information", "branch_info"],
                  ["Notification email", "notification_email"],
                ].map(([label, key]) => (
                  <label key={key} className="mt-3 block text-sm font-semibold">
                    {label}
                    <input
                      className="admin-input mt-1"
                      value={(account as any)[key] || ""}
                      onChange={(event) =>
                        setAccounts((current) =>
                          current.map((value, itemIndex) =>
                            itemIndex === index
                              ? { ...value, [key]: event.target.value }
                              : value,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <label className="mt-3 block text-sm font-semibold">
                  Additional instructions
                  <textarea
                    className="admin-input mt-1 py-2"
                    rows={3}
                    value={account.instructions || ""}
                    onChange={(event) =>
                      setAccounts((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index
                            ? { ...value, instructions: event.target.value }
                            : value,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="admin-button mt-4"
                  onClick={() => void saveBank(account)}
                >
                  Save {account.currency} settings
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap gap-3">
            <input
              className="admin-input max-w-md"
              placeholder="Search order, customer, email, phone or address"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="admin-input max-w-52"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-4">
            {visible.map((order) => (
              <article
                key={order.id}
                className="border border-ink/10 bg-paper p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <strong className="text-lg">{order.order_number}</strong>
                    <p>
                      {order.customer_full_name} · {order.customer_email} ·{" "}
                      {order.customer_phone}
                    </p>
                    <p className="text-sm text-ink/55">
                      {order.city}, {order.country_name} ·{" "}
                      {dateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <strong>
                      {money(order.grand_total_minor, order.currency)}
                    </strong>
                    <select
                      className="admin-input mt-2"
                      value={order.status}
                      onChange={(event) =>
                        void updateStatus(order, event.target.value)
                      }
                    >
                      {STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <ul className="mt-4 border-t border-ink/10 pt-3">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4">
                      <span>
                        {item.product_name} × {item.quantity}
                      </span>
                      <span>
                        {money(item.line_total_minor, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                <details className="mt-4 border-t border-ink/10 pt-4">
                  <summary className="cursor-pointer font-semibold text-coral underline underline-offset-4">
                    View full order details
                  </summary>
                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <section className="border border-ink/10 bg-ink/[.025] p-4">
                      <h3 className="font-serif text-xl">Customer details</h3>
                      <dl className="mt-4 grid gap-4 md:grid-cols-2">
                        <DetailField label="Full name">
                          {order.customer_full_name}
                        </DetailField>
                        <DetailField label="Language">
                          {order.customer_language?.toUpperCase()}
                        </DetailField>
                        <DetailField label="Email">
                          <a
                            className="underline"
                            href={`mailto:${order.customer_email}`}
                          >
                            {order.customer_email}
                          </a>
                        </DetailField>
                        <DetailField label="Phone">
                          <a
                            className="underline"
                            href={`tel:${order.customer_phone}`}
                          >
                            {order.customer_phone}
                          </a>
                        </DetailField>
                        <DetailField label="Consent recorded">
                          {dateTime(order.consent_at)}
                        </DetailField>
                        <DetailField label="Consent version">
                          {order.consent_version}
                        </DetailField>
                      </dl>
                    </section>

                    <section className="border border-ink/10 bg-sky/10 p-4">
                      <h3 className="font-serif text-xl">
                        Complete delivery address
                      </h3>
                      <dl className="mt-4 grid gap-4 md:grid-cols-2">
                        <DetailField label="Country">
                          {order.country_name} ({order.country_code})
                        </DetailField>
                        <DetailField label="Province / region">
                          {order.province_or_region}
                        </DetailField>
                        <DetailField label="District">
                          {order.district}
                        </DetailField>
                        <DetailField label="City">{order.city}</DetailField>
                        <DetailField label="Postal code">
                          {order.postal_code}
                        </DetailField>
                        <DetailField label="Full address" wide>
                          <span className="whitespace-pre-wrap">
                            {order.address_line}
                          </span>
                        </DetailField>
                        <DetailField label="Delivery instructions" wide>
                          <span className="whitespace-pre-wrap">
                            {order.delivery_notes || "None"}
                          </span>
                        </DetailField>
                      </dl>
                    </section>

                    <section className="border border-ink/10 p-4 xl:col-span-2">
                      <h3 className="font-serif text-xl">Placed order</h3>
                      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailField label="Order number">
                          {order.order_number}
                        </DetailField>
                        <DetailField label="Payment reference">
                          {order.payment_reference}
                        </DetailField>
                        <DetailField label="Market">{order.market}</DetailField>
                        <DetailField label="Status">{order.status}</DetailField>
                        <DetailField label="Submitted">
                          {dateTime(order.submitted_at)}
                        </DetailField>
                        <DetailField label="Last updated">
                          {dateTime(order.updated_at)}
                        </DetailField>
                        <DetailField label="Subtotal">
                          {money(order.subtotal_minor, order.currency)}
                        </DetailField>
                        <DetailField label="Shipping">
                          {money(order.shipping_minor, order.currency)}
                        </DetailField>
                        <DetailField label="Grand total">
                          {money(order.grand_total_minor, order.currency)}
                        </DetailField>
                        <DetailField label="Tracking number">
                          {order.tracking_number}
                        </DetailField>
                        <DetailField label="Tracking carrier">
                          {order.tracking_carrier}
                        </DetailField>
                      </dl>
                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-ink/15 text-xs uppercase tracking-wider text-ink/45">
                              <th className="py-2 pr-3">Product</th>
                              <th className="py-2 pr-3">Type</th>
                              <th className="py-2 pr-3">Options</th>
                              <th className="py-2 pr-3">Quantity</th>
                              <th className="py-2 pr-3">Unit price</th>
                              <th className="py-2 text-right">Line total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => (
                              <tr
                                key={item.id}
                                className="border-b border-ink/10 align-top"
                              >
                                <td className="py-3 pr-3 font-semibold">
                                  {item.product_name}
                                  {item.sku && (
                                    <small className="block text-ink/45">
                                      SKU: {item.sku}
                                    </small>
                                  )}
                                </td>
                                <td className="py-3 pr-3">
                                  {item.product_type}
                                </td>
                                <td className="py-3 pr-3">
                                  {optionText(item.selected_options) || "None"}
                                </td>
                                <td className="py-3 pr-3">{item.quantity}</td>
                                <td className="py-3 pr-3">
                                  {money(item.unit_price_minor, order.currency)}
                                </td>
                                <td className="py-3 text-right">
                                  {money(item.line_total_minor, order.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                </details>

                <button
                  type="button"
                  className="button-secondary mt-4"
                  onClick={() => void openReceipt(order)}
                >
                  View private receipt · {order.receipt_original_name}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
