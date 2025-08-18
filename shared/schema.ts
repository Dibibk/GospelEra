import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, bigserial, bigint, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey(),
  email: text("email"),
  display_name: text("display_name"),
  bio: text("bio"),
  avatar_url: text("avatar_url"),
  role: text("role").default('user').notNull(), // 'user', 'admin', 'banned'
  accepted_guidelines: boolean("accepted_guidelines").default(false).notNull(),
  affirmed_faith: boolean("affirmed_faith").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  display_name: true,
  bio: true,
  avatar_url: true,
  accepted_guidelines: true,
  affirmed_faith: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author_id: varchar("author_id").notNull(),
  tags: text("tags").array().notNull().default([]),
  media_urls: text("media_urls").array().notNull().default([]),
  hidden: boolean("hidden").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  title: true,
  content: true,
  tags: true,
  media_urls: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  author_id: varchar("author_id").notNull(),
  post_id: integer("post_id").notNull(),
  deleted: boolean("deleted").default(false).notNull(),
  hidden: boolean("hidden").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  post_id: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export const engagements = pgTable("engagements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar("user_id").notNull(),
  post_id: integer("post_id").notNull(),
  type: text("type").notNull(), // 'amen' or 'bookmark'
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertEngagementSchema = createInsertSchema(engagements).pick({
  user_id: true,
  post_id: true,
  type: true,
});

export type InsertEngagement = z.infer<typeof insertEngagementSchema>;
export type Engagement = typeof engagements.$inferSelect;

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  target_type: text("target_type").notNull(), // 'post' or 'comment'
  target_id: text("target_id").notNull(),
  reason: text("reason").notNull(),
  reporter_id: varchar("reporter_id").notNull(),
  status: text("status").notNull().default('open'), // 'open', 'resolved', 'dismissed'
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  reporter_id: true,
  status: true,
  created_at: true,
  updated_at: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Enhanced Prayer Request System with comprehensive workflow
export const prayerRequests = pgTable("prayer_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requester: varchar("requester").references(() => profiles.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  details: text("details").notNull(),
  tags: text("tags").array().notNull().default([]),
  is_anonymous: boolean("is_anonymous").default(false).notNull(),
  status: text("status").default('open').notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrayerRequestSchema = createInsertSchema(prayerRequests).omit({
  id: true,
  created_at: true,
});

export type InsertPrayerRequest = z.infer<typeof insertPrayerRequestSchema>;
export type PrayerRequest = typeof prayerRequests.$inferSelect;

export const prayerCommitments = pgTable("prayer_commitments", {
  request_id: bigint("request_id", { mode: "number" }).notNull().references(() => prayerRequests.id, { onDelete: 'cascade' }),
  warrior: varchar("warrior").notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  committed_at: timestamp("committed_at").defaultNow().notNull(),
  status: text("status").default('committed').notNull(),
  prayed_at: timestamp("prayed_at"),
  note: text("note"),
}, (table) => ({
  pk: primaryKey({ columns: [table.request_id, table.warrior] })
}));

export const insertPrayerCommitmentSchema = createInsertSchema(prayerCommitments).omit({
  committed_at: true,
});

export type InsertPrayerCommitment = z.infer<typeof insertPrayerCommitmentSchema>;
export type PrayerCommitment = typeof prayerCommitments.$inferSelect;

export const prayerActivity = pgTable("prayer_activity", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  request_id: bigint("request_id", { mode: "number" }).notNull().references(() => prayerRequests.id, { onDelete: 'cascade' }),
  actor: varchar("actor").references(() => profiles.id, { onDelete: 'set null' }),
  kind: text("kind").notNull(),
  message: text("message"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrayerActivitySchema = createInsertSchema(prayerActivity).omit({
  id: true,
  created_at: true,
});

export type InsertPrayerActivity = z.infer<typeof insertPrayerActivitySchema>;
export type PrayerActivity = typeof prayerActivity.$inferSelect;
