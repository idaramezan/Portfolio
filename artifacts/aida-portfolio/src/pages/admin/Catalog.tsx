import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { MoreHorizontal, Search } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { EmptyState, StatusBadge } from "@/components/admin/AdminUI";
import { formatPrice } from "@/lib/utils";
import { type ManagedProduct } from "@/lib/store";
import { productRepository } from "@/lib/productRepository";
export default function Catalog({
  kind,
}: {
  kind: "originals" | "prints" | "studio-mail";
}) {
  const [settings, setSettings] = useState(productRepository.getSettings());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    () => new URLSearchParams(window.location.search).get("status") || "all",
  );
  const [featured, setFeatured] = useState("all");
  const [category, setCategory] = useState(
    () => new URLSearchParams(window.location.search).get("category") || "all",
  );
  const [sort, setSort] = useState("title");
  const [selected, setSelected] = useState<string[]>([]);
  const isMail = kind === "studio-mail";
  const raw: any[] = isMail
    ? settings.studioMailPackages
    : kind === "prints"
      ? settings.printProducts
      : settings.originalProducts;
  const rows = useMemo(
    () =>
      raw
        .filter(
          (x) =>
            (x.title || x.name).toLowerCase().includes(search.toLowerCase()) &&
            (status === "all" || x.status === status) &&
            (featured === "all" ||
              Boolean(x.featured) === (featured === "yes")) &&
            (kind !== "prints" ||
              category === "all" ||
              (x.category || "print") === category),
        )
        .sort((a, b) =>
          sort === "price"
            ? a.priceUsdCents - b.priceUsdCents
            : String(a.title || a.name).localeCompare(
                String(b.title || b.name),
              ),
        ),
    [raw, search, status, featured, category, sort],
  );
  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (featured !== "all") params.set("featured", featured);
    if (category !== "all") params.set("category", category);
    history.replaceState(
      null,
      "",
      `${location.pathname}${params.size ? `?${params}` : ""}`,
    );
  }, [status, featured, category]);
  useEffect(() => {
    const sync = () => setSettings(productRepository.getSettings());
    window.addEventListener("shop-settings:updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shop-settings:updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const archive = (id: string) => {
    const next = isMail
      ? {
          ...settings,
          studioMailPackages: settings.studioMailPackages.map((x) =>
            x.id === id ? { ...x, status: "archived" as const } : x,
          ),
        }
      : {
          ...settings,
          [kind === "prints" ? "printProducts" : "originalProducts"]: (kind ===
          "prints"
            ? settings.printProducts
            : settings.originalProducts
          ).map((x) =>
            x.id === id
              ? { ...x, status: "archived" as const, available: false }
              : x,
          ),
        };
    setSettings(next);
    productRepository.replaceSettings(next);
  };
  return (
    <AdminLayout
      title={
        isMail
          ? "Mystery Mail"
          : kind === "prints"
            ? "Prints & Goods"
            : "Originals"
      }
      actions={
        <Link
          href={`/admin/${isMail ? "mystery-mail" : kind}/new`}
          className="button-primary"
        >
          Add new
        </Link>
      }
    >
      <div className="mb-5 flex flex-col gap-3 lg:flex-row">
        {kind === "prints" && (
          <label className="text-sm font-semibold">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="ml-2 h-11 border border-ink/15 bg-paper px-3"
            >
              <option value="all">All</option>
              <option value="tshirt">T-shirts</option>
              <option value="mug">Mugs</option>
              <option value="print">Prints</option>
              <option value="sticker">Stickers</option>
            </select>
          </label>
        )}
        <label className="relative flex-1">
          <span className="sr-only">Search catalog</span>
          <Search className="absolute left-3 top-3" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="h-11 w-full border border-ink/15 bg-paper pl-10 pr-3"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 border border-ink/15 bg-paper px-3"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          {kind === "originals" ? (
            <>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </>
          ) : (
            <>
              <option value="published">Published</option>
              <option value="sold_out">Sold out</option>
            </>
          )}
          <option value="archived">Archived</option>
        </select>
        <select
          value={featured}
          onChange={(e) => setFeatured(e.target.value)}
          className="h-11 border border-ink/15 bg-paper px-3"
        >
          <option value="all">All featured states</option>
          <option value="yes">Featured</option>
          <option value="no">Not featured</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-11 border border-ink/15 bg-paper px-3"
        >
          <option value="title">Title A–Z</option>
          <option value="price">Price low to high</option>
        </select>
      </div>
      {selected.length > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-ink p-3 text-paper">
          <span className="text-sm font-semibold">
            {selected.length} selected
          </span>
          <button className="text-sm underline" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}
      {rows.length ? (
        <div className="overflow-hidden border border-ink/10 bg-paper">
          <div className="hidden grid-cols-[40px_64px_1fr_110px_120px_110px_80px] gap-3 border-b border-ink/10 bg-ink/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink/50 md:grid">
            <span />
            <span>Image</span>
            <span>Product</span>
            <span>Status</span>
            <span>USD price</span>
            <span>{isMail ? "Inventory" : "Availability"}</span>
            <span>Actions</span>
          </div>
          {rows.map((x) => {
            const title = x.title || x.name;
            const state = x.status;
            return (
              <article
                key={x.id}
                className="grid gap-3 border-b border-ink/10 p-4 last:border-0 md:grid-cols-[40px_64px_1fr_110px_120px_110px_80px] md:items-center"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(x.id)}
                  onChange={(e) =>
                    setSelected((v) =>
                      e.target.checked
                        ? [...v, x.id]
                        : v.filter((y) => y !== x.id),
                    )
                  }
                  aria-label={`Select ${title}`}
                />
                {x.coverImage || x.imageUrl ? (
                  <img
                    src={x.coverImage || x.imageUrl}
                    alt=""
                    className="h-16 w-16 object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 bg-ink/5" />
                )}
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="text-xs text-ink/45">
                    {isMail
                      ? x.theme
                      : kind === "prints"
                        ? `${x.category === "tshirt" ? "T-shirt" : x.category === "mug" ? "Mug" : x.category === "sticker" ? "Sticker" : "Print"} · ${x.category === "tshirt" ? (x.tshirtOptions?.availableColors || []).map((color: string) => color[0].toUpperCase() + color.slice(1)).join(", ") : x.category === "mug" ? "White" : x.category === "sticker" ? x.stickerOptions?.formatDescription || "Single configuration" : `${x.printOptions?.sizes?.length || 0} sizes · ${x.printOptions?.framing?.framedAvailable && x.printOptions?.framing?.unframedAvailable ? "Framed or unframed" : x.printOptions?.framing?.framedAvailable ? "Framed" : "Unframed"}`}`
                        : x.dimension}
                  </p>
                </div>
                <div>
                  <StatusBadge status={state} />
                </div>
                <span className="font-semibold">
                  {formatPrice(x.priceUsdCents)}
                </span>
                <span className="text-sm">
                  {isMail
                    ? x.inventory
                    : x.available
                      ? "Available"
                      : "Unavailable"}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/${isMail ? "mystery-mail" : kind}/${x.id}`}
                    className="min-h-10 px-2 py-2 text-sm font-semibold underline"
                  >
                    Edit
                  </Link>
                  <details className="relative">
                    <summary
                      className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center list-none"
                      aria-label={`More actions for ${title}`}
                    >
                      <MoreHorizontal />
                    </summary>
                    <div className="absolute right-0 z-20 w-40 border border-ink/10 bg-paper p-1 shadow-xl">
                      <a
                        href={
                          isMail
                            ? "/shop/turkiye/mystery-mail"
                            : kind === "prints"
                              ? "/shop/turkiye/prints"
                              : "/shop/turkiye/originals"
                        }
                        className="block px-3 py-2 text-sm"
                      >
                        Preview
                      </a>
                      <button
                        onClick={() => {
                          const copy = {
                            ...x,
                            id: `${x.id}-copy-${crypto.randomUUID()}`,
                            slug: x.slug ? `${x.slug}-copy` : undefined,
                            status: "draft",
                            available: false,
                            featured: false,
                          };
                          productRepository.create(kind, copy);
                          setSettings(productRepository.getSettings());
                        }}
                        className="w-full px-3 py-2 text-left text-sm"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          productRepository.update(kind, x.id, {
                            featured: !x.featured,
                          } as any);
                          setSettings(productRepository.getSettings());
                        }}
                        className="w-full px-3 py-2 text-left text-sm"
                      >
                        {x.featured ? "Remove featured" : "Feature"}
                      </button>
                      <button
                        onClick={() => {
                          const published =
                            kind === "originals"
                              ? {
                                  available: x.status !== "available",
                                  status:
                                    x.status === "available"
                                      ? "draft"
                                      : "available",
                                }
                              : isMail
                                ? {
                                    status:
                                      x.status === "published"
                                        ? "draft"
                                        : "published",
                                  }
                                : {
                                    available: x.status !== "published",
                                    status:
                                      x.status === "published"
                                        ? "draft"
                                        : "published",
                                  };
                          productRepository.update(
                            kind,
                            x.id,
                            published as any,
                          );
                          setSettings(productRepository.getSettings());
                        }}
                        className="w-full px-3 py-2 text-left text-sm"
                      >
                        {x.status ===
                        (kind === "originals" ? "available" : "published")
                          ? "Unpublish"
                          : "Publish"}
                      </button>
                      <button
                        onClick={() => archive(x.id)}
                        className="w-full border-t border-ink/10 px-3 py-2 text-left text-sm"
                      >
                        Archive
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={
            search
              ? "No products match the current filters."
              : `No ${kind} have been added yet.`
          }
          body={
            search
              ? "Try a different search or clear the filters."
              : "Create the first catalog item when you are ready."
          }
          action={
            <Link href={`/admin/${kind}/new`} className="button-primary">
              Add your first product
            </Link>
          }
        />
      )}
    </AdminLayout>
  );
}
