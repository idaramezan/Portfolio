import {
  loadShopSettings,
  saveShopSettings,
  type ManagedProduct,
  type ShopSettings,
  type StudioMailPackage,
} from "@/lib/store";
import {
  normalizeOriginalStatus,
  normalizeProductStatus,
} from "@/lib/product-status";
import { normalizeArtworkSurface } from "@/lib/artwork-surface";
export type CatalogKind = "originals" | "prints" | "studio-mail";
const canonicalize = <T extends ManagedProduct | StudioMailPackage>(
  product: T,
  kind?: CatalogKind,
): T => {
  const isOriginal =
    kind === "originals" || ("kind" in product && product.kind === "original");
  const status = isOriginal
    ? normalizeOriginalStatus(
        product.status,
        "available" in product && product.available,
      )
    : normalizeProductStatus(
        product.status,
        "available" in product ? product.available : product.inventory > 0,
      );
  return {
    ...product,
    ...(isOriginal
      ? {
          priceCurrency: "USD",
          priceMinor: product.priceMinor ?? product.priceUsdCents,
          artworkSurface: normalizeArtworkSurface(
            (product as ManagedProduct).artworkSurface,
          ),
        }
      : {
          priceCurrency: "TRY",
          priceMinor: product.priceMinor ?? product.priceUsdCents,
        }),
    status,
    ...("available" in product
      ? {
          available: isOriginal
            ? status === "available"
            : status === "published",
        }
      : {}),
  } as T;
};
export const mergeProductRecord = <
  T extends ManagedProduct | StudioMailPackage,
>(
  existing: T,
  changes: Partial<T>,
  id: string,
  updatedAt = new Date().toISOString(),
  kind?: CatalogKind,
) =>
  canonicalize(
    {
      ...existing,
      ...changes,
      id,
      updatedAt,
    } as T,
    kind,
  );

export function isPermanentProductImage(value: string) {
  if (!value) return true;
  return (
    value.startsWith("/api/uploads/") ||
    value.startsWith("/api/product-images/") ||
    value.startsWith("/assets/") ||
    /^https:\/\//i.test(value)
  );
}
const key = (kind: CatalogKind) =>
  kind === "originals"
    ? "originalProducts"
    : kind === "prints"
      ? "printProducts"
      : "studioMailPackages";
export const productRepository = {
  getSettings: () => loadShopSettings(),
  getOriginals: () => loadShopSettings().originalProducts,
  getPrints: () => loadShopSettings().printProducts,
  getStudioMailPackages: () => loadShopSettings().studioMailPackages,
  getAll: () => {
    const s = loadShopSettings();
    return [...s.originalProducts, ...s.printProducts, ...s.studioMailPackages];
  },
  getById: (kind: CatalogKind, id: string) => {
    const s = loadShopSettings();
    return (s[key(kind)] as Array<ManagedProduct | StudioMailPackage>).find(
      (x) => x.id === id,
    );
  },
  create: (kind: CatalogKind, product: ManagedProduct | StudioMailPackage) => {
    const s = loadShopSettings();
    const k = key(kind);
    if ((s[k] as any[]).some((x) => x.id === product.id))
      throw new Error("A product with this ID already exists");
    if (
      "imageUrl" in product &&
      !isPermanentProductImage(product.imageUrl || "")
    )
      throw new Error("Upload the image before saving this product");
    const saved = canonicalize(structuredClone(product), kind);
    (s[k] as any[]).push(saved);
    saveShopSettings(s);
    return saved;
  },
  update: (
    kind: CatalogKind,
    id: string,
    changes: Partial<ManagedProduct> | Partial<StudioMailPackage>,
  ) => {
    const s = loadShopSettings();
    const k = key(kind);
    const list = s[k] as any[];
    const index = list.findIndex((x) => x.id === id);
    if (index < 0) throw new Error("Product not found");
    if (
      "imageUrl" in changes &&
      changes.imageUrl !== list[index].imageUrl &&
      !isPermanentProductImage(String(changes.imageUrl || ""))
    )
      throw new Error("Upload the image before saving this product");
    list[index] = mergeProductRecord(
      list[index],
      changes as any,
      id,
      undefined,
      kind,
    );
    saveShopSettings(s);
    return list[index];
  },
  archive: (kind: CatalogKind, id: string) =>
    productRepository.update(kind, id, {
      status: "archived",
      ...(kind !== "studio-mail" ? { available: false } : {}),
    } as any),
  replaceSettings: (settings: ShopSettings) => saveShopSettings(settings),
};
