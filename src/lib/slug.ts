// Saf (sunucu bagimliligi olmayan) slug yardimcilari - hem sunucu (magaza.ts,
// API route) hem istemci (onboarding sihirbazi canli onizleme) kullanabilsin diye
// ayri modulde. Buraya prisma/sunucu importu EKLENMEZ, aksi halde istemci paketine
// sizar.
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Ad'dan URL-dostu slug turetir (TR karakterleri sadelestirip). Onboarding'de
// deneyimsiz saticinin slug yazmasina gerek kalmasin diye ad'dan otomatik uretilir;
// kullanici isterse duzenler. Bos/gecersiz sonuc olursa cagiran taraf dogrular.
export function slugTuret(ad: string): string {
  return ad
    .trim()
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    // Kalan tum ASCII-disi karakterler (nadir yabanci aksanlar dahil) tireye
    // donusur; slug her zaman SLUG_REGEX'e uygun kalir, kullanici isterse duzenler.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
