CREATE INDEX "credit_sale_installments_collect_movement_idx" ON "credit_sale_installments" USING btree ("collect_movement_id");--> statement-breakpoint
CREATE INDEX "credit_sales_sale_movement_idx" ON "credit_sales" USING btree ("sale_movement_id");--> statement-breakpoint
CREATE INDEX "installments_repay_movement_idx" ON "installments" USING btree ("repay_movement_id");--> statement-breakpoint
CREATE INDEX "loans_lend_movement_idx" ON "loans" USING btree ("lend_movement_id");