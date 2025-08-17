import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
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
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  display_name: true,
  bio: true,
  avatar_url: true,
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
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  author_id: true,
  created_at: true,
  updated_at: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  author_id: varchar("author_id").notNull(),
  post_id: integer("post_id").notNull(),
  deleted: boolean("deleted").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  author_id: true,
  deleted: true,
  created_at: true,
  updated_at: true,
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

export const insertEngagementSchema = createInsertSchema(engagements).omit({
  id: true,
  created_at: true,
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

export const prayerRequests = pgTable("prayer_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  request: text("request").notNull(),
  prayed_count: integer("prayed_count").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrayerRequestSchema = createInsertSchema(prayerRequests).omit({
  id: true,
  prayed_count: true,
  created_at: true,
});

export type InsertPrayerRequest = z.infer<typeof insertPrayerRequestSchema>;
export type PrayerRequest = typeof prayerRequests.$inferSelect;

export const prayerResponses = pgTable("prayer_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prayer_request_id: varchar("prayer_request_id").notNull().references(() => prayerRequests.id, { onDelete: 'cascade' }),
  user_id: varchar("user_id").notNull(),
  prayed_at: timestamp("prayed_at").defaultNow().notNull(),
});

export const insertPrayerResponseSchema = createInsertSchema(prayerResponses).omit({
  id: true,
  prayed_at: true,
});

export type InsertPrayerResponse = z.infer<typeof insertPrayerResponseSchema>;
export type PrayerResponse = typeof prayerResponses.$inferSelect;
