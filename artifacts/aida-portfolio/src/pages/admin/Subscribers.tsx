import { useEffect, useMemo, useState } from "react";
import { Mail, Search, Users } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

type Subscriber = {
  id: number;
  email: string;
  name: string | null;
  subscribedAt: string;
  welcomeEmailSentAt: string | null;
};

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
    fetch("/api/newsletter/subscribers", {
      headers: { "x-admin-password": password },
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Subscribers could not be loaded");
        setSubscribers(result.subscribers);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Subscribers could not be loaded"),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subscribers;
    return subscribers.filter(
      (subscriber) =>
        subscriber.email.toLowerCase().includes(query) ||
        subscriber.name?.toLowerCase().includes(query),
    );
  }, [search, subscribers]);

  return (
    <AdminLayout title="Newsletter subscribers">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="border border-ink/10 bg-paper p-5">
          <div className="flex items-center gap-3 text-ink/55">
            <Users size={20} />
            <span className="text-xs font-bold uppercase tracking-[.16em]">Total subscribers</span>
          </div>
          <p className="mt-3 font-serif text-4xl">{subscribers.length}</p>
        </div>
        <div className="border border-ink/10 bg-paper p-5">
          <div className="flex items-center gap-3 text-ink/55">
            <Mail size={20} />
            <span className="text-xs font-bold uppercase tracking-[.16em]">Welcome emails sent</span>
          </div>
          <p className="mt-3 font-serif text-4xl">
            {subscribers.filter((subscriber) => subscriber.welcomeEmailSentAt).length}
          </p>
        </div>
      </section>

      <section className="mt-6 border border-ink/10 bg-paper">
        <div className="flex flex-col gap-4 border-b border-ink/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl">Art Club members</h2>
            <p className="mt-1 text-sm text-ink/50">Newest subscribers appear first.</p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search subscribers</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              className="admin-input pl-10"
            />
          </label>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-ink/55">Loading subscribers…</p>
        ) : error ? (
          <p role="alert" className="p-6 text-sm font-semibold text-coral">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-ink/55">
            {search ? "No subscribers match your search." : "No newsletter subscribers yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[#f3efe6] text-xs uppercase tracking-[.12em] text-ink/50">
                <tr>
                  <th className="px-4 py-3">Subscriber</th>
                  <th className="px-4 py-3">Subscription date</th>
                  <th className="px-4 py-3">Welcome email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filtered.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td className="px-4 py-4">
                      {subscriber.name && <strong className="block">{subscriber.name}</strong>}
                      <a href={`mailto:${subscriber.email}`} className="text-coral underline-offset-4 hover:underline">
                        {subscriber.email}
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/Istanbul",
                      }).format(new Date(subscriber.subscribedAt))}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${subscriber.welcomeEmailSentAt ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
                        {subscriber.welcomeEmailSentAt ? "Sent" : "Not sent"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
