// RezervasyonumIcerik.tsx (/rezervasyonum) ile UrunKarti/UrunDetayModal (mağaza
// sayfası) AYNI dili kullansın diye ortak - iki yerde ayrı ayrı yazılan "1.
// sırada" / "1. sıra" gibi küçük ifade farkları kullanıcıyı karıştırır. Prisma
// bağımlılığı yok (client component'lerden de import edilebilir).
export function siraMesaji(tip: "aktif" | "yedek", siraNo: number): string {
  return tip === "aktif" ? `${siraNo}. Sıradasın` : `${siraNo}. Yedeksin`;
}
