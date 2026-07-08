/*
  Warnings:

  - You are about to drop the column `bolge` on the `Pazar` table. All the data in the column will be lost.
  - Added the required column `googleHaritaLinki` to the `Pazar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `il` to the `Pazar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ilce` to the `Pazar` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Pazar" DROP COLUMN "bolge",
ADD COLUMN     "googleHaritaLinki" TEXT NOT NULL,
ADD COLUMN     "il" TEXT NOT NULL,
ADD COLUMN     "ilce" TEXT NOT NULL,
ADD COLUMN     "semt" TEXT,
ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
