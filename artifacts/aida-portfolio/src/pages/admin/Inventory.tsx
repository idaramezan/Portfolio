import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { StatusBadge } from "@/components/admin/AdminUI";
import { loadShopSettings, saveShopSettings } from "@/lib/store";
export default function Inventory() {
  const [s, setS] = useState(loadShopSettings());
  const save = (next: any) => {
    setS(next);
    saveShopSettings(next);
  };
  return (
    <AdminLayout title="Inventory">
      <p className="mb-5 text-sm text-ink/55">
        Manual availability controls. WhatsApp activity never changes inventory.
      </p>
      <div className="overflow-hidden border border-ink/10 bg-paper">
        {s.originalProducts.map((x) => (
          <div
            key={x.id}
            className="grid gap-3 border-b border-ink/10 p-4 md:grid-cols-[1fr_120px_1fr] md:items-center"
          >
            <div className="flex items-center gap-3">
              <img src={x.imageUrl} alt="" className="h-12 w-12 object-cover" />
              <div>
                <strong>{x.name}</strong>
                <p className="text-xs text-ink/45">Original · one of one</p>
              </div>
            </div>
            <StatusBadge status={x.status} />
            <div className="flex flex-wrap gap-2 md:justify-end">
              {["published", "sold_out", "archived"].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    save({
                      ...s,
                      originalProducts: s.originalProducts.map((p) =>
                        p.id === x.id
                          ? {
                              ...p,
                              status: status as any,
                              available: status === "published",
                              updatedAt: new Date().toISOString(),
                            }
                          : p,
                      ),
                    })
                  }
                  className="min-h-10 border border-ink/15 px-3 text-xs font-semibold capitalize"
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        ))}
        {s.studioMailPackages.map((x) => (
          <div
            key={x.id}
            className="grid gap-3 border-b border-ink/10 p-4 md:grid-cols-[1fr_120px_1fr] md:items-center"
          >
            <div className="flex items-center gap-3">
              <img
                src={x.coverImage}
                alt=""
                className="h-12 w-12 object-cover"
              />
              <div>
                <strong>{x.title}</strong>
                <p className="text-xs text-ink/45">
                  Mystery Mail · low at {x.lowStockThreshold}
                </p>
              </div>
            </div>
            <StatusBadge
              status={
                x.inventory === 0
                  ? "sold out"
                  : x.inventory <= x.lowStockThreshold
                    ? "low stock"
                    : x.status
              }
            />
            <div className="flex items-center gap-2 md:justify-end">
              <button
                onClick={() =>
                  save({
                    ...s,
                    studioMailPackages: s.studioMailPackages.map((p) =>
                      p.id === x.id
                        ? { ...p, inventory: Math.max(0, p.inventory - 1) }
                        : p,
                    ),
                  })
                }
                className="h-10 w-10 border"
              >
                −
              </button>
              <span className="min-w-10 text-center font-bold">
                {x.inventory}
              </span>
              <button
                onClick={() =>
                  save({
                    ...s,
                    studioMailPackages: s.studioMailPackages.map((p) =>
                      p.id === x.id ? { ...p, inventory: p.inventory + 1 } : p,
                    ),
                  })
                }
                className="h-10 w-10 border"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
