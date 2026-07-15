// HaftaGunu enum degerlerinin kullaniciya gorunen Turkce karsiligi.
//
// Bu harita kod tabaninda UC AYRI YERDE kopyalanmisti (MagazaHero.tsx,
// admin/pazarlar/pazar-yardimcilari.ts, HaftalikRitim.tsx) ve
// pazar-yardimcilari.ts'in yorumu bunu "o dosya disa aktarmadigi icin burada
// yerelde tutuluyor" diye aciklıyordu - yani eksik olan sey paylasilan bir evdi.
// 2026-07-15'te ana sayfa baglam satiri dorduncu kopyayi gerektirince harita
// buraya alindi. Saf veri, sunucu/istemci ayrimi yok.
//
// HaftalikRitim.tsx kendi listesini korur: onun sekli farkli ({deger, kisa,
// tam}) - gun cipleri kisa etiket ("Çar") istiyor.
export const GUN_ETIKETI: Record<string, string> = {
  Pazartesi: "Pazartesi",
  Sali: "Salı",
  Carsamba: "Çarşamba",
  Persembe: "Perşembe",
  Cuma: "Cuma",
  Cumartesi: "Cumartesi",
  // Model adiyla (Pazar/market) karismasin diye enum'da "PazarGunu" (Sunday).
  PazarGunu: "Pazar",
};

export function gunEtiketi(gun: string): string {
  return GUN_ETIKETI[gun] ?? gun;
}
