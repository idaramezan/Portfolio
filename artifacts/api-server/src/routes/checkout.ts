import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { emailShell, escapeHtml, OWNER_EMAIL, sendEmail } from "../lib/email";
import { getUsdTryRate } from "./currency";
import { calculateCheckoutShipping } from "../lib/checkout-pricing";

const publicRouter = Router();
export const adminCheckoutRouter = Router();
const receiptDir = path.resolve(process.env.PRIVATE_RECEIPTS_DIR || path.join(process.env.DATA_DIR || "data", "private-receipts"));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const accepted = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const attempts = new Map<string, { count: number; reset: number }>();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || req.headers["x-admin-password"] !== expected) return res.status(401).json({ error: "Admin authentication required" });
  return next();
}
function limited(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || "unknown", now = Date.now(), value = attempts.get(key);
  const current = !value || value.reset < now ? { count: 0, reset: now + 15 * 60_000 } : value;
  current.count++; attempts.set(key, current);
  if (current.count > 20) return res.status(429).json({ error: "Please wait before trying again." });
  return next();
}
function signatureOkay(file: Express.Multer.File) {
  const b = file.buffer;
  return file.mimetype === "application/pdf" ? b.subarray(0, 4).toString() === "%PDF" :
    file.mimetype === "image/png" ? b[0] === 0x89 && b.subarray(1, 4).toString() === "PNG" :
    file.mimetype === "image/jpeg" ? b[0] === 0xff && b[1] === 0xd8 :
    file.mimetype === "image/webp" ? b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" : false;
}
const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneValid = (v: string) => /^\+[1-9]\d{7,14}$/.test(v);
const formatMoney = (minor: number, currency: string) => new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", { style: "currency", currency }).format(minor / 100);

async function ensureSchema() {
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS checkout_order_number_seq`);
  await pool.query(`CREATE TABLE IF NOT EXISTS bank_transfer_settings (currency TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE, account_holder TEXT NOT NULL DEFAULT '', bank_name TEXT NOT NULL DEFAULT '', iban TEXT NOT NULL DEFAULT '', swift_bic TEXT, branch_info TEXT, bank_address TEXT, instructions TEXT, notification_email TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`INSERT INTO bank_transfer_settings(currency) VALUES ('TRY'),('USD') ON CONFLICT DO NOTHING`);
  await pool.query(`CREATE TABLE IF NOT EXISTS checkout_orders (id UUID PRIMARY KEY, order_number TEXT UNIQUE NOT NULL, payment_reference TEXT UNIQUE NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, market TEXT NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', customer_full_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_phone TEXT NOT NULL, country_code TEXT NOT NULL, country_name TEXT NOT NULL, province_or_region TEXT, district TEXT, city TEXT, postal_code TEXT NOT NULL, address_line TEXT NOT NULL, delivery_notes TEXT, subtotal_minor INTEGER NOT NULL, shipping_minor INTEGER NOT NULL, grand_total_minor INTEGER NOT NULL, print_quantity INTEGER NOT NULL DEFAULT 0, original_quantity INTEGER NOT NULL DEFAULT 0, receipt_storage_key TEXT NOT NULL, receipt_original_name TEXT NOT NULL, receipt_mime_type TEXT NOT NULL, receipt_size INTEGER NOT NULL, customer_language TEXT NOT NULL DEFAULT 'en', consent_version TEXT NOT NULL, consent_at TIMESTAMPTZ NOT NULL, tracking_carrier TEXT, tracking_number TEXT, tracking_url TEXT, internal_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), packaging_at TIMESTAMPTZ, shipped_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS checkout_order_items (id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES checkout_orders(id) ON DELETE CASCADE, product_id TEXT NOT NULL, product_type TEXT NOT NULL, product_name TEXT NOT NULL, selected_options JSONB NOT NULL DEFAULT '{}'::jsonb, quantity INTEGER NOT NULL, unit_price_minor INTEGER NOT NULL, line_total_minor INTEGER NOT NULL, currency TEXT NOT NULL, image_snapshot TEXT, sku TEXT)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS checkout_order_status_history (id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES checkout_orders(id) ON DELETE CASCADE, previous_status TEXT, new_status TEXT NOT NULL, changed_by_admin_id TEXT, internal_note TEXT, customer_notified BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS event_application_number_seq`);
  await pool.query(`CREATE TABLE IF NOT EXISTS event_applications (id UUID PRIMARY KEY, application_number TEXT UNIQUE NOT NULL, event_id TEXT NOT NULL, full_name TEXT NOT NULL, age INTEGER NOT NULL, eligibility_response TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', customer_language TEXT NOT NULL DEFAULT 'en', consent_version TEXT NOT NULL, consent_at TIMESTAMPTZ NOT NULL, admin_note TEXT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), accepted_at TIMESTAMPTZ, rejected_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ)`);
}

async function calculate(body: any) {
  const market = body.market === "international_original" ? "international_original" : "turkiye";
  const requested = Array.isArray(body.items) ? body.items : [];
  if (!requested.length || requested.length > 30) throw new Error("Your basket is empty or invalid.");
  const result = await pool.query("SELECT payload FROM shop_settings WHERE id='primary'");
  const settings = result.rows[0]?.payload;
  if (!settings) throw new Error("The shop catalogue is unavailable.");
  const currency = market === "turkiye" ? "TRY" : "USD";
  const fx = market === "turkiye" ? await getUsdTryRate() : null;
  const items: any[] = [];
  let printQuantity = 0, originalQuantity = 0;
  for (const input of requested) {
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error("A basket quantity is invalid.");
    const kind = input.kind === "original" ? "original" : input.kind === "print" ? "print" : "";
    if (!kind || (market === "international_original" && kind !== "original")) throw new Error("This item is not eligible for internal checkout.");
    const catalog = kind === "original" ? settings.originalProducts : settings.printProducts;
    const product = catalog?.find((x: any) => x.id === input.productId);
    if (!product || ["sold", "sold_out", "archived", "draft"].includes(product.status) || product.available === false) throw new Error("A selected item is no longer available.");
    if (kind === "original" && (quantity !== 1 || (market === "turkiye" ? product.availableInTurkiye === false : product.availableInternationally === false))) throw new Error("An original is not available for this order.");
    if (kind === "print" && product.availableInTurkiye === false) throw new Error("A print is not available in Türkiye.");
    let unit = Number(product.priceMinor ?? product.priceUsdCents);
    if (kind === "original" && market === "turkiye") {
      if (!fx?.rate) throw new Error("The TRY exchange rate is temporarily unavailable.");
      unit = Math.round(Number(product.priceUsdCents) * fx.rate);
    }
    if (kind === "print" && product.printOptions && input.selectedOptions?.sizeId) {
      const size = product.printOptions.sizes?.find((x: any) => x.id === input.selectedOptions.sizeId && x.available);
      if (!size) throw new Error("A selected print size is unavailable.");
      unit += Number(size.additionalPriceUsdCents || 0);
      if (input.selectedOptions.framing === "framed") {
        if (!product.printOptions.framing?.framedAvailable) throw new Error("Framing is unavailable.");
        unit += Number(product.printOptions.framing.frameAdditionalPriceUsdCents || 0);
      }
    }
    if (!Number.isInteger(unit) || unit < 0) throw new Error("A product price is invalid.");
    if (kind === "print") printQuantity += quantity; else originalQuantity += quantity;
    items.push({ productId: product.id, kind, name: product.name, quantity, unitPriceMinor: unit, lineTotalMinor: unit * quantity, selectedOptions: input.selectedOptions || {}, image: product.imageUrl || null, sku: product.sku || null });
  }
  const subtotalMinor = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  const shippingMinor = calculateCheckoutShipping({ market, printQuantity });
  return { market, currency, items, subtotalMinor, shippingMinor, grandTotalMinor: subtotalMinor + shippingMinor, printQuantity, originalQuantity };
}

publicRouter.post("/quote", limited, async (req, res) => { try { await ensureSchema(); return res.json(await calculate(req.body)); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Checkout could not be calculated." }); } });
publicRouter.get("/bank/:currency", limited, async (req, res) => { try { await ensureSchema(); const currency = req.params.currency === "USD" ? "USD" : "TRY"; const result = await pool.query("SELECT account_holder, bank_name, iban, swift_bic, branch_info, instructions FROM bank_transfer_settings WHERE currency=$1 AND enabled=TRUE", [currency]); if (!result.rows[0]) return res.status(503).json({ error: `${currency} bank transfer is not configured yet.` }); return res.json(result.rows[0]); } catch { return res.status(500).json({ error: "Bank instructions could not be loaded." }); } });
publicRouter.post("/orders", limited, upload.single("receipt"), async (req, res) => {
  const client = await pool.connect(); let storageKey = "";
  try {
    await ensureSchema(); const body = JSON.parse(clean(req.body.payload, 50_000)); const file = req.file;
    if (!file || !accepted.has(file.mimetype) || !signatureOkay(file)) return res.status(400).json({ error: "Upload a valid JPG, PNG, WebP or PDF receipt under 10 MB." });
    const fullName = clean(body.fullName, 120), email = clean(body.email, 254).toLowerCase(), phone = clean(body.phone, 20), countryCode = clean(body.countryCode, 2).toUpperCase();
    if (!fullName || !emailValid(email) || !phoneValid(phone) || !body.consent) return res.status(400).json({ error: "Complete all required contact details and consent." });
    if (body.market === "turkiye" && (countryCode !== "TR" || !/^\d{5}$/.test(clean(body.postalCode, 5)) || !clean(body.province, 80) || !clean(body.district, 80))) return res.status(400).json({ error: "Choose a Turkish province and enter a valid district and five-digit postal code." });
    if (body.market === "international_original" && countryCode === "US") return res.status(400).json({ error: "Original paintings are currently not available for delivery to the United States." });
    if (!clean(body.address, 1000) || !clean(body.city, 100)) return res.status(400).json({ error: "A complete delivery address is required." });
    const quote = await calculate(body); const idempotency = clean(body.idempotencyKey, 100);
    if (!/^[a-zA-Z0-9-]{16,100}$/.test(idempotency)) return res.status(400).json({ error: "Checkout session is invalid. Refresh and try again." });
    const duplicate = await pool.query("SELECT order_number FROM checkout_orders WHERE idempotency_key=$1", [idempotency]);
    if (duplicate.rows[0]) return res.json({ orderNumber: duplicate.rows[0].order_number, duplicate: true });
    await mkdir(receiptDir, { recursive: true }); storageKey = `${randomUUID()}.bin`; await writeFile(path.join(receiptDir, storageKey), file.buffer, { mode: 0o600 });
    await client.query("BEGIN"); const seq = await client.query("SELECT nextval('checkout_order_number_seq') AS value"); const year = new Date().getFullYear(); const number = `AR-${year}-${String(seq.rows[0].value).padStart(6, "0")}`; const reference = `PAY-${idempotency.slice(0, 8).toUpperCase()}`; const orderId = randomUUID();
    await client.query(`INSERT INTO checkout_orders(id,order_number,payment_reference,idempotency_key,market,currency,status,customer_full_name,customer_email,customer_phone,country_code,country_name,province_or_region,district,city,postal_code,address_line,delivery_notes,subtotal_minor,shipping_minor,grand_total_minor,print_quantity,original_quantity,receipt_storage_key,receipt_original_name,receipt_mime_type,receipt_size,customer_language,consent_version,consent_at) VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,'checkout-v1',NOW())`, [orderId,number,reference,idempotency,quote.market,quote.currency,fullName,email,phone,countryCode,clean(body.countryName,100),clean(body.province,100)||null,clean(body.district,100)||null,clean(body.city,100),clean(body.postalCode,20),clean(body.address,1000),clean(body.deliveryNotes,500)||null,quote.subtotalMinor,quote.shippingMinor,quote.grandTotalMinor,quote.printQuantity,quote.originalQuantity,storageKey,file.originalname.slice(0,255),file.mimetype,file.size,body.language === "tr" ? "tr" : "en"]);
    for (const item of quote.items) await client.query(`INSERT INTO checkout_order_items(id,order_id,product_id,product_type,product_name,selected_options,quantity,unit_price_minor,line_total_minor,currency,image_snapshot,sku) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12)`, [randomUUID(),orderId,item.productId,item.kind,item.name,JSON.stringify(item.selectedOptions),item.quantity,item.unitPriceMinor,item.lineTotalMinor,quote.currency,item.image,item.sku]);
    await client.query("INSERT INTO checkout_order_status_history(id,order_id,new_status,customer_notified) VALUES($1,$2,'pending',FALSE)", [randomUUID(),orderId]);
    if (quote.originalQuantity) { const settingsResult = await client.query("SELECT payload FROM shop_settings WHERE id='primary' FOR UPDATE"); const settings = settingsResult.rows[0].payload; const ids = new Set(quote.items.filter(x=>x.kind==='original').map(x=>x.productId)); settings.originalProducts = settings.originalProducts.map((p:any)=>ids.has(p.id)?{...p,status:'sold_out',available:false,updatedAt:new Date().toISOString()}:p); await client.query("UPDATE shop_settings SET payload=$1::jsonb,updated_at=NOW() WHERE id='primary'",[JSON.stringify(settings)]); }
    await client.query("COMMIT");
    const rows = quote.items.map(i=>`<li>${escapeHtml(i.name)} × ${i.quantity}</li>`).join(""); const total = formatMoney(quote.grandTotalMinor, quote.currency);
    void sendEmail({ to: email, subject: `We received your Aida Ramezani order — ${number}`, html: emailShell(`<h1>Your order has been received</h1><p><strong>${number}</strong> is awaiting payment verification.</p><ul>${rows}</ul><p><strong>Total: ${escapeHtml(total)}</strong></p><p>Aida will review your transfer receipt before preparing the order.</p>`) }).catch(err=>req.log.error({err,number},"Order email failed"));
    void sendEmail({ to: process.env.ORDER_NOTIFICATION_EMAIL || OWNER_EMAIL, subject: `New order awaiting review — ${number}`, html: emailShell(`<h1>New order awaiting review</h1><p>${escapeHtml(fullName)} · ${escapeHtml(email)} · ${escapeHtml(phone)}</p><p>${escapeHtml(clean(body.address,1000))}</p><ul>${rows}</ul><p><strong>${escapeHtml(total)}</strong></p><p><a href="${escapeHtml((process.env.PUBLIC_SITE_URL||'https://www.aedaart.com')+`/admin/orders`)}">Open secure admin orders</a></p>`) }).catch(err=>req.log.error({err,number},"Owner order email failed"));
    return res.status(201).json({ orderNumber: number });
  } catch (error) { await client.query("ROLLBACK").catch(()=>{}); req.log.error({ error }, "Checkout order failed"); const isDatabaseError=Boolean(error&&typeof error==="object"&&"code" in error); return res.status(isDatabaseError?500:400).json({ error: isDatabaseError ? "We could not submit your order just now. Please try again." : error instanceof Error ? error.message : "Order could not be submitted." }); } finally { client.release(); }
});
publicRouter.get("/orders/:number", limited, async (req,res)=>{ try { await ensureSchema(); const result=await pool.query("SELECT order_number,status,currency,grand_total_minor,customer_email,country_name,city,created_at FROM checkout_orders WHERE order_number=$1",[req.params.number]); if(!result.rows[0]) return res.status(404).json({error:"Order not found"}); const row=result.rows[0]; row.customer_email=row.customer_email.replace(/^(.{1,2}).*(@.*)$/,'$1•••$2'); return res.json(row); } catch { return res.status(500).json({error:"Order could not be loaded"}); } });

publicRouter.get("/events/:id", limited, async(req,res)=>{await ensureSchema();const result=await pool.query("SELECT id,title_en,title_tr,event_start_at,timezone,location_text_en,location_text_tr,audience,total_capacity,status,enabled,display_end_at FROM event_banner_config WHERE id=$1",[req.params.id]);if(!result.rows[0])return res.status(404).json({error:"Event not found"});return res.json(result.rows[0]);});
publicRouter.post("/events/:id/applications",limited,async(req,res)=>{try{await ensureSchema();const b=req.body||{},fullName=clean(b.fullName,120),email=clean(b.email,254).toLowerCase(),phone=clean(b.phone,20),age=Number(b.age);if(!fullName||!emailValid(email)||!phoneValid(phone)||!Number.isInteger(age)||age<16||age>100||!b.consent||!clean(b.eligibilityResponse,40))return res.status(400).json({error:"Complete all required application fields."});const event=(await pool.query("SELECT * FROM event_banner_config WHERE id=$1",[req.params.id])).rows[0];if(!event||!event.enabled||!["active","scheduled"].includes(event.status)||new Date(event.display_end_at||event.event_start_at)<=new Date())return res.status(409).json({error:"Applications for this event are closed."});if(event.audience==="girls_only"&&b.eligibilityResponse!=="women_only")return res.status(400).json({error:"Please confirm that you meet this event’s stated eligibility requirement."});const seq=await pool.query("SELECT nextval('event_application_number_seq') value"),number=`EV-${new Date().getFullYear()}-${String(seq.rows[0].value).padStart(6,"0")}`,id=randomUUID();await pool.query(`INSERT INTO event_applications(id,application_number,event_id,full_name,age,eligibility_response,email,phone,status,customer_language,consent_version,consent_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,'event-v1',NOW())`,[id,number,event.id,fullName,age,b.eligibilityResponse,email,phone,b.language==="tr"?"tr":"en"]);void sendEmail({to:email,subject:"We received your event application",html:emailShell(`<h1>Your application has been received</h1><p><strong>${escapeHtml(number)}</strong> is currently pending. Submission does not guarantee a place.</p><p>Aida will review it and contact you when your place is confirmed.</p>`)}).catch(()=>{});void sendEmail({to:process.env.EVENT_NOTIFICATION_EMAIL||OWNER_EMAIL,subject:`New event applicant — ${number}`,html:emailShell(`<h1>New event application</h1><p>${escapeHtml(fullName)} · age ${age} · ${escapeHtml(email)} · ${escapeHtml(phone)}</p><p>Event: ${escapeHtml(event.title_en)}</p>`)}).catch(()=>{});return res.status(201).json({applicationNumber:number,status:"pending"});}catch(error){return res.status(400).json({error:error instanceof Error?error.message:"Application could not be submitted."});}});

adminCheckoutRouter.use(requireAdmin);
adminCheckoutRouter.get("/orders", async (_req,res)=>{ await ensureSchema(); const result=await pool.query(`SELECT o.*,COALESCE(json_agg(i.*) FILTER (WHERE i.id IS NOT NULL),'[]') items FROM checkout_orders o LEFT JOIN checkout_order_items i ON i.order_id=o.id GROUP BY o.id ORDER BY o.created_at DESC`); res.json({orders:result.rows}); });
adminCheckoutRouter.get("/orders/:id/receipt", async (req,res)=>{ const result=await pool.query("SELECT receipt_storage_key,receipt_original_name,receipt_mime_type FROM checkout_orders WHERE id=$1",[req.params.id]); if(!result.rows[0]) return res.status(404).end(); const row=result.rows[0]; res.type(row.receipt_mime_type).setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(row.receipt_original_name)}`); return res.send(await readFile(path.join(receiptDir,row.receipt_storage_key))); });
adminCheckoutRouter.patch("/orders/:id/status", async (req,res)=>{ const next=clean(req.body?.status,20); if(!["pending","packaging","shipped","completed","cancelled"].includes(next)) return res.status(400).json({error:"Invalid status"}); const current=await pool.query("SELECT * FROM checkout_orders WHERE id=$1",[req.params.id]); if(!current.rows[0]) return res.status(404).json({error:"Order not found"}); const previous=current.rows[0].status; if(previous===next) return res.json({order:current.rows[0],emailSent:false}); const result=await pool.query(`UPDATE checkout_orders SET status=$1,tracking_carrier=$2,tracking_number=$3,tracking_url=$4,internal_note=$5,updated_at=NOW(),packaging_at=CASE WHEN $1='packaging' THEN NOW() ELSE packaging_at END,shipped_at=CASE WHEN $1='shipped' THEN NOW() ELSE shipped_at END,completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,cancelled_at=CASE WHEN $1='cancelled' THEN NOW() ELSE cancelled_at END WHERE id=$6 RETURNING *`,[next,clean(req.body.trackingCarrier,100)||null,clean(req.body.trackingNumber,100)||null,clean(req.body.trackingUrl,500)||null,clean(req.body.internalNote,1000)||null,req.params.id]); await pool.query("INSERT INTO checkout_order_status_history(id,order_id,previous_status,new_status,changed_by_admin_id,internal_note) VALUES($1,$2,$3,$4,'admin',$5)",[randomUUID(),req.params.id,previous,next,clean(req.body.internalNote,1000)||null]); const order=result.rows[0]; const subjects:any={packaging:"Your order is being prepared",shipped:"Your order is on its way",completed:"Your order is complete",cancelled:"An update about your order"}; if(subjects[next]) void sendEmail({to:order.customer_email,subject:`${subjects[next]} — ${order.order_number}`,html:emailShell(`<h1>${escapeHtml(subjects[next])}</h1><p>Order <strong>${escapeHtml(order.order_number)}</strong> is now ${escapeHtml(next)}.</p>${next==='shipped'&&order.tracking_number?`<p>Tracking: ${escapeHtml(order.tracking_carrier||'')} ${escapeHtml(order.tracking_number)}</p>`:''}`)}).catch(()=>{}); return res.json({order,emailSent:Boolean(subjects[next])}); });
adminCheckoutRouter.get("/bank",async(_req,res)=>{await ensureSchema();res.json({accounts:(await pool.query("SELECT * FROM bank_transfer_settings ORDER BY currency")).rows});});
adminCheckoutRouter.get("/event-applications",async(_req,res)=>{await ensureSchema();const result=await pool.query("SELECT * FROM event_applications ORDER BY created_at DESC");res.json({applications:result.rows});});
adminCheckoutRouter.patch("/event-applications/:id/status",async(req,res)=>{await ensureSchema();const next=clean(req.body?.status,20);if(!["pending","accepted","waitlisted","rejected","cancelled","attended"].includes(next))return res.status(400).json({error:"Invalid application status"});const current=(await pool.query("SELECT a.*,e.total_capacity,e.title_en FROM event_applications a JOIN event_banner_config e ON e.id=a.event_id WHERE a.id=$1",[req.params.id])).rows[0];if(!current)return res.status(404).json({error:"Application not found"});if(next==="accepted"&&current.status!=="accepted"){const accepted=Number((await pool.query("SELECT COUNT(*) count FROM event_applications WHERE event_id=$1 AND status IN ('accepted','attended')",[current.event_id])).rows[0].count);const legacy=Number((await pool.query("SELECT COALESCE(SUM(seat_count),0) count FROM newsletter_event_interests WHERE campaign_id=$1 AND reservation_status IN ('confirmed','attended')",[current.event_id])).rows[0].count);if(accepted+legacy>=current.total_capacity&&!req.body?.overrideCapacity)return res.status(409).json({error:"Event capacity is full. Confirm an authorised override to continue."});}const result=await pool.query(`UPDATE event_applications SET status=$1,admin_note=$2,updated_at=NOW(),accepted_at=CASE WHEN $1='accepted' THEN NOW() ELSE accepted_at END,rejected_at=CASE WHEN $1='rejected' THEN NOW() ELSE rejected_at END,cancelled_at=CASE WHEN $1='cancelled' THEN NOW() ELSE cancelled_at END WHERE id=$3 RETURNING *`,[next,clean(req.body?.adminNote,1000)||null,req.params.id]);const application=result.rows[0];if(application.status!==current.status&&["accepted","waitlisted","rejected"].includes(next))void sendEmail({to:application.email,subject:`Your event application is ${next}`,html:emailShell(`<h1>Application ${escapeHtml(next)}</h1><p>Your application <strong>${escapeHtml(application.application_number)}</strong> for ${escapeHtml(current.title_en)} is now ${escapeHtml(next)}.</p>`)}).catch(()=>{});return res.json({application});});
adminCheckoutRouter.put("/bank/:currency",async(req,res)=>{const currency=req.params.currency==='USD'?'USD':'TRY';await ensureSchema();const b=req.body||{};const result=await pool.query(`UPDATE bank_transfer_settings SET enabled=$1,account_holder=$2,bank_name=$3,iban=$4,swift_bic=$5,branch_info=$6,bank_address=$7,instructions=$8,notification_email=$9,updated_at=NOW() WHERE currency=$10 RETURNING *`,[Boolean(b.enabled),clean(b.accountHolder,160),clean(b.bankName,160),clean(b.iban,80),clean(b.swiftBic,40)||null,clean(b.branchInfo,200)||null,clean(b.bankAddress,300)||null,clean(b.instructions,1000)||null,clean(b.notificationEmail,254)||null,currency]);res.json({account:result.rows[0]});});

export default publicRouter;
