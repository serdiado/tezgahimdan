// Vitrin listelerinin "Daha Fazla Göster" sayfalamasi (2026-07-15).
// Karar ve gerekce: docs/mimari/vitrin-sayfalama.md
//
// Model: BIRIKEN take (skip DEGIL). ?sayfa=2 => take = ogeSayisi * 2, yani
// listenin ALTINA eklenir; kullanici ilk 12'yi kaybetmez. Admin panelindeki
// skip'li sayfalama (admin/kullanicilar) farkli bir kitle/baglam - oradan
// desen tasinmadi.
//
// Saf (sunucu bagimliligi olmayan) yardimcilar - hem sunucu bileseni hem
// istemci import edebilsin diye prisma importu YOK (bkz. lib/slug.ts ayni
// gerekce).

// Biriken take'te tavan SART: ?sayfa=99999 aksi halde tum tabloyu okuturdu.
// Skip'li desende take sabit oldugu icin bu risk yoktu. 8 x 24 (ogeSayisi
// tavani, bkz. sayfa-modulu-guncelle route) = en fazla 192 kayit.
export const MAX_SAYFA = 8;

export function sayfaNoCoz(ham: string | undefined): number {
  const n = Number(ham);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, MAX_SAYFA);
}

// "Daha var mi"yi EK SORGU OLMADAN ogrenmek icin: take'i limit+1 iste, gelen
// satir sayisi limiti asiyorsa daha var demektir. Fazladan satir ATILIR -
// haritalara (begeni/kuyruk/yorum) sokulmamali, yoksa gosterilmeyen kaydin
// verisi bosuna cekilip payload'a girer.
export function sayfaKes<T>(satirlar: T[], limit: number): { ogeler: T[]; dahaVarMi: boolean } {
  const dahaVarMi = satirlar.length > limit;
  return { ogeler: dahaVarMi ? satirlar.slice(0, limit) : satirlar, dahaVarMi };
}
