ALTER TABLE "borrowers" RENAME TO "contacts";--> statement-breakpoint
ALTER TABLE "contacts" RENAME CONSTRAINT "borrowers_pkey" TO "contacts_pkey";--> statement-breakpoint
ALTER TABLE "contacts" RENAME CONSTRAINT "borrowers_group_id_groups_id_fk" TO "contacts_group_id_groups_id_fk";--> statement-breakpoint
ALTER INDEX "borrowers_group_idx" RENAME TO "contacts_group_idx";--> statement-breakpoint
ALTER TABLE "loans" RENAME CONSTRAINT "loans_borrower_id_borrowers_id_fk" TO "loans_borrower_id_contacts_id_fk";--> statement-breakpoint
CREATE VIEW "borrowers" AS SELECT * FROM "contacts";
