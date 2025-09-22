import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  farcasterFid: text("farcaster_fid"),
  farcasterUsername: text("farcaster_username"),
  farcasterDisplayName: text("farcaster_display_name"),
  farcasterAvatar: text("farcaster_avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentDrafts = pgTable("content_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  topic: text("topic").notNull(),
  contentType: text("content_type").notNull(),
  tone: text("tone").notNull(),
  generatedContent: text("generated_content"),
  selectedImage: json("selected_image").$type<{
    url: string;
    alt: string;
    photographer: string;
    source: string;
  }>(),
  isPublished: boolean("is_published").default(false).notNull(),
  farcasterCastHash: text("farcaster_cast_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContentDraftSchema = createInsertSchema(contentDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContentDraft = z.infer<typeof insertContentDraftSchema>;
export type ContentDraft = typeof contentDrafts.$inferSelect;
