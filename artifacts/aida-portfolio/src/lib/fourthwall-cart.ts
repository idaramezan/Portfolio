export type FourthwallCartItem = {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  format: string;
  variantName: string;
  imageUrl?: string;
  quantity: number;
  unitAmountMinor: number;
  currency: string;
};

type PersistedCart = {
  cartId: string;
  currency: string;
  items: FourthwallCartItem[];
};

const STORAGE_KEY = "aeda-fourthwall-cart-v1";
const DIRECT_CART_ID = "direct-cart";

export function loadFourthwallCart(): PersistedCart {
  if (typeof window === "undefined")
    return { cartId: "", currency: "USD", items: [] };
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!value || !Array.isArray(value.items)) throw new Error();
    return {
      cartId: typeof value.cartId === "string" ? value.cartId : "",
      currency: typeof value.currency === "string" ? value.currency : "USD",
      items: value.items,
    };
  } catch {
    return { cartId: "", currency: "USD", items: [] };
  }
}

function save(cart: PersistedCart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("fourthwall-cart:updated"));
  window.dispatchEvent(new Event("cart:updated"));
}

function clear() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("fourthwall-cart:updated"));
  window.dispatchEvent(new Event("cart:updated"));
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (result.invalidCart) clear();
    throw new Error(
      result.error || "We couldn't update your basket. Please try again.",
    );
  }
  return result;
}

async function ensureCart(
  currency: string,
  firstItem: { variantId: string; quantity: number },
) {
  const current = loadFourthwallCart();
  if (current.cartId) return { cart: current, createdWithItem: false };
  let created: any;
  try {
    created = await request("/api/fourthwall/cart", {
      method: "POST",
      body: JSON.stringify({ currency, items: [firstItem] }),
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "This basket has expired."
    )
      throw error;
    created = { id: DIRECT_CART_ID };
  }
  const next = { cartId: String(created.id || ""), currency, items: [] };
  if (!next.cartId)
    throw new Error("We couldn't start your basket. Please try again.");
  save(next);
  return { cart: next, createdWithItem: true };
}

export async function addFourthwallCartItem(item: FourthwallCartItem) {
  let ensured = await ensureCart(item.currency, {
    variantId: item.variantId,
    quantity: item.quantity,
  });
  let cart = ensured.cart;
  const existing = cart.items.find(
    (entry) => entry.variantId === item.variantId,
  );
  const quantity = (existing?.quantity || 0) + item.quantity;
  try {
    if (ensured.createdWithItem) {
      save({ ...cart, items: [...cart.items, item] });
      return;
    }
    if (cart.cartId === DIRECT_CART_ID) {
      save({
        ...cart,
        items: existing
          ? cart.items.map((entry) =>
              entry.variantId === item.variantId
                ? { ...entry, ...item, quantity }
                : entry,
            )
          : [...cart.items, item],
      });
      return;
    }
    await request(
      `/api/fourthwall/cart/${encodeURIComponent(cart.cartId)}/add?currency=${encodeURIComponent(cart.currency)}`,
      {
        method: "POST",
        body: JSON.stringify({
          items: [{ variantId: item.variantId, quantity: item.quantity }],
        }),
      },
    );
  } catch (error) {
    if (!loadFourthwallCart().cartId) {
      ensured = await ensureCart(item.currency, {
        variantId: item.variantId,
        quantity: item.quantity,
      });
      cart = ensured.cart;
      if (ensured.createdWithItem) {
        save({ ...cart, items: [item] });
        return;
      }
      await request(
        `/api/fourthwall/cart/${encodeURIComponent(cart.cartId)}/add?currency=${encodeURIComponent(cart.currency)}`,
        {
          method: "POST",
          body: JSON.stringify({
            items: [{ variantId: item.variantId, quantity: item.quantity }],
          }),
        },
      );
    } else throw error;
  }
  save({
    ...cart,
    items: existing
      ? cart.items.map((entry) =>
          entry.variantId === item.variantId
            ? { ...entry, ...item, quantity }
            : entry,
        )
      : [...cart.items, item],
  });
}

export async function updateFourthwallCartItem(
  variantId: string,
  quantity: number,
) {
  const cart = loadFourthwallCart();
  if (!cart.cartId) return;
  if (quantity <= 0) return removeFourthwallCartItem(variantId);
  if (cart.cartId === DIRECT_CART_ID) {
    save({
      ...cart,
      items: cart.items.map((item) =>
        item.variantId === variantId ? { ...item, quantity } : item,
      ),
    });
    return;
  }
  await request(
    `/api/fourthwall/cart/${encodeURIComponent(cart.cartId)}/change?currency=${encodeURIComponent(cart.currency)}`,
    {
      method: "POST",
      body: JSON.stringify({ items: [{ variantId, quantity }] }),
    },
  );
  save({
    ...cart,
    items: cart.items.map((item) =>
      item.variantId === variantId ? { ...item, quantity } : item,
    ),
  });
}

export async function removeFourthwallCartItem(variantId: string) {
  const cart = loadFourthwallCart();
  if (!cart.cartId) return;
  const item = cart.items.find((entry) => entry.variantId === variantId);
  if (cart.cartId === DIRECT_CART_ID) {
    save({
      ...cart,
      items: cart.items.filter((entry) => entry.variantId !== variantId),
    });
    return;
  }
  await request(
    `/api/fourthwall/cart/${encodeURIComponent(cart.cartId)}/remove?currency=${encodeURIComponent(cart.currency)}`,
    {
      method: "POST",
      body: JSON.stringify({
        items: [{ variantId, quantity: item?.quantity || 1 }],
      }),
    },
  );
  save({
    ...cart,
    items: cart.items.filter((entry) => entry.variantId !== variantId),
  });
}

export async function validateFourthwallCart() {
  const cart = loadFourthwallCart();
  if (!cart.cartId) return;
  const remote = await request(
    `/api/fourthwall/cart/${encodeURIComponent(cart.cartId)}?currency=${encodeURIComponent(cart.currency)}`,
  );
  if (!Array.isArray(remote?.items)) return;
  const refreshed = cart.items.flatMap((item) => {
    const match = remote.items.find(
      (entry: any) => entry?.variant?.id === item.variantId,
    );
    if (!match || Number(match.quantity) <= 0) return [];
    const amount = Number(match.variant?.unitPrice?.value);
    return [
      {
        ...item,
        quantity: Math.floor(Number(match.quantity)),
        unitAmountMinor: Number.isFinite(amount)
          ? Math.round(amount * 100)
          : item.unitAmountMinor,
        currency:
          String(match.variant?.unitPrice?.currency || item.currency) ||
          item.currency,
      },
    ];
  });
  save({ ...cart, items: refreshed });
}

export async function getFourthwallCheckoutUrl() {
  const cart = loadFourthwallCart();
  if (!cart.cartId || !cart.items.length)
    throw new Error("Your basket is empty.");
  if (cart.cartId === DIRECT_CART_ID) {
    const result = await request("/api/fourthwall/checkout", {
      method: "POST",
      body: JSON.stringify({
        currency: cart.currency,
        items: cart.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }),
    });
    return String(result.checkoutUrl || "");
  }
  const result = await request(
    `/api/fourthwall/cart/${encodeURIComponent(cart.cartId)}/checkout?currency=${encodeURIComponent(cart.currency)}`,
  );
  return String(result.checkoutUrl || "");
}

export function getFourthwallCartCount() {
  return loadFourthwallCart().items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
}
