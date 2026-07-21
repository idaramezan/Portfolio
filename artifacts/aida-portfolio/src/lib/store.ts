export type ProductCategory = "Prints" | "T-shirts" | "Mugs" | "Stickers";

export interface ShopProductSetting {
  id: string;
  category: ProductCategory;
  name: string;
  priceCents: number;
  available: boolean;
  maxPerUser: number;
  description: string;
}

export interface ManagedProduct {
  id: string;
  kind: "print" | "original";
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  available: boolean;
  maxPerUser: number;
  dimension: string;
  printType?: "T-shirt" | "Mug" | "Print" | "Sticker";
}

export interface MailPrintSettings {
  enabled: boolean;
  title: string;
  description: string;
  priceCents: number;
  available: boolean;
  monthLabel: string;
}

export interface ShopSettings {
  whatsappNumber: string;
  mailPrint: MailPrintSettings;
  products: ShopProductSetting[];
  printProducts: ManagedProduct[];
  originalProducts: ManagedProduct[];
}

export interface CartItem {
  id: string;
  kind: "original" | "print" | "mailprint" | "product";
  title: string;
  subtitle?: string;
  priceCents: number;
  quantity: number;
  artworkId?: string;
  artworkTitle?: string;
  category?: ProductCategory;
  sizeLabel?: string;
}

const SETTINGS_STORAGE_KEY = "aida-shop-settings";
const CART_STORAGE_KEY = "aida-shop-cart";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isBrowser() {
  return typeof window !== "undefined";
}

export function getDefaultSettings(): ShopSettings {
  const monthLabel = MONTHS[new Date().getMonth()] || "This month";
  return {
    whatsappNumber: "+15551234567",
    mailPrint: {
      enabled: true,
      title: `Get ${monthLabel}'s surprise mail print`,
      description:
        "A handwritten letter from Aida, plus a small print of one of this month's live-session paintings.",
      priceCents: 1800,
      available: true,
      monthLabel,
    },
    products: [
      {
        id: "prints",
        category: "Prints",
        name: "Fine art print order",
        priceCents: 4500,
        available: true,
        maxPerUser: 5,
        description: "Ready for a collector to order a print with a personal note.",
      },
      {
        id: "tshirts",
        category: "T-shirts",
        name: "Studio tee",
        priceCents: 2800,
        available: true,
        maxPerUser: 3,
        description: "A soft cotton tee with a studio mark.",
      },
      {
        id: "mugs",
        category: "Mugs",
        name: "Ceramic mug",
        priceCents: 2200,
        available: true,
        maxPerUser: 3,
        description: "A hand-finished mug for daily studio rituals.",
      },
      {
        id: "stickers",
        category: "Stickers",
        name: "Sticker pack",
        priceCents: 900,
        available: true,
        maxPerUser: 10,
        description: "A playful sticker pack for everyday art-loving joy.",
      },
    ],
    printProducts: [
      {
        id: "print-1",
        kind: "print",
        name: "Signed Studio Print",
        description: "A limited run print, signed and ready to ship.",
        imageUrl: "",
        priceCents: 4500,
        available: true,
        maxPerUser: 5,
        dimension: "8 x 10 in",
        printType: "Print",
      },
    ],
    originalProducts: [
      {
        id: "original-1",
        kind: "original",
        name: "Studio Original Artwork",
        description: "A hand-selected original piece from the collection.",
        imageUrl: "",
        priceCents: 120000,
        available: false,
        maxPerUser: 1,
        dimension: "12 x 16 in",
      },
    ],
  };
}

const isPlaceholderManagedProduct = (product: ManagedProduct) =>
  product.id.startsWith("new-") || !product.name.trim();

function normalizeSettings(settings: ShopSettings | null): ShopSettings {
  const defaults = getDefaultSettings();
  if (!settings) return defaults;

  const products = defaults.products.map((defaultProduct) => {
    const existing = settings.products?.find((product) => product.id === defaultProduct.id);
    return existing
      ? {
          ...defaultProduct,
          ...existing,
          category: existing.category || defaultProduct.category,
          maxPerUser: existing.maxPerUser || defaultProduct.maxPerUser,
        }
      : defaultProduct;
  });

  return {
    whatsappNumber: settings.whatsappNumber || defaults.whatsappNumber,
    mailPrint: {
      ...defaults.mailPrint,
      ...settings.mailPrint,
      monthLabel: settings.mailPrint?.monthLabel || defaults.mailPrint.monthLabel,
    },
    products,
    printProducts: Array.isArray(settings.printProducts)
      ? settings.printProducts
          .filter((product) => !isPlaceholderManagedProduct(product))
          .map((product) => ({
            id: product.id,
            kind: product.kind,
            name: product.name || "",
            description: product.description || "",
            imageUrl: product.imageUrl || "",
            priceCents: product.priceCents || 0,
            available: typeof product.available === "boolean" ? product.available : true,
            maxPerUser: product.maxPerUser || 5,
            dimension: product.dimension || "",
            printType: product.printType || "Print",
          }))
      : defaults.printProducts,
    originalProducts: Array.isArray(settings.originalProducts)
      ? settings.originalProducts
          .filter((product) => !isPlaceholderManagedProduct(product))
          .map((product) => ({
            id: product.id,
            kind: product.kind,
            name: product.name || "",
            description: product.description || "",
            imageUrl: product.imageUrl || "",
            priceCents: product.priceCents || 0,
            available: typeof product.available === "boolean" ? product.available : true,
            maxPerUser: product.maxPerUser || 1,
            dimension: product.dimension || "",
            printType: product.printType,
          }))
      : defaults.originalProducts,
  };
}

export function loadShopSettings(): ShopSettings {
  if (!isBrowser()) return getDefaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return getDefaultSettings();
  }
}

export function saveShopSettings(settings: ShopSettings) {
  if (!isBrowser()) return;
  const normalized = normalizeSettings(settings);
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event("shop-settings:updated"));
}

export function loadCart(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cart:updated"));
}

export function clearCart() {
  saveCart([]);
}

export function getCartCount() {
  return loadCart().reduce((count, item) => count + item.quantity, 0);
}

export function addItemToCart(item: CartItem, maxPerUser: number) {
  const cart = loadCart();
  const existing = cart.find((entry) => entry.id === item.id);
  const nextQuantity = (existing?.quantity || 0) + item.quantity;

  if (nextQuantity > maxPerUser) {
    return { ok: false, reason: `You can only order ${maxPerUser} of these per person.` };
  }

  if (existing) {
    existing.quantity = nextQuantity;
  } else {
    cart.push(item);
  }

  saveCart(cart);
  return { ok: true };
}

export function updateCartItemQuantity(id: string, quantity: number) {
  const cart = loadCart();
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;

  const next = cart.filter((entry) => entry.id !== id);
  if (quantity > 0) {
    next.push({ ...item, quantity });
  }
  saveCart(next);
}

export function removeCartItem(id: string) {
  const cart = loadCart().filter((item) => item.id !== id);
  saveCart(cart);
}
