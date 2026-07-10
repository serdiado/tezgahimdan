-- Gelmedi yasagi (2026-07-10): ust uste guvenilirlikEsigi kadar "gelmedi"
-- biriktiren alici yasakSuresiGun boyunca yeni rezervasyon olusturamaz.
ALTER TABLE "Kullanici" ADD COLUMN "rezervasyonYasagiBitisi" TIMESTAMP(3);

ALTER TABLE "PlatformAyarlari" ADD COLUMN "yasakSuresiGun" INTEGER NOT NULL DEFAULT 7;
