import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { StatCard, StatusBadge } from "@/components/admin/AdminUI";
import { productRepository } from "@/lib/productRepository";
import { isPubliclyVisible, isSoldOut } from "@/lib/product-status";
export default function Dashboard() {
  const s = productRepository.getSettings();
  const originals = s.originalProducts,
    prints = s.printProducts,
    mail = s.studioMailPackages;
  const drafts =
    [...originals, ...prints].filter((x) => x.status === "draft").length +
    mail.filter((x) => x.status === "draft").length;
  const attention = [...originals, ...prints]
    .filter((x) => !x.imageUrl || x.priceUsdCents <= 0)
    .map(
      (x) =>
        `${x.name}: ${!x.imageUrl ? "missing image" : "missing USD price"}`,
    );
  mail
    .filter(
      (x) => x.inventory <= x.lowStockThreshold && x.status === "published",
    )
    .forEach((x) => attention.push(`${x.title}: low inventory`));
  if (!/^\d{8,15}$/.test(s.whatsapp.number))
    attention.push("WhatsApp number is missing or invalid");
  return (
    <AdminLayout title="Studio overview">
      <p className="mb-6 text-sm text-ink/55">
        Manage your collection, availability and storefront.
      </p>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/originals?status=available">
          <StatCard
            label="Türkiye originals"
            value={
              originals.filter(
                (x) => isPubliclyVisible(x) && x.availableInTurkiye !== false,
              ).length
            }
          />
        </Link>
        <Link href="/admin/originals?status=available">
          <StatCard
            label="International originals"
            value={
              originals.filter(
                (x) =>
                  isPubliclyVisible(x) && x.availableInternationally !== false,
              ).length
            }
          />
        </Link>
        {(["tshirt", "mug", "print", "sticker"] as const).map((category) => (
          <Link
            key={category}
            href={`/admin/prints?category=${category}&status=published`}
          >
            <StatCard
              label={`Published ${category === "tshirt" ? "T-shirts" : category === "mug" ? "mugs" : category === "print" ? "prints" : "stickers"}`}
              value={
                prints.filter(
                  (x) =>
                    (x.category || "print") === category &&
                    x.status === "published",
                ).length
              }
            />
          </Link>
        ))}
        <StatCard label="Fourthwall prints" value="External" />
        <Link href="/admin/mystery-mail?status=published">
          <StatCard
            label="Active Mystery Mail"
            value={
              mail.filter(
                (x) =>
                  x.status === "published" &&
                  Boolean(x.expiresAt) &&
                  Date.parse(x.expiresAt!) > Date.now() &&
                  x.inventory !== 0,
              ).length
            }
          />
        </Link>
        <StatCard label="Draft products" value={drafts} />
        <StatCard
          label="Sold / sold out"
          value={[...originals, ...prints, ...mail].filter(isSoldOut).length}
        />
        <Link href="/admin/inventory?filter=low-stock">
          <StatCard
            label="Low stock"
            value={
              mail.filter(
                (x) => x.inventory > 0 && x.inventory <= x.lowStockThreshold,
              ).length
            }
          />
        </Link>
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <section className="border border-ink/10 bg-paper p-5">
          <h2 className="text-lg font-bold">Needs attention</h2>
          {attention.length ? (
            <ul className="mt-4 divide-y divide-ink/10">
              {attention.map((x) => (
                <li key={x} className="py-3 text-sm">
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink/55">
              Everything essential is configured.
            </p>
          )}
        </section>
        <section className="border border-ink/10 bg-paper p-5">
          <h2 className="text-lg font-bold">Integration status</h2>
          <dl className="mt-4 space-y-4">
            <div className="flex justify-between">
              <dt>WhatsApp</dt>
              <dd>
                <StatusBadge
                  status={
                    /^\d{8,15}$/.test(s.whatsapp.number)
                      ? "connected"
                      : "disabled"
                  }
                />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Link Hub</dt>
              <dd>
                <StatusBadge
                  status={s.siteLinks.linkHubEnabled ? "published" : "disabled"}
                />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Fourthwall</dt>
              <dd>
                <StatusBadge status="configuration required" />
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="mt-6 border border-ink/10 bg-paper p-5">
        <h2 className="text-lg font-bold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/originals/new" className="button-primary">
            Add original
          </Link>
          <Link href="/admin/prints/new" className="button-secondary">
            Add print
          </Link>
          <Link href="/admin/mystery-mail/new" className="button-secondary">
            Add Mystery Mail
          </Link>
          <a href="/" className="button-secondary">
            View storefront
          </a>
        </div>
      </section>
    </AdminLayout>
  );
}
