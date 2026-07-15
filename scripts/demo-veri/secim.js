// GOZLE DOGRULANMIS aday secimleri (2026-07-15, kontak sayfasi incelemesi).
//
// Her satir: hedef -> { havuz, aday }. "havuz" genelde hedefin kendisidir ama
// BASKA bir ogenin havuzundan da secilebilir - ör. "seramik kase" aramasi
// arkeolojik canak parcalari getirdi, oysa Toprak & Camur TEZGAHININ havuzunda
// gercek seramik kaseler vardi. Bu odunc alma, ucretsiz havuzlarin dar kapsamini
// telafi eden bilincli bir tercih.
//
// Burada OLMAYAN ogeler icin kullanicidan foto bekleniyor (bkz. fotograflar/LISTE.md).
// Kullanici fotografi koyarsa BU secim gecersiz olur - seed once kullanici
// klasorune bakar (bkz. seed.js fotografBul).

const SECIMLER = {
  // --- Tezgah fotograflari
  "tezgah-ayse": { havuz: "tezgah-ayse", aday: 0 }, // bez kapakli recel kavanozlari
  "tezgah-hatice": { havuz: "tezgah-hatice", aday: 1 }, // zeytinyagi surahisi (0/5 markali - elendi)
  "tezgah-nazli": { havuz: "tezgah-nazli", aday: 1 }, // igne oyasi seridi
  "tezgah-sevgi": { havuz: "tezgah-sevgi", aday: 0 }, // makrome
  "tezgah-fatma": { havuz: "tezgah-fatma", aday: 5 }, // turuncu orgu + yumak
  "tezgah-meryem": { havuz: "tezgah-meryem", aday: 1 }, // asili renkli boncuk dizileri
  "tezgah-gulten": { havuz: "tezgah-gulten", aday: 4 }, // sabun tezgahi
  "tezgah-emine": { havuz: "tezgah-emine", aday: 1 }, // kurdeleli lavanta demetleri
  "tezgah-husniye": { havuz: "tezgah-husniye", aday: 3 }, // seramik kaseler
  "tezgah-sultan": { havuz: "tezgah-sultan", aday: 5 }, // kavanoz mumlar
  "tezgah-hacer": { havuz: "tezgah-hacer", aday: 1 }, // tohum paketi rafi
  "tezgah-serife": { havuz: "tezgah-serife", aday: 1 }, // hasir sepetler

  // --- Mutfaktan
  "urun-tarhana": { havuz: "urun-tarhana", aday: 2 }, // tarhana tozu
  "urun-kuru-domates": { havuz: "urun-kuru-domates", aday: 0 }, // gunes kurusu domates
  "urun-zeytinyagi": { havuz: "urun-zeytinyagi", aday: 4 }, // markasiz sise + kase

  // --- El Emegi
  "urun-oyali-yazma": { havuz: "urun-oyali-yazma", aday: 0 }, // oyali yazma kenari
  "urun-dantel-ortu": { havuz: "urun-dantel-ortu", aday: 1 }, // dantel ortu
  "urun-makrome-duvar": { havuz: "urun-makrome-duvar", aday: 2 }, // cubukta makrome

  // --- Giyim Kusam
  "urun-yun-hirka": { havuz: "urun-yun-hirka", aday: 1 }, // kahve yun hirka
  "urun-yun-atki": { havuz: "urun-yun-atki", aday: 4 }, // krem atki
  "urun-bebek-patik": { havuz: "urun-bebek-patik", aday: 0 }, // beyaz bebek patigi

  // --- Taki & Aksesuar
  "urun-tespih": { havuz: "urun-tespih", aday: 1 }, // ahsap/kehribar tespih
  "urun-nazar-bileklik": { havuz: "urun-nazar-bileklik", aday: 3 }, // nazar boncuk dizisi
  "urun-boncuk-kolye": { havuz: "tezgah-meryem", aday: 4 }, // renkli boncuk (kendi havuzu muze eseriydi)

  // --- Bakim & Kozmetik
  "urun-zeytinyagli-sabun": { havuz: "urun-zeytinyagli-sabun", aday: 5 }, // istiflenmis el sabunlari
  "urun-kuru-lavanta": { havuz: "tezgah-emine", aday: 0 }, // kuru lavanta demeti (kendi havuzu gravurdu)
  "urun-lavanta-kese": { havuz: "urun-lavanta-kese", aday: 0 }, // lavanta kesesi

  // --- Ev & Dekorasyon
  "urun-seramik-kase": { havuz: "tezgah-husniye", aday: 5 }, // toprak kaseler (kendi havuzu canak parcasiydi)
  "urun-seramik-kupa": { havuz: "urun-seramik-kupa", aday: 1 }, // el yapimi kupalar
  "urun-soya-mumu": { havuz: "tezgah-sultan", aday: 0 }, // tenekede mumlar (kendi havuzu suda cicekti)
  "urun-balmumu": { havuz: "urun-balmumu", aday: 1 }, // yanan balmumu mum

  // --- Diger
  "urun-feslegen-fidesi": { havuz: "urun-feslegen-fidesi", aday: 1 }, // saksida feslegen
  "urun-kuru-kekik": { havuz: "urun-kuru-kekik", aday: 1 }, // kaseda kuru kekik
  "urun-hasir-sepet": { havuz: "urun-hasir-sepet", aday: 0 }, // hasir sepet
  "urun-ekmek-sepeti": { havuz: "urun-ekmek-sepeti", aday: 1 }, // yuvarlak hasir sepet
};

// Kullanicidan foto BEKLENEN ogeler + neden (LISTE.md bunu basar).
const KULLANICIDAN_BEKLENEN = {
  "tezgah-elif": "aramaya müze tekstil yakın çekimleri geldi, hiçbiri bebek kıyafeti değil",
  "tezgah-zeynep": "ahşap kuş oymaları ve Bizans altın eserleri geldi, takı yok",
  "urun-mandalina-receli": "tek aday vardı (tezgah fotoğrafı), kavanoz yakın çekimi yok",
  "urun-yesil-zeytin": "salata/hummus/tablo geldi; 'green olives' araması zeytin AĞACI getiriyor",
  "urun-ot-kurabiyesi": "ticari kraker paketleri ve bir klasik otomobil geldi",
  "urun-amigurumi": "amigurumi bulundu ama hiçbiri AHTAPOT değil (bebek/tavşan/kedi)",
  "urun-kece-altlik": "performans sanatı ve bere takan kadın geldi, keçe altlık yok",
  "urun-bebek-zibin": "çizgi/desen çizimleri ve markalı ürün geldi",
  "urun-cocuk-onluk": "tablo, çizim ve numaralı müze kumaş çekimleri geldi",
  "urun-zeytin-kolye": "ahşap kolye yerine oyma kuş figürü ve müze eseri geldi",
  "urun-ahsap-kupe": "iş kadını stok fotoğrafları ve altın küpe geldi, ahşap küpe yok",
  "urun-lavanta-sabun": "hepsi MARKALI sabun ya da lavanta TARLASI",
  "urun-kil-maskesi": "yüzüne maske sürülmüş insanlar geldi; ürün 100 g toz kil",
  "urun-biberiye-suyu": "tek aday bir bira bardağıydı",
  "urun-seramik-saksi": "çaydanlık, minyatür mobilya ve pirinç alet geldi",
  "urun-domates-tohumu": "hep dilimlenmiş domates geldi, tohum paketi yok",
};

module.exports = { SECIMLER, KULLANICIDAN_BEKLENEN };
