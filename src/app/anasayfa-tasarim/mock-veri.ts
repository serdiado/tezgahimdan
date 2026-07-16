// /anasayfa-tasarim TASARIM TASLAGI icin ornek veri - GERCEK DEGIL.
//
// docs/mimari/anasayfa-kapsam-ekseni.md #8'de tarif edilen N>=2 (coklu pazar)
// hedef tasarimini SOMUT gormek icin. Sistemde bugun (2026-07) tek pazar
// (Seferihisar) var; bu dosya "5 sehir, 10 pazar olsa nasil gorunur" sorusunu
// yanitliyor. Hicbir yerden link verilmiyor (kullanici talebi) - sadece
// /anasayfa-tasarim adresini bilenler gorur.
//
// Seferihisar disindaki 9 pazar TAMAMEN KURGUSAL: gercek bir belediye
// anlasmasi/ortakligi TEMSIL ETMEZ. Il/ilce adlari gercek Ege kasabalari
// (gorsel inandiricilik icin) ama pazar aciklamalari, tezgah sayilari,
// saatleri UYDURMA - sayfadaki banner bunu acikca belirtir.
//
// Saat alanlari Prisma'nin @db.Time kolonlarinin donduğu sekle BILEREK uyar
// (1970-01-01 UTC tabanli Date, sadece saat/dakika anlamli) - HaftalikRitim
// bileseni ve pazar-haftasi.ts yardimcilari bu sekli bekliyor, boylece GERCEK
// bilesen degisiklik yapilmadan yeniden kullanilabiliyor.
function saat(saat: number, dakika = 0): Date {
  return new Date(Date.UTC(1970, 0, 1, saat, dakika));
}

export type MockPazar = {
  id: string;
  ad: string;
  // Yalnizca Seferihisar GERCEK ve calisan bir sayfaya sahip - kart CTA'si
  // sadece bunda aktif olur. Digerleri kasitli olarak inert (bkz. PazarKarti).
  gercekMi: boolean;
  slug: string;
  il: string;
  ilce: string;
  aciklama: string;
  kapakFotoUrl: string;
  tezgahSayisi: number;
  baslangicGunu: string;
  baslangicSaati: Date;
  sifirlamaGunu: string;
  sifirlamaSaati: Date;
  saatDilimi: string;
};

export const MOCK_PAZARLAR: MockPazar[] = [
  {
    id: "mock-seferihisar",
    ad: "Seferihisar Pazarı",
    gercekMi: true,
    slug: "seferihisar-pazari",
    il: "İzmir",
    ilce: "Seferihisar",
    aciklama: "Kadın emeği pazarının ilk durağı — her çarşamba Camikebir'de.",
    kapakFotoUrl: "/anasayfa-tasarim/seferihisar.jpg",
    tezgahSayisi: 18,
    baslangicGunu: "Carsamba",
    baslangicSaati: saat(9),
    sifirlamaGunu: "Carsamba",
    sifirlamaSaati: saat(18),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-urla",
    ad: "Urla Pazarı",
    gercekMi: false,
    slug: "urla-pazari",
    il: "İzmir",
    ilce: "Urla",
    aciklama: "Bağ ve zeytin diyarının haftalık buluşma noktası.",
    kapakFotoUrl: "/anasayfa-tasarim/urla.jpg",
    tezgahSayisi: 22,
    baslangicGunu: "Cumartesi",
    baslangicSaati: saat(8),
    sifirlamaGunu: "Cumartesi",
    sifirlamaSaati: saat(17),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-bodrum",
    ad: "Bodrum Pazarı",
    gercekMi: false,
    slug: "bodrum-pazari",
    il: "Muğla",
    ilce: "Bodrum",
    aciklama: "Yarımadanın el işi ve organik ürün pazarı.",
    kapakFotoUrl: "/anasayfa-tasarim/bodrum.jpg",
    tezgahSayisi: 31,
    baslangicGunu: "Cuma",
    baslangicSaati: saat(8, 30),
    sifirlamaGunu: "Cuma",
    sifirlamaSaati: saat(19),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-milas",
    ad: "Milas Pazarı",
    gercekMi: false,
    slug: "milas-pazari",
    il: "Muğla",
    ilce: "Milas",
    aciklama: "Zeytinyağı ve dokuma sanatının şehri, haftalık pazarında.",
    kapakFotoUrl: "/anasayfa-tasarim/milas.jpg",
    tezgahSayisi: 19,
    baslangicGunu: "Sali",
    baslangicSaati: saat(9),
    sifirlamaGunu: "Sali",
    sifirlamaSaati: saat(18),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-kusadasi",
    ad: "Kuşadası Pazarı",
    gercekMi: false,
    slug: "kusadasi-pazari",
    il: "Aydın",
    ilce: "Kuşadası",
    aciklama: "Liman kasabasının taze ürün ve el emeği pazarı.",
    kapakFotoUrl: "/anasayfa-tasarim/kusadasi.jpg",
    tezgahSayisi: 27,
    baslangicGunu: "Pazartesi",
    baslangicSaati: saat(7, 30),
    sifirlamaGunu: "Pazartesi",
    sifirlamaSaati: saat(17),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-soke",
    ad: "Söke Pazarı",
    gercekMi: false,
    slug: "soke-pazari",
    il: "Aydın",
    ilce: "Söke",
    aciklama: "Ovanın bereketi, haftalık pazarda sofralara ulaşıyor.",
    kapakFotoUrl: "/anasayfa-tasarim/soke.jpg",
    tezgahSayisi: 15,
    baslangicGunu: "Persembe",
    baslangicSaati: saat(8),
    sifirlamaGunu: "Persembe",
    sifirlamaSaati: saat(18),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-alasehir",
    ad: "Alaşehir Pazarı",
    gercekMi: false,
    slug: "alasehir-pazari",
    il: "Manisa",
    ilce: "Alaşehir",
    aciklama: "Bağcılık kültürünün üreticileri, her hafta burada.",
    kapakFotoUrl: "/anasayfa-tasarim/alasehir.jpg",
    tezgahSayisi: 24,
    baslangicGunu: "Cumartesi",
    baslangicSaati: saat(9),
    sifirlamaGunu: "Cumartesi",
    sifirlamaSaati: saat(19),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-salihli",
    ad: "Salihli Pazarı",
    gercekMi: false,
    slug: "salihli-pazari",
    il: "Manisa",
    ilce: "Salihli",
    aciklama: "Sart Ovası'nın taze ürünleri, çarşamba pazarında.",
    kapakFotoUrl: "/anasayfa-tasarim/salihli.jpg",
    tezgahSayisi: 12,
    baslangicGunu: "Carsamba",
    baslangicSaati: saat(8),
    sifirlamaGunu: "Carsamba",
    sifirlamaSaati: saat(17),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-ayvalik",
    ad: "Ayvalık Pazarı",
    gercekMi: false,
    slug: "ayvalik-pazari",
    il: "Balıkesir",
    ilce: "Ayvalık",
    aciklama: "Zeytin ve sabun ustalarının kıyı pazarı.",
    kapakFotoUrl: "/anasayfa-tasarim/ayvalik.jpg",
    tezgahSayisi: 29,
    baslangicGunu: "Cuma",
    baslangicSaati: saat(8),
    sifirlamaGunu: "Cuma",
    sifirlamaSaati: saat(18),
    saatDilimi: "Europe/Istanbul",
  },
  {
    id: "mock-edremit",
    ad: "Edremit Pazarı",
    gercekMi: false,
    slug: "edremit-pazari",
    il: "Balıkesir",
    ilce: "Edremit",
    aciklama: "Körfezin üretici kadınları, pazar günleri burada.",
    kapakFotoUrl: "/anasayfa-tasarim/edremit.jpg",
    tezgahSayisi: 16,
    baslangicGunu: "PazarGunu",
    baslangicSaati: saat(9),
    sifirlamaGunu: "PazarGunu",
    sifirlamaSaati: saat(17),
    saatDilimi: "Europe/Istanbul",
  },
];

export const TOPLAM_TEZGAH = MOCK_PAZARLAR.reduce((t, p) => t + p.tezgahSayisi, 0);
export const SEHIRLER = Array.from(new Set(MOCK_PAZARLAR.map((p) => p.il)));
