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
