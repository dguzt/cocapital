CREATE TYPE "public"."loan_status" AS ENUM('active', 'voided');--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "status" "loan_status" DEFAULT 'active' NOT NULL;