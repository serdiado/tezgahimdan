-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;

-- CreateTable
CREATE TABLE "PazarHatirlatma" (
    "id" TEXT NOT NULL,
    "pazarId" TEXT NOT NULL,
    "pazarHaftasi" DATE NOT NULL,
    "gonderilmeZamani" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PazarHatirlatma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PazarHatirlatma_pazarId_pazarHaftasi_key" ON "PazarHatirlatma"("pazarId", "pazarHaftasi");

-- AddForeignKey
ALTER TABLE "PazarHatirlatma" ADD CONSTRAINT "PazarHatirlatma_pazarId_fkey" FOREIGN KEY ("pazarId") REFERENCES "Pazar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
