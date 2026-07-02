-- AlterTable
ALTER TABLE "Kullanici" ALTER COLUMN "telefon" DROP NOT NULL;
ALTER TABLE "Kullanici" ADD COLUMN "email" TEXT;
ALTER TABLE "Kullanici" ADD COLUMN "emailVerified" TIMESTAMP(3);
ALTER TABLE "Kullanici" ADD COLUMN "sifreHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Kullanici_email_key" ON "Kullanici"("email");
