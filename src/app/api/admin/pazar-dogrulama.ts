// pazar-olustur ve pazar-guncelle route'larinin paylastigi saf dogrulama
// yardimcilari. Route dosyasi olmadigi icin (route.ts degil) Next.js bunu bir
// API endpoint'i olarak algilamaz.
import type { HaftaGunu } from "@/generated/prisma";

const GECERLI_GUNLER: HaftaGunu[] = [
  "Pazartesi",
  "Sali",
  "Carsamba",
  "Persembe",
  "Cuma",
  "Cumartesi",
  "PazarGunu",
];

export function gunDogrula(deger: string): HaftaGunu | null {
  return (GECERLI_GUNLER as string[]).includes(deger) ? (deger as HaftaGunu) : null;
}

const SAAT_DESENI = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function saatFormatiGecerliMi(hhmm: string): boolean {
  return SAAT_DESENI.test(hhmm);
}

// Prisma @db.Time sozlesmesi: 1970-01-01 UTC tabanli Date, saat-dakika kismi
// YEREL saati temsil eder (bkz. src/lib/pazar-haftasi.ts, src/lib/magaza.ts).
export function saatliTarih(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

export function gecerliSaatDilimiMi(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function gecerliUrlMi(deger: string): boolean {
  try {
    const u = new URL(deger);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// islemSon*/hatirlatma* alanlari icin: kapanistan (sifirlama) ILERI dogru, ayni
// hafta dongusu icinde gun+saat karsilastirmasi. Gece pazarlari (kapanis
// 01:00-02:00 gibi) icin bu alanlar kapanis gununden FARKLI bir gune denk
// gelebilir - bkz. src/lib/pazar-haftasi.ts kapanisSonrasiAni (AYNI mantik,
// orada gercek Date hesaplar, burada SADECE siralama/dogrulama icin).
const GUN_SIRASI: Record<HaftaGunu, number> = {
  PazarGunu: 0,
  Pazartesi: 1,
  Sali: 2,
  Carsamba: 3,
  Persembe: 4,
  Cuma: 5,
  Cumartesi: 6,
};

function kapanistanOfsetGun(kapanisGunu: HaftaGunu, hedefGunu: HaftaGunu): number {
  return (GUN_SIRASI[hedefGunu] - GUN_SIRASI[kapanisGunu] + 7) % 7;
}

// hedef (gun,saat) cifti, kapanistan SONRAYA (ayni gun ama daha gec saat dahil)
// mi denk geliyor? HH:MM string'leri zaten sifirla-doldurulmus 24 saat formatinda
// oldugu icin lexicographic karsilastirma dogru sonuc verir.
export function kapanistanSonraMi(
  kapanisGunu: HaftaGunu,
  kapanisSaatiHHMM: string,
  hedefGunu: HaftaGunu,
  hedefSaatiHHMM: string,
): boolean {
  const ofset = kapanistanOfsetGun(kapanisGunu, hedefGunu);
  if (ofset > 0) return true;
  return hedefSaatiHHMM > kapanisSaatiHHMM;
}

// A (gun,saat) cifti, B (gun,saat) ciftinden ONCE mi - ikisi de kapanistan
// SONRAKI olaylar oldugu icin kapanis-ofseti + saat bilesik anahtariyla
// karsilastirilir (ör. hatirlatma, islem-sonundan once olmali kontrolu icin).
export function hedefOnceMi(
  kapanisGunu: HaftaGunu,
  aGunu: HaftaGunu,
  aSaatiHHMM: string,
  bGunu: HaftaGunu,
  bSaatiHHMM: string,
): boolean {
  const ofsetA = kapanistanOfsetGun(kapanisGunu, aGunu);
  const ofsetB = kapanistanOfsetGun(kapanisGunu, bGunu);
  if (ofsetA !== ofsetB) return ofsetA < ofsetB;
  return aSaatiHHMM < bSaatiHHMM;
}

export type OpsiyonelGunSaatSonucu =
  | { hata: string }
  | { gun: HaftaGunu | null; saatHHMM: string | null; saat: Date | null };

// islemSonGunu/Saati ve hatirlatmaGunu/Saati icin ORTAK dogrulama: HER IKISI de
// bos ise "ayarlanmadi" (null, kod eski sabit varsayima duser). Biri doluysa
// digeri de zorunlu. Doluysa gun+saat formati VE kapanistan sonra olma sarti
// dogrulanir.
export function opsiyonelGunSaatDogrula(
  gunHam: unknown,
  saatHam: unknown,
  alanAdi: string,
  kapanisGunu: HaftaGunu,
  kapanisSaatiHHMM: string,
): OpsiyonelGunSaatSonucu {
  const gunStr = typeof gunHam === "string" ? gunHam.trim() : "";
  const saatStr = typeof saatHam === "string" ? saatHam.trim() : "";
  if (!gunStr && !saatStr) return { gun: null, saatHHMM: null, saat: null };
  if (!gunStr || !saatStr) {
    return { hata: `${alanAdi} için hem gün hem saat birlikte girilmeli (ya da ikisi de boş bırakılmalı)` };
  }
  const gun = gunDogrula(gunStr);
  if (!gun) return { hata: `geçersiz ${alanAdi} günü` };
  if (!saatFormatiGecerliMi(saatStr)) {
    return { hata: `geçersiz ${alanAdi} saati (SS:DD biçiminde olmalı)` };
  }
  if (!kapanistanSonraMi(kapanisGunu, kapanisSaatiHHMM, gun, saatStr)) {
    return { hata: `${alanAdi}, kapanış saatinden önce olamaz` };
  }
  return { gun, saatHHMM: saatStr, saat: saatliTarih(saatStr) };
}
