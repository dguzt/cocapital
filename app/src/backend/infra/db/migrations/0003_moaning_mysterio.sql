DROP INDEX "memberships_user_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");