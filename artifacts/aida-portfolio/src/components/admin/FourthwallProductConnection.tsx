import { useMemo, useState } from "react";
import { ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { useInternationalProducts } from "@/hooks/use-international";
import type {
  FourthwallVariantType,
  ManagedProduct,
  ProductFourthwallVariant,
} from "@/lib/store";
import type { FourthwallLinkType } from "@/lib/international-option-copy";

const field = "mt-2 h-11 w-full border border-ink/15 bg-paper px-3 text-sm";
const TYPES: Array<{ value: FourthwallVariantType; label: string }> = [
  { value: "poster", label: "Poster" },
  { value: "framed", label: "Framed" },
];

function createVariant(index: number): ProductFourthwallVariant {
  const type = index === 0 ? "poster" : "framed";
  return {
    id: `fw-format-${Date.now()}-${index}`,
    fourthwallProductId: "",
    variantType: type,
    label: type === "poster" ? "Poster" : "Framed",
    sortOrder: index,
    isDefault: index === 0,
    enabled: true,
  };
}

export default function FourthwallProductConnection({
  product,
  onChange,
}: {
  product: ManagedProduct;
  onChange: (patch: Partial<ManagedProduct>) => void;
}) {
  const international = useInternationalProducts();
  const [search, setSearch] = useState("");
  const options = useMemo(
    () =>
      international.products.filter((item) =>
        item.name
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
      ),
    [international.products, search],
  );
  const supportsGrouped = product.kind === "print";
  const grouped =
    supportsGrouped && Boolean(product.fourthwallVariantGroupEnabled);
  const variants = product.fourthwallVariants || [];
  const linked = international.products.find(
    (item) => item.id === product.fourthwallProductId,
  );
  const relationship = (product.fourthwallLinkType ||
    "exact") as FourthwallLinkType;

  const updateVariants = (next: ProductFourthwallVariant[]) =>
    onChange({
      fourthwallVariants: next.map((variant, index) => ({
        ...variant,
        sortOrder: index,
      })),
    });
  const updateVariant = (
    id: string,
    patch: Partial<ProductFourthwallVariant>,
  ) => {
    let next = variants.map((variant) =>
      variant.id === id ? { ...variant, ...patch } : variant,
    );
    if (patch.isDefault)
      next = next.map((variant) => ({
        ...variant,
        isDefault: variant.id === id,
      }));
    updateVariants(next);
  };
  const connectLegacy = (id: string) => {
    const selected = international.products.find((item) => item.id === id);
    onChange(
      selected
        ? {
            fourthwallProductId: selected.id,
            fourthwallProductUrl: selected.externalUrl,
            fourthwallLinkType: product.fourthwallLinkType || "exact",
          }
        : {
            fourthwallProductId: undefined,
            fourthwallProductUrl: undefined,
            fourthwallLinkType: undefined,
          },
    );
  };

  return (
    <section className="border-b border-ink/10 pb-7">
      <h2 className="text-lg font-bold">International sale</h2>
      <p className="mt-2 text-sm text-ink/60">
        Use one or more Fourthwall products to represent this artwork
        internationally.
      </p>
      {supportsGrouped && (
        <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(event) =>
              onChange({
                fourthwallVariantGroupEnabled: event.target.checked,
                fourthwallVariants:
                  event.target.checked && !variants.length
                    ? [createVariant(0)]
                    : variants,
              })
            }
          />
          Use multiple Fourthwall products as formats
        </label>
      )}
      {supportsGrouped && (
        <p className="mt-1 text-xs text-ink/45">
          International visitors will see these formats as options under one
          artwork.
        </p>
      )}

      <label className="mt-5 block text-sm font-semibold">
        <span className="flex items-center gap-2">
          <Search size={15} aria-hidden="true" /> Search Fourthwall products
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={field}
          placeholder="Search by product title"
        />
      </label>

      {grouped ? (
        <div className="mt-5 space-y-4">
          {variants.map((variant, index) => {
            const selected = international.products.find(
              (item) => item.id === variant.fourthwallProductId,
            );
            const duplicate = variants.some(
              (item) =>
                item.id !== variant.id &&
                item.fourthwallProductId &&
                item.fourthwallProductId === variant.fourthwallProductId,
            );
            const duplicateType = variants.some(
              (item) =>
                item.id !== variant.id &&
                item.variantType === variant.variantType,
            );
            return (
              <fieldset key={variant.id} className="border border-ink/10 p-4">
                <legend className="px-2 text-xs font-bold uppercase tracking-[.12em] text-ink/55">
                  Format {String(index + 1).padStart(2, "0")}
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Type
                    <select
                      className={field}
                      value={variant.variantType}
                      onChange={(event) => {
                        const type = event.target.value;
                        updateVariant(variant.id, {
                          variantType: type,
                          label:
                            TYPES.find((item) => item.value === type)?.label ||
                            type,
                        });
                      }}
                    >
                      {TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Fourthwall product
                    <select
                      className={field}
                      value={variant.fourthwallProductId}
                      onChange={(event) => {
                        const item = international.products.find(
                          (entry) => entry.id === event.target.value,
                        );
                        updateVariant(variant.id, {
                          fourthwallProductId: event.target.value,
                          fourthwallProductUrl: item?.externalUrl,
                        });
                      }}
                    >
                      <option value="">Select a product</option>
                      {options.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`default-fourthwall-${product.id}`}
                      checked={variant.isDefault}
                      onChange={() =>
                        updateVariant(variant.id, { isDefault: true })
                      }
                    />
                    Default
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={variant.enabled}
                      onChange={(event) =>
                        updateVariant(variant.id, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    className="button-link ml-auto"
                    onClick={() =>
                      updateVariants(
                        variants.filter((item) => item.id !== variant.id),
                      )
                    }
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
                {(duplicate || duplicateType) && (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-semibold text-warning"
                  >
                    {duplicate
                      ? "This Fourthwall product is already assigned to another format."
                      : "Each format type may only be used once."}
                  </p>
                )}
                {selected && (
                  <p className="mt-3 text-xs text-ink/55">
                    {selected.name} · {selected.price.formatted} ·{" "}
                    {selected.available ? "Available" : "Unavailable"}
                  </p>
                )}
              </fieldset>
            );
          })}
          <button
            type="button"
            className="button-secondary"
            onClick={() =>
              updateVariants([...variants, createVariant(variants.length)])
            }
            disabled={variants.length >= TYPES.length}
          >
            <Plus size={16} /> Add format
          </button>
          {!variants.some((variant) => variant.fourthwallProductId) && (
            <p role="alert" className="text-sm font-semibold text-warning">
              Assign at least one Fourthwall product before saving.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Fourthwall product
            <select
              value={product.fourthwallProductId || ""}
              onChange={(event) => connectLegacy(event.target.value)}
              className={field}
              disabled={international.loading || international.error}
            >
              <option value="">No connection</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {product.fourthwallProductId && (
            <label className="text-sm font-semibold">
              Relationship type
              <select
                value={relationship}
                onChange={(event) =>
                  onChange({
                    fourthwallLinkType: event.target
                      .value as FourthwallLinkType,
                  })
                }
                className={field}
              >
                <option value="exact">Exact product</option>
                <option value="edition">International edition</option>
                <option value="related">Related product</option>
              </select>
            </label>
          )}
          {linked && (
            <a
              href={linked.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button-link"
            >
              Open Fourthwall product <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}
      {international.loading && (
        <div className="mt-5 h-20 animate-pulse bg-ink/5" />
      )}
      {international.error && (
        <p role="alert" className="mt-5 text-sm font-semibold text-warning">
          Fourthwall products could not be loaded. Saved connections are safe.
        </p>
      )}
    </section>
  );
}
