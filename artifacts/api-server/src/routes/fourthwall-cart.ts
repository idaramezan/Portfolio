import { Router } from "express";

const router = Router();
const API_ORIGIN = "https://storefront-api.fourthwall.com/v1";

function token() {
  return String(process.env.FOURTHWALL_STOREFRONT_TOKEN || "").trim();
}

function validId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,160}$/.test(value);
}

function checkoutOrigin() {
  const configured = String(
    process.env.FOURTHWALL_CHECKOUT_DOMAIN || "",
  ).trim();
  const fallback = String(process.env.FOURTHWALL_SHOP_URL || "").trim();
  const value = configured || fallback;
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function items(body: any) {
  if (
    !Array.isArray(body?.items) ||
    body.items.length < 1 ||
    body.items.length > 50
  )
    return null;
  const normalized = body.items.map((item: any) => ({
    variantId: String(item?.variantId || ""),
    quantity: Math.floor(Number(item?.quantity)),
  }));
  return normalized.every(
    (item: any) =>
      validId(item.variantId) && item.quantity >= 0 && item.quantity <= 99,
  )
    ? normalized
    : null;
}

async function provider(path: string, init?: RequestInit) {
  const storefrontToken = token();
  if (!storefrontToken) return { ok: false, status: 503, data: null };
  const url = new URL(`${API_ORIGIN}${path}`);
  url.searchParams.set("storefront_token", storefrontToken);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 502, data: null };
  }
}

function reply(
  res: any,
  result: Awaited<ReturnType<typeof provider>>,
  message: string,
) {
  if (result.ok) return res.json(result.data);
  const invalid = result.status === 404 || result.status === 410;
  return res.status(invalid ? 410 : result.status >= 500 ? 503 : 400).json({
    error: invalid ? "This basket has expired." : message,
    invalidCart: invalid,
  });
}

router.post("/fourthwall/cart", async (req, res) => {
  const currency = /^[A-Z]{3}$/.test(String(req.body?.currency || ""))
    ? String(req.body.currency)
    : "USD";
  return reply(
    res,
    await provider("/carts", {
      method: "POST",
      body: JSON.stringify({ currency }),
    }),
    "We couldn't start your basket. Please try again.",
  );
});

router.get("/fourthwall/cart/:cartId", async (req, res) => {
  if (!validId(req.params.cartId))
    return res.status(400).json({ error: "Invalid basket." });
  return reply(
    res,
    await provider(`/carts/${encodeURIComponent(req.params.cartId)}`),
    "We couldn't refresh your basket. Please try again.",
  );
});

for (const action of ["add", "change", "remove"] as const) {
  router.post(`/fourthwall/cart/:cartId/${action}`, async (req, res) => {
    if (!validId(req.params.cartId))
      return res.status(400).json({ error: "Invalid basket." });
    const normalized = items(req.body);
    if (!normalized)
      return res.status(400).json({ error: "Invalid basket item." });
    return reply(
      res,
      await provider(
        `/carts/${encodeURIComponent(req.params.cartId)}/${action}`,
        {
          method: "POST",
          body: JSON.stringify({
            items:
              action === "remove"
                ? normalized.map((item: { variantId: string }) => ({
                    variantId: item.variantId,
                  }))
                : normalized,
          }),
        },
      ),
      action === "add"
        ? "We couldn't add this piece to your basket. Please try again."
        : "We couldn't update your basket. Please try again.",
    );
  });
}

router.get("/fourthwall/cart/:cartId/checkout", (req, res) => {
  if (!validId(req.params.cartId))
    return res.status(400).json({ error: "Invalid basket." });
  const origin = checkoutOrigin();
  if (!origin)
    return res
      .status(503)
      .json({ error: "Checkout is temporarily unavailable." });
  const currency = /^[A-Z]{3}$/.test(String(req.query.currency || ""))
    ? String(req.query.currency)
    : "USD";
  const url = new URL("/checkout/", origin);
  url.searchParams.set("cartCurrency", currency);
  url.searchParams.set("cartId", req.params.cartId);
  return res.json({ checkoutUrl: url.toString() });
});

export default router;
