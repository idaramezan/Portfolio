import { randomUUID } from "node:crypto";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";
import { emailShell, escapeHtml, OWNER_EMAIL, sendEmail } from "../lib/email";

const router = Router();
const clean = (value: unknown, max = 1000) =>
  String(value || "")
    .trim()
    .slice(0, max);
const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || req.headers["x-admin-password"] !== expected)
    return res.status(401).json({ error: "Admin authentication required" });
  return next();
}

async function ensureTable() {
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS portfolio_enquiry_number_seq;
    CREATE TABLE IF NOT EXISTS portfolio_enquiries (
      id UUID PRIMARY KEY, enquiry_number TEXT UNIQUE NOT NULL,
      enquiry_type TEXT NOT NULL CHECK (enquiry_type IN ('artwork','moving_image')),
      subject_id TEXT, subject_name TEXT NOT NULL, subject_url TEXT,
      customer_name TEXT NOT NULL, customer_email TEXT NOT NULL,
      country TEXT, city TEXT, phone TEXT, organisation TEXT, project_type TEXT,
      project_link TEXT, desired_duration TEXT, deadline TEXT, budget_range TEXT,
      message TEXT, reference_links TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','negotiating','completed','declined')),
      admin_note TEXT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
}

router.post("/enquiries", async (req, res) => {
  await ensureTable();
  const type = req.body?.type === "moving_image" ? "moving_image" : "artwork";
  const name = clean(req.body?.name, 120);
  const email = clean(req.body?.email, 200).toLowerCase();
  const subjectName =
    clean(req.body?.subjectName, 200) ||
    (type === "moving_image" ? "Moving Image commission" : "Artwork enquiry");
  if (!name || !emailOk(email))
    return res
      .status(400)
      .json({ error: "Name and a valid email are required." });
  if (
    type === "artwork" &&
    (!clean(req.body?.country, 100) || !clean(req.body?.city, 100))
  )
    return res.status(400).json({ error: "Country and city are required." });
  const sequence = await pool.query(
    "SELECT nextval('portfolio_enquiry_number_seq') value",
  );
  const number = `${type === "artwork" ? "ART" : "MOV"}-${String(sequence.rows[0].value).padStart(5, "0")}`;
  const values = [
    randomUUID(),
    number,
    type,
    clean(req.body?.subjectId, 200) || null,
    subjectName,
    clean(req.body?.subjectUrl, 500) || null,
    name,
    email,
    clean(req.body?.country, 100) || null,
    clean(req.body?.city, 100) || null,
    clean(req.body?.phone, 80) || null,
    clean(req.body?.organisation, 160) || null,
    clean(req.body?.projectType, 100) || null,
    clean(req.body?.projectLink, 500) || null,
    clean(req.body?.desiredDuration, 100) || null,
    clean(req.body?.deadline, 100) || null,
    clean(req.body?.budgetRange, 100) || null,
    clean(req.body?.message, 4000) || null,
    clean(req.body?.referenceLinks, 2000) || null,
  ];
  await pool.query(
    "INSERT INTO portfolio_enquiries(id,enquiry_number,enquiry_type,subject_id,subject_name,subject_url,customer_name,customer_email,country,city,phone,organisation,project_type,project_link,desired_duration,deadline,budget_range,message,reference_links) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)",
    values,
  );
  void sendEmail({
    to: process.env.ORDER_NOTIFICATION_EMAIL || OWNER_EMAIL,
    replyTo: email,
    subject: `${type === "artwork" ? "New artwork request" : "New moving-image enquiry"} · ${number}`,
    html: emailShell(
      `<h1>${escapeHtml(subjectName)}</h1><p><strong>${escapeHtml(name)}</strong> · ${escapeHtml(email)}</p><p>${escapeHtml(clean(req.body?.country, 100))} ${escapeHtml(clean(req.body?.city, 100))}</p><p>${escapeHtml(clean(req.body?.message, 4000))}</p>`,
      { headerLabel: number, showSignature: false },
    ),
  }).catch((error) => req.log.error({ error }, "Enquiry email failed"));
  return res.status(201).json({ enquiryNumber: number });
});

router.get("/admin/enquiries", requireAdmin, async (_req, res) => {
  await ensureTable();
  const result = await pool.query(
    "SELECT * FROM portfolio_enquiries ORDER BY submitted_at DESC LIMIT 500",
  );
  return res.json({ enquiries: result.rows });
});

router.patch("/admin/enquiries/:id", requireAdmin, async (req, res) => {
  await ensureTable();
  const statuses = ["new", "contacted", "negotiating", "completed", "declined"];
  const status = statuses.includes(req.body?.status) ? req.body.status : "new";
  const result = await pool.query(
    "UPDATE portfolio_enquiries SET status=$2,admin_note=$3,updated_at=NOW() WHERE id=$1 RETURNING *",
    [req.params.id, status, clean(req.body?.adminNote, 4000) || null],
  );
  if (!result.rows[0])
    return res.status(404).json({ error: "Enquiry not found" });
  return res.json({ enquiry: result.rows[0] });
});

export default router;
