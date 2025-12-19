CREATE TABLE "bookmarks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bookmarks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"post_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content" text NOT NULL,
	"author_id" varchar NOT NULL,
	"post_id" integer NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"message" text,
	"provider" text DEFAULT 'pending' NOT NULL,
	"provider_ref" text,
	"stripe_session_id" text,
	"status" text DEFAULT 'initiated' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"recipient_id" varchar NOT NULL,
	"actor_id" varchar,
	"event_type" text NOT NULL,
	"post_id" integer,
	"comment_id" integer,
	"prayer_request_id" integer,
	"commitment_id" integer,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"media_urls" text[] DEFAULT '{}' NOT NULL,
	"embed_url" text,
	"moderation_status" text DEFAULT 'approved' NOT NULL,
	"moderation_reason" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_activity" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" bigint NOT NULL,
	"actor" varchar,
	"kind" text NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_commitments" (
	"request_id" bigint NOT NULL,
	"warrior" varchar NOT NULL,
	"committed_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'committed' NOT NULL,
	"prayed_at" timestamp,
	"note" text,
	CONSTRAINT "prayer_commitments_request_id_warrior_pk" PRIMARY KEY("request_id","warrior")
);
--> statement-breakpoint
CREATE TABLE "prayer_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"requester" varchar,
	"title" text NOT NULL,
	"details" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"embed_url" text,
	"moderation_status" text DEFAULT 'approved' NOT NULL,
	"moderation_reason" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"display_name" text,
	"bio" text,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"accepted_guidelines" boolean DEFAULT false NOT NULL,
	"affirmed_faith" boolean DEFAULT false NOT NULL,
	"show_name_on_prayers" boolean DEFAULT true NOT NULL,
	"private_profile" boolean DEFAULT false NOT NULL,
	"media_enabled" boolean DEFAULT false NOT NULL,
	"settings" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "push_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'web' NOT NULL,
	"daily_verse_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"post_id" integer NOT NULL,
	"kind" text DEFAULT 'amen' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"reporter_id" varchar NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_requests" ADD CONSTRAINT "media_requests_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_requests" ADD CONSTRAINT "media_requests_admin_id_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_activity" ADD CONSTRAINT "prayer_activity_request_id_prayer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."prayer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_activity" ADD CONSTRAINT "prayer_activity_actor_profiles_id_fk" FOREIGN KEY ("actor") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_commitments" ADD CONSTRAINT "prayer_commitments_request_id_prayer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."prayer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_commitments" ADD CONSTRAINT "prayer_commitments_warrior_profiles_id_fk" FOREIGN KEY ("warrior") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_requester_profiles_id_fk" FOREIGN KEY ("requester") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_id","is_read","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "posts" USING btree ("hidden","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "push_tokens_user_idx" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_tokens_token_idx" ON "push_tokens" USING btree ("token");