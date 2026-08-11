import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const statuses = [
  "new",
  "contacted",
  "approved",
  "completed",
  "declined",
] as const;
export default function OriginalRequests() {
  const [requests, setRequests] = useState<any[]>([]),
    [error, setError] = useState("");
  const headers = {
    "x-admin-password":
      sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
    "content-type": "application/json",
  };
  const load = () =>
    fetch("/api/admin/checkout/original-requests", { headers })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setRequests(data.requests || []);
      })
      .catch((reason) => setError(reason.message));
  useEffect(() => {
    void load();
  }, []);
  const update = async (request: any, status: string) => {
    const response = await fetch(
      `/api/admin/checkout/original-requests/${request.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status, adminNote: request.admin_note }),
      },
    );
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    setRequests((items) =>
      items.map((item) => (item.id === request.id ? data.request : item)),
    );
  };
  return (
    <AdminLayout title="Original Requests">
      <p className="mb-6 max-w-3xl text-sm text-ink/60">
        International delivery enquiries for original artwork. No payment is
        collected through this workflow.
      </p>
      {error && (
        <p
          role="alert"
          className="mb-5 border border-coral/30 bg-coral/5 p-4 text-coral"
        >
          {error}
        </p>
      )}
      <div className="space-y-4">
        {requests.map((request) => (
          <article
            key={request.id}
            className="border border-ink/10 bg-paper p-5"
          >
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="eyebrow">{request.request_number}</p>
                <h2 className="mt-2 text-2xl">{request.product_name}</h2>
                <p className="mt-2 text-sm">
                  {request.customer_name} ·{" "}
                  <a
                    className="underline"
                    href={`mailto:${request.customer_email}`}
                  >
                    {request.customer_email}
                  </a>
                </p>
                <p className="text-sm text-ink/60">
                  {request.country_name}, {request.city}
                  {request.phone ? ` · ${request.phone}` : ""}
                </p>
              </div>
              <label className="text-sm font-semibold">
                Status
                <select
                  className="mt-2 block h-11 border border-ink/15 bg-paper px-3"
                  value={request.status}
                  onChange={(event) => update(request, event.target.value)}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status[0].toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {request.message && (
              <p className="mt-4 border-l-2 border-blue bg-blue/10 p-3 text-sm">
                {request.message}
              </p>
            )}
            <label className="mt-4 block text-sm font-semibold">
              Internal note
              <textarea
                className="mt-2 block w-full border border-ink/15 bg-paper p-3"
                rows={2}
                value={request.admin_note || ""}
                onChange={(event) =>
                  setRequests((items) =>
                    items.map((item) =>
                      item.id === request.id
                        ? { ...item, admin_note: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="button-secondary mt-3"
              onClick={() => update(request, request.status)}
            >
              Save note
            </button>
            <p className="mt-3 text-xs text-ink/45">
              Submitted {new Date(request.submitted_at).toLocaleString()}
            </p>
          </article>
        ))}
        {!requests.length && !error && (
          <p className="border border-ink/10 bg-paper p-8 text-center">
            No original delivery requests yet.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
