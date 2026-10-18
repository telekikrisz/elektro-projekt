ALTER TABLE "tanar" ADD COLUMN "email" text;--> statement-breakpoint
UPDATE "tanar" SET "email" = "felhasznalonev";--> statement-breakpoint
ALTER TABLE "tanar" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tanar" ADD COLUMN "szuperadmin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tanar" ADD COLUMN "jelszo_csere" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DROP INDEX "tanar_felhasznalonev_lower";--> statement-breakpoint
ALTER TABLE "tanar" DROP COLUMN "felhasznalonev";--> statement-breakpoint
CREATE UNIQUE INDEX "tanar_email_lower" ON "tanar" USING btree (lower("email"));
