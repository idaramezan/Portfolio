import { Router, type NextFunction, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { emailShell, escapeHtml, sendEmail } from "../lib/email";

const router = Router();
const ORDER_STATUSES = ["order_placed", "packing", "shipping", "cancelled", "returned"] as const;
const SHIPPING_STATUSES = ["customer_side", "customer_in_order", "paid_by_me"] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];
type RequestedItem = { productId: string; kind: "original" | "print" | "studio-mail"; quantity: number };
type StoredItem = RequestedItem & { name: string; unitPriceMinor: number; currency: string; lineTotalMinor: number };

async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS manual_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    country_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'order_placed',
    shipping_status TEXT NOT NULL,
    shipping_price_minor INTEGER,
    shipping_currency TEXT,
    notes TEXT,
    items JSONB NOT NULL,
    totals JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shipped_email_sent_at TIMESTAMPTZ
  )`);
}

function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const expected = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || request.headers["x-admin-password"] !== expected)
    return response.status(401).json({ error: "Admin authentication required" });
  return next();
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", { style: "currency", currency }).format(minor / 100);
}

function itemRows(items: StoredItem[]) {
  return items.map((item) => `<tr><td style="padding:9px 0;border-bottom:1px solid #ded5c6">${escapeHtml(item.name)} × ${item.quantity}</td><td style="padding:9px 0;border-bottom:1px solid #ded5c6;text-align:right">${escapeHtml(money(item.lineTotalMinor, item.currency))}</td></tr>`).join("");
}

async function sendPlacedEmail(order: any) {
  const firstName = escapeHtml(String(order.customer_name).trim().split(/\s+/)[0]);
  const totals = Object.entries(order.totals as Record<string, number>).map(([currency, amount]) => money(Number(amount), currency)).join(" + ");
  await sendEmail({
    to: order.customer_email,
    subject: `Your studio order ${order.order_no} is placed`,
    html: emailShell(`<p style="font-size:17px">Dear ${firstName},</p><h1 style="font-family:Georgia,serif;font-size:34px;line-height:1.15">Your order is safely with me.</h1><p style="font-size:16px;line-height:1.7">Thank you for choosing a piece from my studio. I’ll prepare everything personally and keep you updated as it makes its way to you.</p><p style="padding:14px;background:#f3efe6"><strong>Order ${escapeHtml(order.order_no)}</strong></p><table style="width:100%;border-collapse:collapse;font-size:14px">${itemRows(order.items)}</table><p style="text-align:right;font-size:16px"><strong>Total: ${escapeHtml(totals)}</strong></p>`),
  });
}

async function sendShippedEmail(order: any) {
  const firstName = escapeHtml(String(order.customer_name).trim().split(/\s+/)[0]);
  await sendEmail({
    to: order.customer_email,
    subject: `Your order ${order.order_no} is on its way`,
    html: emailShell(`<p style="font-size:17px">Dear ${firstName},</p><h1 style="font-family:Georgia,serif;font-size:34px;line-height:1.15">A little piece of the studio is on its way.</h1><p style="font-size:16px;line-height:1.75">I’ve carefully packed and sent your order <strong>${escapeHtml(order.order_no)}</strong>. I hope opening it feels as special as preparing it did.</p><p style="font-size:16px;line-height:1.75">Thank you again for supporting my work and giving it a place in your world.</p>`),
  });
}

router.use(requireAdmin);

router.get("/", async (request, response) => {
  try {
    await ensureTable();
    const result = await pool.query("SELECT * FROM manual_orders ORDER BY created_at DESC");
    return response.json({ orders: result.rows });
  } catch (error) {
    request.log.error({ error }, "Failed to list orders");
    return response.status(500).json({ error: "Orders could not be loaded" });
  }
});

router.post("/", async (request, response) => {
  const body = request.body ?? {};
  const requestedItems = Array.isArray(body.items) ? body.items as RequestedItem[] : [];
  if (![body.customerName, body.customerAddress, body.customerPhone, body.customerEmail, body.countryCode].every((value) => typeof value === "string" && value.trim()) || !String(body.customerEmail).includes("@"))
    return response.status(400).json({ error: "Complete and valid customer details are required" });
  if (!SHIPPING_STATUSES.includes(body.shippingStatus) || !requestedItems.length)
    return response.status(400).json({ error: "At least one item and a shipping payment option are required" });
  if (body.status && !ORDER_STATUSES.includes(body.status))
    return response.status(400).json({ error: "A valid order status is required" });

  const client = await pool.connect();
  try {
    await ensureTable();
    await client.query("BEGIN");
    const settingsResult = await client.query("SELECT payload FROM shop_settings WHERE id = $1 FOR UPDATE", ["primary"]);
    const settings = settingsResult.rows[0]?.payload;
    if (!settings) throw new Error("The shop catalog has not been saved yet");
    const catalogs = {
      original: settings.originalProducts ?? [],
      print: settings.printProducts ?? [],
      "studio-mail": settings.studioMailPackages ?? [],
    } as Record<string, any[]>;
    const seenOriginals = new Set<string>();
    const items: StoredItem[] = requestedItems.map((requested) => {
      if (!catalogs[requested.kind] || !Number.isInteger(requested.quantity) || requested.quantity < 1) throw new Error("An order item is invalid");
      const product = catalogs[requested.kind].find((candidate) => candidate.id === requested.productId);
      if (!product) throw new Error("A selected product no longer exists");
      if (requested.kind === "original") {
        if (requested.quantity !== 1 || seenOriginals.has(product.id)) throw new Error("Only one of each original may be ordered");
        if (["sold", "sold_out", "archived"].includes(product.status) || product.available === false) throw new Error(`${product.name} is already sold`);
        seenOriginals.add(product.id);
      }
      const unitPriceMinor = Number(product.priceMinor ?? product.priceUsdCents);
      const currency = product.priceCurrency ?? (requested.kind === "original" ? "USD" : "TRY");
      if (!Number.isFinite(unitPriceMinor) || unitPriceMinor < 0) throw new Error(`${product.name || product.title} has an invalid price`);
      return { ...requested, name: product.name || product.title, unitPriceMinor, currency, lineTotalMinor: unitPriceMinor * requested.quantity };
    });
    const totals = items.reduce<Record<string, number>>((sum, item) => ({ ...sum, [item.currency]: (sum[item.currency] || 0) + item.lineTotalMinor }), {});
    const shippingPriceMinor = body.shippingStatus === "customer_side" || body.shippingPrice === "" || body.shippingPrice == null ? null : Math.round(Number(body.shippingPrice) * 100);
    if (shippingPriceMinor != null && (!Number.isFinite(shippingPriceMinor) || shippingPriceMinor < 0)) throw new Error("Shipping price is invalid");
    if (shippingPriceMinor != null) totals[body.shippingCurrency || "TRY"] = (totals[body.shippingCurrency || "TRY"] || 0) + shippingPriceMinor;
    const inserted = await client.query(`INSERT INTO manual_orders (customer_name, customer_address, customer_phone, customer_email, country_code, status, shipping_status, shipping_price_minor, shipping_currency, notes, items, totals) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb) RETURNING *`, [body.customerName.trim(), body.customerAddress.trim(), body.customerPhone.trim(), body.customerEmail.toLowerCase().trim(), body.countryCode, body.status || "order_placed", body.shippingStatus, shippingPriceMinor, shippingPriceMinor == null ? null : body.shippingCurrency || "TRY", body.notes?.trim() || null, JSON.stringify(items), JSON.stringify(totals)]);
    const order = inserted.rows[0];
    order.order_no = `AR-${new Date(order.created_at).getFullYear()}-${String(order.id).padStart(6, "0")}`;
    await client.query("UPDATE manual_orders SET order_no = $1 WHERE id = $2", [order.order_no, order.id]);
    if (seenOriginals.size) {
      settings.originalProducts = settings.originalProducts.map((product: any) => seenOriginals.has(product.id) ? { ...product, status: "sold_out", available: false, updatedAt: new Date().toISOString() } : product);
      await client.query("UPDATE shop_settings SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(settings), "primary"]);
    }
    await client.query("COMMIT");
    let emailSent = true;
    try { await sendPlacedEmail(order); } catch (error) { emailSent = false; request.log.error({ error }, "Failed to send order confirmation"); }
    return response.status(201).json({ order, emailSent });
  } catch (error) {
    await client.query("ROLLBACK");
    request.log.error({ error }, "Failed to create order");
    return response.status(400).json({ error: error instanceof Error ? error.message : "Order could not be created" });
  } finally { client.release(); }
});

router.patch("/:id/status", async (request, response) => {
  if (!ORDER_STATUSES.includes(request.body?.status as OrderStatus)) return response.status(400).json({ error: "A valid order status is required" });
  try {
    await ensureTable();
    const current = await pool.query("SELECT * FROM manual_orders WHERE id = $1", [request.params.id]);
    if (!current.rows[0]) return response.status(404).json({ error: "Order not found" });
    const shouldEmail = request.body.status === "shipping" && current.rows[0].status !== "shipping" && !current.rows[0].shipped_email_sent_at;
    const result = await pool.query("UPDATE manual_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [request.body.status, request.params.id]);
    let emailSent = !shouldEmail;
    if (shouldEmail) {
      try {
        await sendShippedEmail(result.rows[0]);
        await pool.query("UPDATE manual_orders SET shipped_email_sent_at = NOW() WHERE id = $1", [request.params.id]);
        emailSent = true;
      } catch (error) { request.log.error({ error }, "Failed to send shipping confirmation"); }
    }
    return response.json({ order: result.rows[0], emailSent });
  } catch (error) {
    request.log.error({ error }, "Failed to update order status");
    return response.status(500).json({ error: "Order status could not be updated" });
  }
});

export default router;
