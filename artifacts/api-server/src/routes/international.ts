import { Router } from "express";

const router = Router();
const API_ORIGIN = "https://storefront-api.fourthwall.com";

type InternationalProduct = {
  id: string; slug: string; name: string; description?: string;
  primaryImage?: { url: string; width?: number; height?: number; alt: string };
  images: { url: string; width?: number; height?: number; alt: string }[];
  price: { amount: number; currency: string; formatted: string };
  compareAtPrice?: { amount: number; currency: string; formatted: string };
  available: boolean; soldOut: boolean;
  variants: { id: string; name: string; available: boolean; price: { amount: number; currency: string; formatted: string } }[];
  externalUrl: string;
};
type Cache = { products: InternationalProduct[]; fetchedAt: string; expiresAt: number; collection: string; lastError: string | null };
let cache: Cache | null = null;
let lastAttempt: string | null = null;

function configuredShopUrl() {
  const raw = process.env.FOURTHWALL_SHOP_URL;
  if (!raw) return null;
  try { const url = new URL(raw); return url.protocol === "https:" ? url : null; } catch { return null; }
}
function productUrl(slug: string) {
  const shop = configuredShopUrl();
  if (!shop) return null;
  const url = new URL(`/products/${encodeURIComponent(slug)}`, shop);
  return url.hostname === shop.hostname ? url.toString() : null;
}
function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
}
function mapProducts(payload: unknown): InternationalProduct[] {
  if (!payload || typeof payload !== "object") throw new Error("Malformed provider response");
  const rows = Array.isArray((payload as any).results) ? (payload as any).results : Array.isArray(payload) ? payload : null;
  if (!rows) throw new Error("Malformed provider response");
  return rows.flatMap((raw: any) => {
    if (!raw || typeof raw.id !== "string" || typeof raw.slug !== "string" || typeof raw.name !== "string") return [];
    const externalUrl = productUrl(raw.slug); if (!externalUrl) return [];
    const variants: InternationalProduct["variants"] = (Array.isArray(raw.variants) ? raw.variants : []).flatMap((variant: any) => {
      const amount = Number(variant?.unitPrice?.value); const currency = String(variant?.unitPrice?.currency || "USD");
      if (!Number.isFinite(amount)) return [];
      return [{ id: String(variant.id || variant.name || "variant"), name: String(variant.name || "Standard"), available: variant.stock?.inStock !== false && variant.state?.type !== "SOLD_OUT", price: { amount, currency, formatted: money(amount, currency) } }];
    });
    if (!variants.length) return [];
    const lowest = variants.reduce((a,b) => a.price.amount <= b.price.amount ? a : b);
    const images = (Array.isArray(raw.images) ? raw.images : []).filter((image:any) => typeof image?.url === "string" && image.url.startsWith("https://")).map((image:any) => ({ url:image.url, width:Number(image.width)||undefined, height:Number(image.height)||undefined, alt:String(image.altText || `${raw.name} product image`) }));
    const available = variants.some(x => x.available);
    return [{ id:raw.id, slug:raw.slug, name:raw.name, description:typeof raw.description === "string" ? raw.description.replace(/<[^>]*>/g, " ").trim() : undefined, primaryImage:images[0], images, price:lowest.price, available, soldOut:!available, variants, externalUrl }];
  });
}
async function refresh() {
  lastAttempt = new Date().toISOString();
  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN;
  if (!token || process.env.FOURTHWALL_INTEGRATION_ENABLED === "false") throw new Error("Integration is not configured");
  const collection = process.env.FOURTHWALL_COLLECTION_HANDLE || "all";
  const url = new URL(`/v1/collections/${encodeURIComponent(collection)}/products`, API_ORIGIN);
  url.searchParams.set("storefront_token", token); url.searchParams.set("pageSize", "50");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept:"application/json" } });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const products = mapProducts(await response.json()); const seconds = Math.max(60, Number(process.env.FOURTHWALL_CACHE_SECONDS || 600));
    cache = { products, fetchedAt:new Date().toISOString(), expiresAt:Date.now()+seconds*1000, collection, lastError:null }; return cache;
  } catch (error) { if (cache) { cache.lastError = "Refresh failed"; return cache; } throw error; }
  finally { clearTimeout(timer); }
}

router.get("/international", async (_req,res) => {
  const enabled = process.env.FOURTHWALL_INTEGRATION_ENABLED !== "false";
  try { const data = cache && cache.expiresAt > Date.now() ? cache : await refresh(); return res.json({ enabled, products:data.products, fetchedAt:data.fetchedAt, collection:data.collection, shopUrl:configuredShopUrl()?.toString() || null, stale:data.expiresAt <= Date.now() }); }
  catch { return res.status(503).json({ enabled, products:[], shopUrl:configuredShopUrl()?.toString() || null, message:"The international collection is temporarily unavailable here." }); }
});
router.get("/admin/international/status", (_req,res) => res.json({ enabled:process.env.FOURTHWALL_INTEGRATION_ENABLED !== "false", tokenConfigured:Boolean(process.env.FOURTHWALL_STOREFRONT_TOKEN), shopUrl:configuredShopUrl()?.toString() || null, collection:process.env.FOURTHWALL_COLLECTION_HANDLE || "all", productCount:cache?.products.length || 0, lastSuccessfulSync:cache?.fetchedAt || null, lastRefreshAttempt:lastAttempt, cacheStatus:cache ? (cache.expiresAt>Date.now()?"fresh":"stale") : "empty", lastError:cache?.lastError || null }));
router.post("/admin/international/refresh", async (_req,res) => { try { cache=null; const data=await refresh(); return res.json({ok:true,productCount:data.products.length,fetchedAt:data.fetchedAt}); } catch { return res.status(503).json({ok:false,error:"International products could not be refreshed"}); } });
router.delete("/admin/international/cache", (_req,res) => { cache=null; return res.status(204).send(); });
export default router;
