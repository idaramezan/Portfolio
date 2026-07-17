import { Router } from "express";

const router = Router();
const FOURTHWALL_BASE = "https://storefront-api.fourthwall.com";
const SHOP_DOMAIN = "aeda-shop.fourthwall.com";

// Fetches all pages from Fourthwall and returns normalized product list
async function fetchAllProducts(token: string, currency = "CAD") {
  const allProducts: any[] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const url = `${FOURTHWALL_BASE}/v1/collections/all/products?storefront_token=${token}&currency=${currency}&pageSize=50&page=${page}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Fourthwall API error: ${res.status}`);
    const json = await res.json();
    allProducts.push(...(json.results ?? []));
    hasNext = json.paging?.hasNextPage ?? false;
    page++;
  }

  return allProducts.map((p: any) => {
    // Pick the lowest price across variants as the "starting from" price
    const prices: number[] = (p.variants ?? [])
      .map((v: any) => v.unitPrice?.value)
      .filter((v: any) => typeof v === "number");
    const minPrice = prices.length ? Math.min(...prices) : null;
    const currency = (p.variants?.[0]?.unitPrice?.currency) ?? "CAD";
    const hasMultipleVariants = (p.variants ?? []).length > 1;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      imageUrl: p.images?.[0]?.url ?? null,
      images: (p.images ?? []).slice(0, 4).map((img: any) => img.url),
      price: minPrice,
      currency,
      hasVariants: hasMultipleVariants,
      state: p.state?.type ?? "AVAILABLE",
      checkoutUrl: `https://${SHOP_DOMAIN}/products/${p.slug}`,
    };
  });
}

// GET /api/prints — all Fourthwall products
router.get("/", async (req, res) => {
  const token = process.env.FOURTHWALL_API_TOKEN;
  if (!token) {
    return res.status(503).json({ error: "Fourthwall not configured" });
  }

  try {
    const currency = typeof req.query.currency === "string" ? req.query.currency : "CAD";
    const products = await fetchAllProducts(token, currency);
    return res.json(products);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Fourthwall products");
    return res.status(502).json({ error: "Failed to fetch products from Fourthwall" });
  }
});

// GET /api/prints/:slug — single product detail
router.get("/:slug", async (req, res) => {
  const token = process.env.FOURTHWALL_API_TOKEN;
  if (!token) {
    return res.status(503).json({ error: "Fourthwall not configured" });
  }

  try {
    const currency = typeof req.query.currency === "string" ? req.query.currency : "CAD";
    const url = `${FOURTHWALL_BASE}/v1/products/${req.params.slug}?storefront_token=${token}&currency=${currency}`;
    const fw = await fetch(url, { headers: { Accept: "application/json" } });
    if (!fw.ok) {
      return res.status(fw.status).json({ error: "Product not found" });
    }
    return res.json(await fw.json());
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Fourthwall product");
    return res.status(502).json({ error: "Failed to fetch product" });
  }
});

export default router;
