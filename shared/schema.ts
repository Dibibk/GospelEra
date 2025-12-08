import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, bigserial, bigint, primaryKey, uuid, json, index } from "drizzle-orm/pg-core";
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
  first_name: text("first_name"),
  last_name: text("last_name"),
  display_name: text("display_name"),
  bio: text("bio"),
  avatar_url: text("avatar_url"),
  role: text("role").default('user').notNull(), // 'user', 'admin', 'banned'
  accepted_guidelines: boolean("accepted_guidelines").default(false).notNull(),
  affirmed_faith: boolean("affirmed_faith").default(false).notNull(),
  show_name_on_prayers: boolean("show_name_on_prayers").default(true).notNull(),
  private_profile: boolean("private_profile").default(false).notNull(),
  media_enabled: boolean("media_enabled").default(false).notNull(),
  settings: json("settings").default({}).notNull(), // JSON object for user preferences
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  first_name: true,
  last_name: true,
  display_name: true,
  bio: true,
  avatar_url: true,
  accepted_guidelines: true,
  affirmed_faith: true,
  show_name_on_prayers: true,
  private_profile: true,
  media_enabled: true,
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
  embed_url: text("embed_url"),
  moderation_status: text("moderation_status").default('approved').notNull(), // 'pending', 'approved', 'rejected'
  moderation_reason: text("moderation_reason"),
  hidden: boolean("hidden").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Index for feed queries: WHERE hidden=false ORDER BY created_at DESC
  feedIdx: index("posts_feed_idx").on(table.hidden, table.created_at.desc()),
  // Index for author profile queries
  authorIdx: index("posts_author_idx").on(table.author_id),
}));

export const insertPostSchema = createInsertSchema(posts).pick({
  title: true,
  content: true,
  tags: true,
  embed_url: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Message is required"),
  embed_url: z.string().url("Please enter a valid YouTube URL").optional().or(z.literal("")),
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

// Separate tables for bookmarks and reactions (replacing old engagements table)
export const bookmarks = pgTable("bookmarks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar("user_id").notNull(),
  post_id: integer("post_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const reactions = pgTable("reactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar("user_id").notNull(),
  post_id: integer("post_id").notNull(),
  kind: text("kind").notNull().default('amen'), // 'amen' for now
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).pick({
  user_id: true,
  post_id: true,
});

export const insertReactionSchema = createInsertSchema(reactions).pick({
  user_id: true,
  post_id: true,
  kind: true,
});

export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Reaction = typeof reactions.$inferSelect;

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
  embed_url: text("embed_url"),
  moderation_status: text("moderation_status").default('approved').notNull(), // 'pending', 'approved', 'rejected'
  moderation_reason: text("moderation_reason"),
  is_anonymous: boolean("is_anonymous").default(false).notNull(),
  status: text("status").default('open').notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPrayerRequestSchema = createInsertSchema(prayerRequests).omit({
  id: true,
  created_at: true,
  updated_at: true,
  moderation_status: true,
  moderation_reason: true,
}).extend({
  embed_url: z.string().url("Please enter a valid YouTube URL").optional().or(z.literal("")),
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

// Donations table for supporting the platform
export const donations = pgTable("donations", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  user_id: varchar("user_id").references(() => profiles.id, { onDelete: 'set null' }),
  amount_cents: integer("amount_cents").notNull(),
  currency: text("currency").default('USD').notNull(),
  message: text("message"),
  provider: text("provider").default('pending').notNull(), // 'stripe' | 'paypal' | 'manual' | 'pending'
  provider_ref: text("provider_ref"), // session id / txn id (nullable)
  stripe_session_id: text("stripe_session_id"), // stripe checkout session id
  status: text("status").default('initiated').notNull(), // 'initiated' | 'paid' | 'failed' | 'refunded'
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  created_at: true,
});

export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;

// Media Requests table for managing media upload access
export const mediaRequests = pgTable("media_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  status: text("status").default('pending').notNull(), // 'pending', 'approved', 'denied'
  reason: text("reason").notNull(),
  admin_id: uuid("admin_id").references(() => profiles.id, { onDelete: 'set null' }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMediaRequestSchema = createInsertSchema(mediaRequests).omit({
  id: true,
  user_id: true,
  admin_id: true,
  created_at: true,
  updated_at: true,
});

export type InsertMediaRequest = z.infer<typeof insertMediaRequestSchema>;
export type MediaRequest = typeof mediaRequests.$inferSelect;

// Notifications table for in-app notifications
export const notifications = pgTable("notifications", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  recipient_id: varchar("recipient_id").notNull(), // user receiving the notification
  actor_id: varchar("actor_id"), // user who triggered the notification (nullable for system notifications)
  event_type: text("event_type").notNull(), // 'comment', 'amen', 'prayer_commitment', 'prayer_update', 'prayer_prayed'
  post_id: integer("post_id"), // related post (nullable)
  comment_id: integer("comment_id"), // related comment (nullable)
  prayer_request_id: integer("prayer_request_id"), // related prayer request (nullable)
  commitment_id: integer("commitment_id"), // related commitment (nullable)
  message: text("message").notNull(), // notification message text
  is_read: boolean("is_read").default(false).notNull(),
  read_at: timestamp("read_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  recipientUnreadIdx: index("notifications_recipient_unread_idx").on(table.recipient_id, table.is_read, table.created_at.desc()),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  is_read: true,
  read_at: true,
  created_at: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Push notification tokens for FCM
export const pushTokens = pgTable("push_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar("user_id").notNull(),
  token: text("token").notNull(),
  platform: text("platform").notNull().default('web'), // 'web', 'ios', 'android'
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("push_tokens_user_idx").on(table.user_id),
  tokenIdx: index("push_tokens_token_idx").on(table.token),
}));

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;
