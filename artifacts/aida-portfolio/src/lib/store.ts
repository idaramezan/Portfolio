import { assetImages, mysteryMailCoverImage } from "@/lib/assets";
import {
  calculatePrintPrice,
  formatPrintSize,
  getFinishPriceDifference,
  normalizePrintOptions,
} from "@/lib/turkiye-products";
import type {
  PrintFraming,
  PrintProductOptions,
  TshirtColor,
  TurkeyProductCategory,
} from "@/lib/turkiye-products";
import {
  isPurchasable,
  normalizeOriginalStatus,
  normalizeProductStatus,
  type OriginalStatus,
  type ProductStatus,
} from "@/lib/product-status";
import {
  normalizeArtworkSurface,
  type ArtworkSurface,
} from "@/lib/artwork-surface";
import type { CurrencyCode } from "@/lib/market";

export interface PricingMigrationAudit {
  previousAmountMinor: number;
  previousCurrency: CurrencyCode;
  appliedConversionRate: number;
  conversionDate: string;
  newAmountMinor: number;
}

export type ProductCategory = "Prints" | "T-shirts" | "Mugs" | "Stickers";
export type ProductKind = "original" | "print" | "studio-mail" | "product";

export interface ManagedProduct {
  id: string;
  kind: "print" | "original";
  name: string;
  description: string;
  imageUrl: string;
  priceUsdCents: number;
  priceCurrency?: CurrencyCode;
  priceMinor?: number;
  pricingMigration?: PricingMigrationAudit;
  pricingMigrationReviewed?: boolean;
  available: boolean;
  maxPerUser: number;
  dimension: string;
  artworkSurface?: ArtworkSurface;
  printType?: "T-shirt" | "Mug" | "Print" | "Sticker";
  slug?: string;
  status: ProductStatus | OriginalStatus;
  featured?: boolean;
  updatedAt?: string;
  altText?: string;
  availableInTurkiye?: boolean;
  availableInternationally?: boolean;
  category?: TurkeyProductCategory;
  galleryImages?: string[];
  inventory?: number;
  displayOrder?: number;
  freeShippingInTurkiye?: boolean;
  printOptions?: PrintProductOptions;
  tshirtOptions?: { availableColors: TshirtColor[] };
  mugOptions?: { color: "white" };
  stickerOptions?: {
    formatDescription?: string;
    approximateDimensions?: string;
  };
  printOptionWarnings?: string[];
}

export type ShoppingRegion = "TR" | "INTERNATIONAL";

export interface StudioMailPackage {
  id: string;
  slug: string;
  title: string;
  titleTr?: string;
  theme: string;
  shortDescription: string;
  shortDescriptionTr?: string;
  fullDescription: string;
  coverImage: string;
  galleryImages: string[];
  contents: string[];
  priceUsdCents: number;
  priceCurrency?: "TRY";
  priceMinor?: number;
  pricingMigration?: PricingMigrationAudit;
  pricingMigrationReviewed?: boolean;
  inventory: number;
  lowStockThreshold: number;
  showExactInventory: boolean;
  status: ProductStatus;
  featured: boolean;
  displayOrder: number;
  shippingCountries: ["TR"];
  shippingNote: string;
  dispatchTime?: string;
  expiresAt?: string;
  timezone?: string;
  vagueSubtitle?: string;
  maximumQuantity?: number;
  includesExclusivePrint?: true;
  includesStickers?: true;
  mysteryItemsNote?: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  number: string;
  greeting: string;
  referencePrefix: string;
  shippingNote: string;
}

export interface ShopSettings {
  whatsapp: WhatsAppSettings;
  printProducts: ManagedProduct[];
  originalProducts: ManagedProduct[];
  studioMailPackages: StudioMailPackage[];
  mysteryMail: MysteryMailSettings;
  siteLinks: {
    instagramUrl: string;
    tiktokUrl: string;
    youtubeUrl: string;
    instagramHandle: string;
    tiktokHandle: string;
    youtubeLabel: string;
    linkHubEnabled: boolean;
    linkHubDescription: string;
  };
}

export interface MysteryMailEmptyState {
  eyebrow?: string;
  heading?: string;
  description?: string;
  supportingLine?: string;
  primaryCtaLabel?: string;
  primaryCtaUrl?: string;
}

export interface MysteryMailSettings {
  storefrontMode: "active-edition" | "not-available-yet";
  activeEditionId?: string;
  emptyState?: MysteryMailEmptyState;
}

export const DEFAULT_MYSTERY_MAIL_EMPTY_STATE: Required<MysteryMailEmptyState> =
  {
    eyebrow: "MYSTERY MAIL · BETWEEN EDITIONS",
    heading: "Something new is taking shape.",
    description:
      "There is no Mystery Mail available at the moment. The next sealed edition will appear when a new idea is ready to leave Aida’s studio.",
    supportingLine:
      "Each edition is released for a limited time and created only once.",
    primaryCtaLabel: "Explore the Türkiye Shop",
    primaryCtaUrl: "/shop/turkiye",
  };

export interface CartItem {
  id: string;
  productId?: string;
  kind: ProductKind;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  productOrigin?: "local" | "fourthwall";
  market?: "turkiye" | "international";
  priceUsdCents: number;
  canonicalCurrency?: CurrencyCode;
  canonicalPriceMinor?: number;
  displayCurrency?: CurrencyCode;
  convertedUnitPriceMinor?: number;
  appliedExchangeRate?: number;
  exchangeRateDate?: string;
  quantity: number;
  maxQuantity?: number;
  artworkId?: string;
  artworkTitle?: string;
  category?: ProductCategory;
  sizeLabel?: string;
  shippingRestriction?: string;
  configurationKey?: string;
  printConfiguration?: {
    sizeId: string;
    sizeLabel: string;
    sizeSecondaryLabel?: string;
    framing: PrintFraming;
    basePriceUsdCents: number;
    sizeDifferenceUsdCents: number;
    frameDifferenceUsdCents: number;
    finalUnitPriceUsdCents: number;
    lineTotalUsdCents?: number;
  };
  calculatedUnitPriceUsdCents?: number;
  calculatedLineTotalUsdCents?: number;
  selectedSizeId?: string;
  selectedFinishId?: PrintFraming;
  selectedColor?: TshirtColor | "white";
  expiresAt?: string;
}

const SETTINGS_STORAGE_KEY = "aida-shop-settings-v2";
const LEGACY_SETTINGS_KEY = "aida-shop-settings";
const LEGACY_CART_STORAGE_KEY = "aida-shop-cart-v2";
const CART_STORAGE_KEYS: Record<ShoppingRegion, string> = {
  TR: "basket:turkiye",
  INTERNATIONAL: "basket:international",
};
const ACTIVE_REGION_KEY = "aida-active-shop-region";
const ADMIN_DATA_SCHEMA_VERSION = 5;
const SCHEMA_VERSION_KEY = "aida-admin-data-schema-version";
const LEGACY_BACKUP_KEY = "aida-shop-settings-backup-v1";
const STATUS_MIGRATION_BACKUP_KEY =
  "aida-shop-settings-backup-before-status-v3";
const PRINT_PRICING_BACKUP_KEY =
  "aida-shop-settings-backup-before-print-pricing-v4";
const PRINT_PRICING_REPORT_KEY = "aida-print-pricing-migration-report-v4";

const defaultMail: StudioMailPackage = {
  id: "studio-mail-first-edition",
  slug: "first-edition",
  title: "Mystery Mail — First Edition",
  titleTr: "Gizemli Posta — İlk Edisyon",
  theme: "Studio Notes",
  shortDescription:
    "A limited themed parcel with an art postcard, handwritten note, stickers, and studio keepsakes.",
  shortDescriptionTr:
    "Sanat kartı, el yazısı not, çıkartmalar ve stüdyo hatıraları içeren sınırlı temalı bir paket.",
  fullDescription:
    "A small collection of paper pieces prepared and packed by Aida in the studio.",
  coverImage: assetImages[13],
  galleryImages: [assetImages[13], assetImages[14]],
  contents: [
    "One art postcard",
    "One handwritten note",
    "Studio stickers",
    "Small curated extras",
  ],
  priceUsdCents: 70000,
  priceCurrency: "TRY",
  priceMinor: 70000,
  inventory: 8,
  lowStockThreshold: 4,
  showExactInventory: true,
  status: "published",
  featured: true,
  displayOrder: 1,
  shippingCountries: ["TR"],
  shippingNote: "Delivery within Türkiye only",
  dispatchTime: "Confirmed personally on WhatsApp",
  expiresAt: "2026-12-31T20:59:00.000Z",
  timezone: "Europe/Istanbul",
  maximumQuantity: 2,
  includesExclusivePrint: true,
  includesStickers: true,
  mysteryItemsNote: "Other mystery studio items",
};

export function getDefaultSettings(): ShopSettings {
  return {
    whatsapp: {
      enabled: true,
      number: (import.meta.env.VITE_WHATSAPP_ORDER_NUMBER || "").replace(
        /\D/g,
        "",
      ),
      greeting: "Hello Aida,",
      referencePrefix: "AR",
      shippingNote: "Shipping is not included and will be confirmed directly.",
    },
    printProducts: [
      {
        id: "print-1",
        kind: "print",
        name: "Signed Studio Print",
        description: "A signed studio print, packed flat with care.",
        imageUrl: assetImages[4],
        priceUsdCents: 90000,
        priceCurrency: "TRY",
        priceMinor: 90000,
        available: true,
        status: "published",
        maxPerUser: 5,
        dimension: "8 × 10 in",
        printType: "Print",
        category: "print",
        slug: "signed-studio-print",
        galleryImages: [],
        displayOrder: 1,
        freeShippingInTurkiye: false,
        printOptions: {
          sizes: [
            {
              id: "standard",
              label: "8 × 10 in",
              additionalPriceUsdCents: 0,
              available: true,
              isBaseSize: true,
              displayOrder: 1,
            },
          ],
          framing: {
            unframedAvailable: true,
            framedAvailable: false,
            defaultFinish: "unframed",
            frameAdditionalPriceUsdCents: 0,
          },
        },
      },
    ],
    originalProducts: [
      {
        id: "quiet-studio",
        kind: "original",
        name: "Quiet Studio",
        description: "One-of-a-kind original oil pastel on paper.",
        imageUrl: assetImages[1],
        priceUsdCents: 12000,
        priceCurrency: "USD",
        priceMinor: 12000,
        available: true,
        status: "available",
        maxPerUser: 1,
        dimension: "21 × 29.7 cm · Unframed",
        artworkSurface: "paper",
        availableInTurkiye: true,
        availableInternationally: true,
      },
      {
        id: "evening-window",
        kind: "original",
        name: "Evening Window",
        description: "One-of-a-kind original oil pastel on paper.",
        imageUrl: assetImages[3],
        priceUsdCents: 14500,
        priceCurrency: "USD",
        priceMinor: 14500,
        available: true,
        status: "available",
        maxPerUser: 1,
        dimension: "30 × 40 cm · Unframed",
        artworkSurface: "paper",
        availableInTurkiye: true,
        availableInternationally: true,
      },
      {
        id: "untitled-study",
        kind: "original",
        name: "Untitled Study",
        description: "One-of-a-kind original oil pastel on paper.",
        imageUrl: assetImages[4],
        priceUsdCents: 12000,
        priceCurrency: "USD",
        priceMinor: 12000,
        available: true,
        status: "available",
        maxPerUser: 1,
        dimension: "28 × 38 cm · Unframed",
        artworkSurface: "paper",
        availableInTurkiye: true,
        availableInternationally: true,
      },
    ],
    studioMailPackages: [defaultMail],
    mysteryMail: {
      storefrontMode: "active-edition",
      activeEditionId: defaultMail.id,
      emptyState: DEFAULT_MYSTERY_MAIL_EMPTY_STATE,
    },
    siteLinks: {
      instagramUrl: "https://instagram.com/aedaart",
      tiktokUrl: "https://www.tiktok.com/@aedapaints",
      youtubeUrl: "https://www.youtube.com/@AedaArt",
      instagramHandle: "@aedaart",
      tiktokHandle: "@aedapaints",
      youtubeLabel: "AedaArt",
      linkHubEnabled: true,
      linkHubDescription:
        "Original oil pastel art, studio prints and collectible mail.",
    },
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

const OBSOLETE_MIGRATION_STORAGE_KEYS = [
  LEGACY_BACKUP_KEY,
  STATUS_MIGRATION_BACKUP_KEY,
  PRINT_PRICING_BACKUP_KEY,
  PRINT_PRICING_REPORT_KEY,
] as const;

function isStorageQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function clearObsoleteMigrationStorage() {
  OBSOLETE_MIGRATION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function writeSettingsStorage(serialized: string) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, serialized);
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
    clearObsoleteMigrationStorage();
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, serialized);
    } catch (retryError) {
      if (!isStorageQuotaError(retryError)) throw retryError;
      throw new Error(
        "The product catalog is too large for browser storage. Remove unused legacy products or oversized embedded media, then try again.",
      );
    }
  }
  clearObsoleteMigrationStorage();
}

export function loadShopSettings(): ShopSettings {
  const defaults = getDefaultSettings();
  if (!isBrowser()) return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const storedVersion = Number(
        localStorage.getItem(SCHEMA_VERSION_KEY) || 0,
      );
      const normalized: ShopSettings = {
        ...defaults,
        ...saved,
        mysteryMail: {
          ...defaults.mysteryMail,
          ...(saved.mysteryMail || {}),
          emptyState: {
            ...DEFAULT_MYSTERY_MAIL_EMPTY_STATE,
            ...(saved.mysteryMail?.emptyState || {}),
          },
        },
        printProducts: Array.isArray(saved.printProducts)
          ? saved.printProducts.map(
              (product: ManagedProduct, index: number) => {
                const isPrint = (product.category || "print") === "print";
                const printOptions = isPrint
                  ? product.printOptions || {
                      sizes: [
                        {
                          id: `legacy-${product.id}`,
                          label: product.dimension || "Standard",
                          additionalPriceUsdCents: 0,
                          available: true,
                          isBaseSize: true,
                          displayOrder: 1,
                        },
                      ],
                      framing: {
                        unframedAvailable: true,
                        framedAvailable: false,
                        frameAdditionalPriceUsdCents: 0,
                      },
                    }
                  : undefined;
                const migratedOptions = printOptions
                  ? {
                      ...printOptions,
                      sizes: printOptions.sizes.map((size) => {
                        const absolutePrice = (size as any)
                          .absolutePriceUsdCents;
                        return Number.isInteger(absolutePrice)
                          ? {
                              ...size,
                              additionalPriceUsdCents: Math.max(
                                0,
                                absolutePrice - product.priceUsdCents,
                              ),
                            }
                          : size;
                      }),
                      framing: {
                        ...printOptions.framing,
                        frameAdditionalPriceUsdCents: Number.isInteger(
                          (printOptions.framing as any)
                            .absoluteFramePriceUsdCents,
                        )
                          ? Math.max(
                              0,
                              (printOptions.framing as any)
                                .absoluteFramePriceUsdCents -
                                product.priceUsdCents,
                            )
                          : printOptions.framing.frameAdditionalPriceUsdCents,
                      },
                    }
                  : undefined;
                const normalizedOptions = migratedOptions
                  ? normalizePrintOptions(migratedOptions)
                  : undefined;
                const printOptionWarnings = (normalizedOptions?.sizes || [])
                  .filter((size) => formatPrintSize(size).mismatch)
                  .map(
                    (size) =>
                      `${size.label}: centimetre and inch measurements do not match. Review this size in admin.`,
                  );
                return {
                  category: "print" as const,
                  slug: product.slug || product.id,
                  galleryImages: product.galleryImages || [],
                  displayOrder: product.displayOrder ?? index + 1,
                  freeShippingInTurkiye: false,
                  ...product,
                  status: normalizeProductStatus(
                    product.status,
                    product.available,
                  ),
                  available:
                    normalizeProductStatus(
                      product.status,
                      product.available,
                    ) === "published",
                  printOptions: normalizedOptions,
                  printOptionWarnings,
                };
              },
            )
          : defaults.printProducts,
        originalProducts: Array.isArray(saved.originalProducts)
          ? saved.originalProducts.map((product: ManagedProduct) => ({
              availableInTurkiye: true,
              availableInternationally: true,
              ...product,
              artworkSurface: normalizeArtworkSurface(
                product.artworkSurface,
              ),
              status: normalizeOriginalStatus(
                product.status,
                product.available,
              ),
              available:
                normalizeOriginalStatus(product.status, product.available) ===
                "available",
            }))
          : defaults.originalProducts,
        studioMailPackages: Array.isArray(saved.studioMailPackages)
          ? saved.studioMailPackages.map((item: StudioMailPackage) => ({
              ...item,
              status: normalizeProductStatus(item.status, item.inventory > 0),
              title: item.title.replace(/^Studio Mail/i, "Mystery Mail"),
              expiresAt: item.expiresAt || "2026-12-31T20:59:00.000Z",
              timezone: item.timezone || "Europe/Istanbul",
              maximumQuantity: item.maximumQuantity || 2,
              includesExclusivePrint: true as const,
              includesStickers: true as const,
              mysteryItemsNote:
                item.mysteryItemsNote || "Other mystery studio items",
            }))
          : defaults.studioMailPackages,
      };
      if (storedVersion < ADMIN_DATA_SCHEMA_VERSION) {
        writeSettingsStorage(JSON.stringify(normalized));
        localStorage.setItem(
          SCHEMA_VERSION_KEY,
          String(ADMIN_DATA_SCHEMA_VERSION),
        );
        if (import.meta.env.DEV) {
          const review = [
            ...normalized.originalProducts,
            ...normalized.printProducts,
            ...normalized.studioMailPackages,
          ].filter((product) => product.status === "sold_out");
          console.info("Product status migration complete", {
            version: ADMIN_DATA_SCHEMA_VERSION,
            backupKey: STATUS_MIGRATION_BACKUP_KEY,
            normalizedRecords: review.map((product) => product.id),
          });
        }
      }
      return normalized;
    }
    const legacyRaw = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!legacyRaw) return defaults;
    const legacy = JSON.parse(legacyRaw);
    if (!localStorage.getItem(LEGACY_BACKUP_KEY))
      localStorage.setItem(LEGACY_BACKUP_KEY, legacyRaw);
    const migrate = (p: any): ManagedProduct => ({
      ...p,
      priceUsdCents: Number(p.priceUsdCents ?? p.priceCents ?? 0),
    });
    const migrated: ShopSettings = {
      ...defaults,
      whatsapp: {
        ...defaults.whatsapp,
        number: String(legacy.whatsappNumber || "").replace(/\D/g, ""),
      },
      printProducts: (Array.isArray(legacy.printProducts)
        ? legacy.printProducts
        : defaults.printProducts
      ).map(migrate),
      originalProducts: (Array.isArray(legacy.originalProducts)
        ? legacy.originalProducts
        : defaults.originalProducts
      ).map((product: ManagedProduct) => ({
        ...migrate(product),
        artworkSurface: normalizeArtworkSurface(product.artworkSurface),
      })),
    };
    writeSettingsStorage(JSON.stringify(migrated));
    localStorage.setItem(SCHEMA_VERSION_KEY, String(ADMIN_DATA_SCHEMA_VERSION));
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    if (import.meta.env.DEV)
      console.info("Admin data migration complete", {
        version: ADMIN_DATA_SCHEMA_VERSION,
        originals: migrated.originalProducts.length,
        prints: migrated.printProducts.length,
        studioMail: migrated.studioMailPackages.length,
      });
    return migrated;
  } catch {
    return defaults;
  }
}
function saveShopSettingsLocally(settings: ShopSettings) {
  if (!isBrowser()) return;
  const normalizeManaged = (product: ManagedProduct): ManagedProduct => {
    const status = normalizeProductStatus(product.status, product.available);
    return { ...product, status, available: status === "published" };
  };
  const canonical: ShopSettings = {
    ...settings,
    originalProducts: settings.originalProducts.map((product) => {
      const status = normalizeOriginalStatus(product.status, product.available);
      return {
        ...product,
        priceCurrency: "USD",
        priceMinor: product.priceMinor ?? product.priceUsdCents,
        artworkSurface: normalizeArtworkSurface(product.artworkSurface),
        status,
        available: status === "available",
      };
    }),
    printProducts: settings.printProducts.map((product) => ({
      ...normalizeManaged(product),
      priceCurrency: "TRY",
      priceMinor: product.priceMinor ?? product.priceUsdCents,
    })),
    studioMailPackages: settings.studioMailPackages.map((product) => ({
      ...product,
      priceCurrency: "TRY",
      priceMinor: product.priceMinor ?? product.priceUsdCents,
      status: normalizeProductStatus(product.status, product.inventory > 0),
    })),
  };
  const serialized = JSON.stringify(canonical);
  writeSettingsStorage(serialized);
  if (localStorage.getItem(SETTINGS_STORAGE_KEY) !== serialized)
    throw new Error("The product record could not be verified after saving");
  window.dispatchEvent(new Event("shop-settings:updated"));
  return canonical;
}

export function saveShopSettings(settings: ShopSettings) {
  const canonical = saveShopSettingsLocally(settings);
  if (!canonical || !isBrowser()) return;
  const password = sessionStorage.getItem("aida-admin-password");
  if (!password) return;
  void fetch("/api/admin/shop-settings", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-admin-password": password,
    },
    body: JSON.stringify({ settings: canonical }),
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      window.dispatchEvent(
        new CustomEvent("shop-settings:sync-error", {
          detail: payload.error || "The catalog could not be saved to the database.",
        }),
      );
    }
  }).catch(() => {
    window.dispatchEvent(
      new CustomEvent("shop-settings:sync-error", {
        detail: "The catalog could not be saved to the database.",
      }),
    );
  });
}

let shopSettingsHydration: Promise<void> | null = null;

export function hydrateShopSettingsFromServer(seedIfEmpty = false) {
  if (!isBrowser()) return Promise.resolve();
  if (shopSettingsHydration) return shopSettingsHydration;
  shopSettingsHydration = fetch("/api/shop-settings", { cache: "no-store" })
    .then(async (response) => {
      if (response.status === 204) {
        if (seedIfEmpty) saveShopSettings(loadShopSettings());
        return;
      }
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.settings) saveShopSettingsLocally(payload.settings);
    })
    .finally(() => {
      shopSettingsHydration = null;
    });
  return shopSettingsHydration;
}

export function getActiveShoppingRegion(): ShoppingRegion {
  if (!isBrowser()) return "TR";
  const stored = localStorage.getItem(ACTIVE_REGION_KEY);
  return stored === "INTERNATIONAL" ? "INTERNATIONAL" : "TR";
}
export function setActiveShoppingRegion(region: ShoppingRegion) {
  if (!isBrowser()) return;
  localStorage.setItem(ACTIVE_REGION_KEY, region);
  window.dispatchEvent(
    new CustomEvent("shop-region:updated", { detail: region }),
  );
}

export function getCanonicalCartItemPricing(
  item: CartItem,
  settings: ShopSettings = loadShopSettings(),
) {
  if (item.convertedUnitPriceMinor != null && item.displayCurrency === "TRY")
    return {
      unitPriceCents: item.convertedUnitPriceMinor,
      lineTotalCents: item.convertedUnitPriceMinor * item.quantity,
    };
  if (!item.printConfiguration)
    return {
      unitPriceCents: item.priceUsdCents,
      lineTotalCents: item.priceUsdCents * item.quantity,
    };

  const productId =
    item.productId ||
    item.id
      .split(":")[0]
      .replace(/^print-product-/, "")
      .replace(/^product-/, "");
  const product = settings.printProducts.find(
    (entry) => entry.id === productId,
  );
  const size = product?.printOptions?.sizes.find(
    (entry) => entry.id === item.printConfiguration?.sizeId,
  );
  if (!product?.printOptions || !size?.available) return null;
  const finish = item.printConfiguration.framing;
  if (
    finish === "framed"
      ? !product.printOptions.framing.framedAvailable
      : !product.printOptions.framing.unframedAvailable
  )
    return null;

  return calculatePrintPrice({
    basePriceCents: product.priceUsdCents,
    sizePriceDifferenceCents: size.additionalPriceUsdCents,
    finishPriceDifferenceCents: getFinishPriceDifference(
      product.printOptions,
      finish,
    ),
    quantity: item.quantity,
  });
}

export function loadCart(
  region: ShoppingRegion = getActiveShoppingRegion(),
): CartItem[] {
  if (!isBrowser()) return [];
  try {
    let raw = localStorage.getItem(CART_STORAGE_KEYS[region]);
    if (!raw && region === "TR") {
      raw = localStorage.getItem(LEGACY_CART_STORAGE_KEY);
      if (raw) localStorage.setItem(CART_STORAGE_KEYS.TR, raw);
    }
    const cart: CartItem[] = raw ? JSON.parse(raw) : [];
    const settings = loadShopSettings();
    return cart.map((item) => {
      const originalId = item.id.startsWith("original-")
        ? item.id.slice("original-".length)
        : null;
      const baseItemId = item.id.split(":")[0];
      const printId = baseItemId.startsWith("print-product-")
        ? baseItemId.slice("print-product-".length)
        : baseItemId.startsWith("product-")
          ? baseItemId.slice("product-".length)
          : null;
      const product = originalId
        ? settings.originalProducts.find((entry) => entry.id === originalId)
        : printId
          ? settings.printProducts.find((entry) => entry.id === printId)
          : settings.studioMailPackages.find((entry) => entry.id === item.id);
      if (!product) return item;
      const refreshed = {
        ...item,
        title: "name" in product ? product.name : product.title,
        imageUrl:
          "imageUrl" in product ? product.imageUrl : mysteryMailCoverImage,
      };
      const pricing = getCanonicalCartItemPricing(refreshed, settings);
      if (!pricing) return refreshed;
      return {
        ...refreshed,
        priceUsdCents: pricing.unitPriceCents,
        calculatedUnitPriceUsdCents: pricing.unitPriceCents,
        calculatedLineTotalUsdCents: pricing.lineTotalCents,
        printConfiguration: refreshed.printConfiguration
          ? {
              ...refreshed.printConfiguration,
              finalUnitPriceUsdCents: pricing.unitPriceCents,
              lineTotalUsdCents: pricing.lineTotalCents,
            }
          : undefined,
      };
    });
  } catch {
    return [];
  }
}
export function saveCart(
  cart: CartItem[],
  region: ShoppingRegion = getActiveShoppingRegion(),
) {
  if (!isBrowser()) return;
  localStorage.setItem(CART_STORAGE_KEYS[region], JSON.stringify(cart));
  window.dispatchEvent(new Event("cart:updated"));
}
export function clearCart(region: ShoppingRegion = getActiveShoppingRegion()) {
  saveCart([], region);
}
export function getCartCount(
  region: ShoppingRegion = getActiveShoppingRegion(),
) {
  return loadCart(region).reduce((n, x) => n + x.quantity, 0);
}
export function addItemToCart(
  item: CartItem,
  maxPerUser: number,
  region: ShoppingRegion = getActiveShoppingRegion(),
) {
  if (item.productOrigin === "fourthwall")
    return {
      ok: false,
      reason: "International products are ordered directly through Fourthwall.",
    };
  if (region === "INTERNATIONAL" && item.kind !== "original")
    return {
      ok: false,
      reason: "The International basket accepts original paintings only.",
    };
  const settings = loadShopSettings();
  if (!isCartItemAvailable(item, settings, Date.now(), region))
    return { ok: false, reason: "This item is no longer available." };
  const canonicalPricing = getCanonicalCartItemPricing(item, settings);
  if (!canonicalPricing)
    return {
      ok: false,
      reason: "This print configuration is no longer available.",
    };
  item = {
    ...item,
    priceUsdCents: canonicalPricing.unitPriceCents,
    calculatedUnitPriceUsdCents: canonicalPricing.unitPriceCents,
    calculatedLineTotalUsdCents: canonicalPricing.lineTotalCents,
    printConfiguration: item.printConfiguration
      ? {
          ...item.printConfiguration,
          finalUnitPriceUsdCents: canonicalPricing.unitPriceCents,
          lineTotalUsdCents: canonicalPricing.lineTotalCents,
        }
      : undefined,
  };
  const cart = loadCart(region);
  const lineId = item.configurationKey
    ? `${item.id}:${item.configurationKey}`
    : item.id;
  const normalizedItem = { ...item, id: lineId };
  const existing = cart.find((x) => x.id === lineId);
  const next = (existing?.quantity || 0) + item.quantity;
  const max = Math.max(1, item.kind === "original" ? 1 : maxPerUser);
  if (next > max)
    return { ok: false, reason: `You can add up to ${max} of this piece.` };
  if (existing) existing.quantity = next;
  else
    cart.push({
      ...normalizedItem,
      productOrigin: "local",
      maxQuantity: max,
    });
  saveCart(cart, region);
  return { ok: true };
}

export function isMysteryMailCartItemAvailable(
  item: CartItem,
  settings: ShopSettings = loadShopSettings(),
  now = Date.now(),
) {
  if (item.kind !== "studio-mail") return true;
  const editionId = item.id.split(":")[0];
  const edition = settings.studioMailPackages.find(
    (entry) => entry.id === editionId,
  );
  return Boolean(
    settings.mysteryMail.storefrontMode === "active-edition" &&
    settings.mysteryMail.activeEditionId === editionId &&
    edition &&
    isPurchasable(edition) &&
    edition.inventory > 0 &&
    edition.expiresAt &&
    now < Date.parse(edition.expiresAt),
  );
}

export function isCartItemAvailable(
  item: CartItem,
  settings: ShopSettings = loadShopSettings(),
  now = Date.now(),
  region: ShoppingRegion = getActiveShoppingRegion(),
) {
  if (item.kind === "studio-mail")
    return isMysteryMailCartItemAvailable(item, settings, now);

  const baseItemId = item.id.split(":")[0];
  if (item.kind === "original") {
    const id = baseItemId.replace(/^original-/, "");
    const product = settings.originalProducts.find((entry) => entry.id === id);
    return Boolean(
      product &&
      isPurchasable(product) &&
      (region === "TR"
        ? product.availableInTurkiye !== false
        : product.availableInternationally !== false),
    );
  }

  const id = baseItemId.replace(/^print-product-/, "").replace(/^product-/, "");
  const product = settings.printProducts.find((entry) => entry.id === id);
  if (!product || !isPurchasable(product)) return false;
  if (item.printConfiguration) {
    const size = product.printOptions?.sizes.find(
      (entry) => entry.id === item.printConfiguration?.sizeId,
    );
    if (!size?.available) return false;
    const framing = product.printOptions?.framing;
    if (
      item.printConfiguration.framing === "framed"
        ? !framing?.framedAvailable
        : !framing?.unframedAvailable
    )
      return false;
  }
  return true;
}
export function updateCartItemQuantity(
  id: string,
  quantity: number,
  region: ShoppingRegion = getActiveShoppingRegion(),
) {
  const cart = loadCart(region);
  const item = cart.find((x) => x.id === id);
  if (!item) return;
  const safe = Math.min(Math.max(0, quantity), item.maxQuantity || 99);
  saveCart(
    safe === 0
      ? cart.filter((x) => x.id !== id)
      : cart.map((x) => (x.id === id ? { ...x, quantity: safe } : x)),
    region,
  );
}
export function removeCartItem(
  id: string,
  region: ShoppingRegion = getActiveShoppingRegion(),
) {
  saveCart(
    loadCart(region).filter((x) => x.id !== id),
    region,
  );
}
