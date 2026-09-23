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

function suggestSize(title: string) {
  const match = title.match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*(?:in|inch|inches))?/i,
  );
  return match ? `${match[1]} × ${match[2]} in` : "";
}

function createVariant(
  type: FourthwallVariantType,
  index: number,
): ProductFourthwallVariant {
  return {
    id: `fw-size-${Date.now()}-${index}`,
    fourthwallProductId: "",
    variantType: type,
    sizeLabel: "",
    label: type === "poster" ? "Poster" : "Framed",
    sortOrder: index,
    isDefault: false,
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
    if (patch.isDefault) {
      const current = variants.find((variant) => variant.id === id);
      next = next.map((variant) => ({
        ...variant,
        isDefault:
          variant.variantType === current?.variantType
            ? variant.id === id
            : variant.isDefault,
      }));
    }
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
                    ? [createVariant("poster", 0)]
                    : variants,
              })
            }
          />
          Configure Fourthwall format and size products
        </label>
      )}
      {supportsGrouped && (
        <p className="mt-1 text-xs text-ink/45">
          Every size links to its own Fourthwall product while remaining under
          this artwork.
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
        <div className="mt-7 space-y-8">
          {TYPES.map((type) => {
            const formatOptions = variants.filter(
              (variant) => variant.variantType === type.value,
            );
            return (
              <section key={type.value} className="border-t border-ink/15 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-bold uppercase tracking-[.14em]">
                    {type.label}
                  </h3>
                  <label className="text-xs font-semibold text-ink/60">
                    Default format{" "}
                    <input
                      type="radio"
                      name={`default-format-${product.id}`}
                      checked={
                        (product.fourthwallDefaultFormat || "poster") ===
                        type.value
                      }
                      onChange={() =>
                        onChange({ fourthwallDefaultFormat: type.value })
                      }
                    />
                  </label>
                </div>
                <div className="mt-3 space-y-3">
                  {formatOptions.map((variant, index) => {
                    const selected = international.products.find(
                      (item) => item.id === variant.fourthwallProductId,
                    );
                    const duplicate = variants.some(
                      (item) =>
                        item.id !== variant.id &&
                        item.fourthwallProductId &&
                        item.fourthwallProductId ===
                          variant.fourthwallProductId,
                    );
                    return (
                      <fieldset
                        key={variant.id}
                        className="border border-ink/10 p-4"
                      >
                        <legend className="px-2 text-xs font-bold uppercase tracking-[.12em] text-ink/55">
                          Size option {String(index + 1).padStart(2, "0")}
                        </legend>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="text-sm font-semibold">
                            Website size
                            <input
                              className={field}
                              value={variant.sizeLabel || ""}
                              placeholder="10 × 10 in"
                              onChange={(event) =>
                                updateVariant(variant.id, {
                                  sizeLabel: event.target.value.replace(
                                    /\s+x\s+/gi,
                                    " × ",
                                  ),
                                })
                              }
                            />
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
                                  sizeLabel:
                                    variant.sizeLabel ||
                                    suggestSize(item?.name || ""),
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
                              name={`default-fourthwall-${product.id}-${type.value}`}
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
                                variants.filter(
                                  (item) => item.id !== variant.id,
                                ),
                              )
                            }
                          >
                            <Trash2 size={15} /> Remove
                          </button>
                        </div>
                        {duplicate && (
                          <p
                            role="alert"
                            className="mt-3 text-sm font-semibold text-warning"
                          >
                            This Fourthwall product is already assigned to
                            another size.
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
                </div>
                <button
                  type="button"
                  className="button-secondary mt-3"
                  onClick={() =>
                    updateVariants([
                      ...variants,
                      {
                        ...createVariant(type.value, variants.length),
                        isDefault: formatOptions.length === 0,
                      },
                    ])
                  }
                >
                  <Plus size={16} /> Add {type.label} Size
                </button>
              </section>
            );
          })}
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
