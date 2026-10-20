CREATE TYPE "public"."sale_installment_status" AS ENUM('pending', 'collected');--> statement-breakpoint
CREATE TYPE "public"."credit_sale_status" AS ENUM('active', 'voided');--> statement-breakpoint
ALTER TYPE "public"."movement_type" ADD VALUE 'sell_on_credit';--> statement-breakpoint
ALTER TYPE "public"."movement_type" ADD VALUE 'collect_sale';--> statement-breakpoint
CREATE TABLE "credit_sale_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" integer NOT NULL,
	"status" "sale_installment_status" DEFAULT 'pending' NOT NULL,
	"cost_share" integer,
	"collected_at" timestamp,
	"collect_movement_id" uuid
);
--> statement-breakpoint
CREATE TABLE "credit_sale_plan_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"from_count" integer NOT NULL,
	"to_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"item" text NOT NULL,
	"price" integer NOT NULL,
	"cost" integer,
	"frequency" "frequency" NOT NULL,
	"start_date" date NOT NULL,
	"status" "credit_sale_status" DEFAULT 'active' NOT NULL,
	"sale_movement_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_sale_installments" ADD CONSTRAINT "credit_sale_installments_sale_id_credit_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."credit_sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sale_installments" ADD CONSTRAINT "credit_sale_installments_collect_movement_id_movements_id_fk" FOREIGN KEY ("collect_movement_id") REFERENCES "public"."movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sale_plan_changes" ADD CONSTRAINT "credit_sale_plan_changes_sale_id_credit_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."credit_sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sale_plan_changes" ADD CONSTRAINT "credit_sale_plan_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_buyer_id_contacts_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_sale_movement_id_movements_id_fk" FOREIGN KEY ("sale_movement_id") REFERENCES "public"."movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_sale_installments_sale_idx" ON "credit_sale_installments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "credit_sale_plan_changes_sale_idx" ON "credit_sale_plan_changes" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "credit_sales_group_idx" ON "credit_sales" USING btree ("group_id");--> statement-breakpoint
DROP VIEW "borrowers";