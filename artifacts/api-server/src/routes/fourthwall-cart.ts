import { Router } from "express";

const router = Router();
const LEGACY_API_ORIGIN =
  "https://storefront-api.fourthwall.com/api/public/v1.0";
const CURRENT_API_ORIGIN = "https://storefront-api.fourthwall.com/v1";

function token() {
  return String(process.env.FOURTHWALL_STOREFRONT_TOKEN || "").trim();
}

function validId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,160}$/.test(value);
}

function currency(value: unknown) {
  return /^[A-Z]{3}$/.test(String(value || "")) ? String(value) : "USD";
}

function cartPath(path: string, value: unknown) {
  return `${path}?currency=${encodeURIComponent(currency(value))}`;
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

function safeProviderError(data: any) {
  if (!data || typeof data !== "object") return null;
  const details = [
    ...(Array.isArray(data) ? data : []),
    data.detail,
    data.title,
    data.errors,
  ]
    .filter((value) => value !== undefined)
    .map((value) => (typeof value === "string" ? value : JSON.stringify(value)))
    .join(" | ")
    .slice(0, 500);
  return {
    code: typeof data.code === "string" ? data.code.slice(0, 120) : undefined,
    message:
      typeof data.message === "string" ? data.message.slice(0, 300) : undefined,
    error:
      typeof data.error === "string" ? data.error.slice(0, 300) : undefined,
    details: details || undefined,
  };
}

async function provider(
  path: string,
  init?: RequestInit,
  origin = LEGACY_API_ORIGIN,
) {
  const storefrontToken = token();
  if (!storefrontToken) {
    console.error("[fourthwall-cart] configuration missing", {
      tokenConfigured: false,
    });
    return {
      ok: false,
      status: 503,
      data: null,
      providerCode: "TOKEN_MISSING",
    };
  }
  const url = new URL(`${origin}${path}`);
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
    const providerError = safeProviderError(data);
    if (!response.ok)
      console.error("[fourthwall-cart] provider rejected request", {
        method: init?.method || "GET",
        host: url.host,
        path: url.pathname,
        status: response.status,
        tokenConfigured: true,
        providerError,
      });
    return {
      ok: response.ok,
      status: response.status,
      data,
      providerCode: providerError?.code || providerError?.error || undefined,
      providerDetails:
        providerError?.message || providerError?.details || undefined,
    };
  } catch (error) {
    console.error("[fourthwall-cart] provider request failed", {
      method: init?.method || "GET",
      host: url.host,
      path: url.pathname,
      tokenConfigured: true,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      ok: false,
      status: 502,
      data: null,
      providerCode: "UPSTREAM_UNREACHABLE",
    };
  }
}

async function compatibleProvider(path: string, init?: RequestInit) {
  const legacy = await provider(path, init);
  if (legacy.status !== 404) return legacy;
  return provider(path, init, CURRENT_API_ORIGIN);
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
    providerStatus: result.status,
    ...(result.providerCode ? { providerCode: result.providerCode } : {}),
  });
}

router.post("/fourthwall/cart", async (req, res) => {
  const selectedCurrency = currency(req.body?.currency);
  const normalized = items(req.body);
  if (!normalized)
    return res.status(400).json({ error: "Invalid basket item." });
  let result = await provider(
    `/carts?currency=${encodeURIComponent(selectedCurrency)}`,
    {
      method: "POST",
      body: JSON.stringify({ items: normalized }),
    },
  );
  if (result.status === 404)
    result = await provider(
      "/carts",
      {
        method: "POST",
        body: JSON.stringify({ currency: selectedCurrency, items: normalized }),
      },
      CURRENT_API_ORIGIN,
    );
  return reply(res, result, "We couldn't start your basket. Please try again.");
});

router.get("/fourthwall/cart/:cartId", async (req, res) => {
  if (!validId(req.params.cartId))
    return res.status(400).json({ error: "Invalid basket." });
  return reply(
    res,
    await compatibleProvider(
      cartPath(
        `/carts/${encodeURIComponent(req.params.cartId)}`,
        req.query.currency,
      ),
    ),
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
      await compatibleProvider(
        cartPath(
          `/carts/${encodeURIComponent(req.params.cartId)}/${action}`,
          req.query.currency,
        ),
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

router.post("/fourthwall/checkout", (req, res) => {
  const normalized = items(req.body);
  if (!normalized)
    return res.status(400).json({ error: "Invalid basket item." });
  const origin = checkoutOrigin();
  if (!origin)
    return res
      .status(503)
      .json({ error: "Checkout is temporarily unavailable." });
  const selectedCurrency = currency(req.body?.currency);
  const url = new URL("/cart/checkout", origin);
  url.searchParams.set(
    "products",
    normalized
      .map(
        (item: { variantId: string; quantity: number }) =>
          `${item.variantId}:${item.quantity}`,
      )
      .join(","),
  );
  url.searchParams.set("currency", selectedCurrency);
  return res.json({ checkoutUrl: url.toString() });
});

export default router;
