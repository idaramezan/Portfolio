import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";
type Enquiry = {
  id: string;
  enquiry_number: string;
  enquiry_type: string;
  subject_name: string;
  customer_name: string;
  customer_email: string;
  country?: string;
  city?: string;
  phone?: string;
  organisation?: string;
  project_type?: string;
  message?: string;
  status: string;
  admin_note?: string;
  submitted_at: string;
};
export default function Enquiries() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const load = () =>
    fetch("/api/admin/enquiries", {
      headers: {
        "x-admin-password":
          sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
      },
    })
      .then((r) => r.json())
      .then((x) => setItems(x.enquiries || []));
  useEffect(() => {
    void load();
  }, []);
  const update = async (item: Enquiry, changes: Partial<Enquiry>) => {
    await fetch(`/api/admin/enquiries/${item.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password":
          sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
      },
      body: JSON.stringify({
        status: changes.status || item.status,
        adminNote: changes.admin_note ?? item.admin_note,
      }),
    });
    await load();
  };
  return (
    <AdminLayout title="Creative Enquiries">
      <div className="grid gap-4">
        {items.length ? (
          items.map((item) => (
            <article className="admin-card" key={item.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-coral">
                    {item.enquiry_number} ·{" "}
                    {item.enquiry_type.replace("_", " ").toUpperCase()}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl">
                    {item.subject_name}
                  </h2>
                  <p>
                    {item.customer_name} ·{" "}
                    <a href={`mailto:${item.customer_email}`}>
                      {item.customer_email}
                    </a>
                  </p>
                  <p className="text-sm text-ink/60">
                    {item.country} {item.city} {item.organisation}
                  </p>
                </div>
                <select
                  className="h-11 border bg-paper px-3"
                  value={item.status}
                  onChange={(e) =>
                    void update(item, { status: e.target.value })
                  }
                >
                  <option>new</option>
                  <option>contacted</option>
                  <option>negotiating</option>
                  <option>completed</option>
                  <option>declined</option>
                </select>
              </div>
              {item.message && (
                <p className="mt-4 whitespace-pre-wrap border-t pt-4">
                  {item.message}
                </p>
              )}
              <textarea
                className="mt-4 w-full border bg-paper p-3"
                placeholder="Private admin note"
                defaultValue={item.admin_note || ""}
                onBlur={(e) =>
                  void update(item, { admin_note: e.target.value })
                }
              />
              <small>{new Date(item.submitted_at).toLocaleString()}</small>
            </article>
          ))
        ) : (
          <section className="admin-card">No enquiries yet.</section>
        )}
      </div>
    </AdminLayout>
  );
}
