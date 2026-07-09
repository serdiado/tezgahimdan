-- Pazar hero gorselleri: belediye logosu + kapak fotografi (ikisi de opsiyonel,
-- bos ise mevcut duz gradyan hero aynen kalir).
ALTER TABLE "Pazar" ADD COLUMN "belediyeLogoUrl" TEXT;
ALTER TABLE "Pazar" ADD COLUMN "kapakFotoUrl" TEXT;
