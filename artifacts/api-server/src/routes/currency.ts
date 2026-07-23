import { Router, type Request } from "express";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const router = Router();
type CachedRate = { rate: number; rateDate: string; fetchedAt: string; provider: string };
let cache: CachedRate | null = null;
const overrideFile = path.resolve(process.env.DATA_DIR || "data", "usd-try-rate-override.json");

async function readOverride(): Promise<CachedRate | null> {
  try {
    const value = JSON.parse(await readFile(overrideFile, "utf8"));
    const rate = Number(value.rate);
    return Number.isFinite(rate) && rate > 0 ? { ...value, rate, provider: "Manual admin override" } : null;
  } catch { return null; }
}

export function getRequestCountry(req: Request): string | null {
  const value = req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || req.headers["x-country-code"];
  const code = Array.isArray(value) ? value[0] : value;
  return typeof code === "string" && /^[A-Z]{2}$/i.test(code) ? code.toUpperCase() : null;
}

function istanbulDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function fetchRate(): Promise<{ value: CachedRate | null; fallback: boolean }> {
  const manual = await readOverride();
  if (manual) return { value: manual, fallback: false };
  const today = istanbulDate();
  if (cache?.rateDate === today) return { value: cache, fallback: false };
  const url = process.env.FX_API_URL || process.env.EXCHANGE_RATE_PROVIDER_URL || "https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY";
  const key = process.env.FX_API_KEY || process.env.EXCHANGE_RATE_API_KEY;
  try {
    const response = await fetch(url, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const data: any = await response.json();
    const rate = Number(data.rate ?? data.rates?.TRY);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Provider response has no valid TRY rate");
    cache = { rate, rateDate: today, fetchedAt: new Date().toISOString(), provider: new URL(url).hostname };
    return { value: cache, fallback: false };
  } catch {
    return { value: cache, fallback: Boolean(cache) };
  }
}

async function respond(req: Request, res: any) {
  const result = await fetchRate();
  return res.status(result.value ? 200 : 503).json({
    country: getRequestCountry(req), base: "USD", quote: "TRY",
    baseCurrency: "USD", quoteCurrency: "TRY", rate: result.value?.rate ?? null,
    rateDate: result.value?.rateDate ?? null, fetchedAt: result.value?.fetchedAt ?? null,
    provider: result.value?.provider ?? null, isFallback: result.fallback || !result.value,
    isManual: result.value?.provider === "Manual admin override",
  });
}

router.get("/currency", respond);
router.get("/exchange-rates/USD/TRY", respond);
router.post("/admin/currency/refresh", async (req, res) => { cache = null; return respond(req, res); });
router.put("/admin/currency/rate", async (req, res) => {
  const rate = Number(req.body?.rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 10_000)
    return res.status(400).json({ error: "Enter a finite positive USD to TRY rate." });
  const value: CachedRate = { rate, rateDate: istanbulDate(), fetchedAt: new Date().toISOString(), provider: "Manual admin override" };
  await mkdir(path.dirname(overrideFile), { recursive: true });
  await writeFile(overrideFile, JSON.stringify(value, null, 2), "utf8");
  cache = value;
  return respond(req, res);
});
router.delete("/admin/currency/rate", async (req, res) => {
  try { await unlink(overrideFile); } catch (error: any) { if (error?.code !== "ENOENT") throw error; }
  cache = null;
  return respond(req, res);
});
export default router;
