// Pazar yönetim ekranlarının (liste + form) paylaştığı saf yardımcılar.
// Gün etiketleri MagazaHero.tsx'teki GUN_ETIKETI ile aynı harita - o dosya
// dışa aktarmadığı için burada yerelde tutuluyor (DURUM_STIL sözlüklerinin
// kod tabanında zaten birden fazla yerde yerelce tutulmasıyla aynı desen).
export const GUN_ETIKETI: Record<string, string> = {
  Pazartesi: "Pazartesi",
  Sali: "Salı",
  Carsamba: "Çarşamba",
  Persembe: "Perşembe",
  Cuma: "Cuma",
  Cumartesi: "Cumartesi",
  PazarGunu: "Pazar",
};

export const HAFTA_GUNLERI: { deger: string; etiket: string }[] = [
  { deger: "Pazartesi", etiket: "Pazartesi" },
  { deger: "Sali", etiket: "Salı" },
  { deger: "Carsamba", etiket: "Çarşamba" },
  { deger: "Persembe", etiket: "Perşembe" },
  { deger: "Cuma", etiket: "Cuma" },
  { deger: "Cumartesi", etiket: "Cumartesi" },
  { deger: "PazarGunu", etiket: "Pazar" },
];

// Prisma @db.Time degerleri 1970-01-01 UTC tabanli Date olarak gelir; saat-dakika
// kismi YEREL saati temsil eder (bkz. src/lib/pazar-haftasi.ts, src/lib/magaza.ts).
// Bu yuzden getUTCHours/getUTCMinutes kullanilir - getHours() sunucunun kendi saat
// dilimine gore kaydirir ve YANLIS deger verir.
export function saatMetnineCevir(isoTarih: string): string {
  const d = new Date(isoTarih);
  const saat = String(d.getUTCHours()).padStart(2, "0");
  const dakika = String(d.getUTCMinutes()).padStart(2, "0");
  return `${saat}:${dakika}`;
}

const SAAT_DESENI = /^([01]\d|2[0-3]):([0-5]\d)$/;

// "HH:MM" -> ayni sozlesmeye uygun 1970-tabanli UTC Date. Gecersiz bicimde null.
export function saatMetnindenTarihUret(hhmm: string): Date | null {
  if (!SAAT_DESENI.test(hhmm)) return null;
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}
