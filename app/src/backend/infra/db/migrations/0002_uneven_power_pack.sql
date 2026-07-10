ALTER TABLE "installments" ADD CONSTRAINT "installments_amount_positive" CHECK ("installments"."amount" > 0);--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_principal_nonneg" CHECK ("installments"."principal" >= 0);--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_interest_nonneg" CHECK ("installments"."interest" >= 0);--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_capital_positive" CHECK ("loans"."capital" > 0);--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_rate_nonneg" CHECK ("loans"."rate_bps" >= 0);--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_amount_nonneg" CHECK ("movements"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_cost_nonneg" CHECK ("movements"."cost" is null or "movements"."cost" >= 0);