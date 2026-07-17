import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const artworkStatusEnum = pgEnum("artwork_status", ["AVAILABLE", "SOLD", "RESERVED"]);

export const artworksTable = pgTable("artworks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  medium: text("medium").notNull().default("Oil pastel"),
  sizeInches: text("size_inches"),
  year: integer("year").notNull(),
  imageUrl: text("image_url").notNull(),
  priceCents: integer("price_cents"),
  currency: text("currency").notNull().default("USD"),
  status: artworkStatusEnum("status").notNull().default("AVAILABLE"),
  category: text("category").notNull().default("Other"),
  availableAsPrint: boolean("available_as_print").notNull().default(false),
  printfulProductId: text("printful_product_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertArtworkSchema = createInsertSchema(artworksTable).omit({ id: true, createdAt: true });
export type InsertArtwork = z.infer<typeof insertArtworkSchema>;
export type Artwork = typeof artworksTable.$inferSelect;
