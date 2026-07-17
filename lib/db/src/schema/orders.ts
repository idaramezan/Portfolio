import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { artworksTable } from "./artworks";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  artworkId: integer("artwork_id").references(() => artworksTable.id),
  type: text("type").notNull(), // 'original' | 'print'
  printSize: text("print_size"),
  paddleTransactionId: text("paddle_transaction_id"),
  paddleCustomerId: text("paddle_customer_id"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  shippingAddress: text("shipping_address"),
  priceCents: integer("price_cents"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"), // pending | paid | shipped | failed
  printfulOrderId: text("printful_order_id"),
  fulfillmentStatus: text("fulfillment_status"), // draft | fulfilled | shipped
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
