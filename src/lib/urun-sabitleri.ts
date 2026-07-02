// Urun fotografi yukleme sinirlari - hem client formu hem API route bunlari kullanir.
export const MAX_FOTOGRAF = 5;
export const MAX_BOYUT_BYTE = 5 * 1024 * 1024; // 5MB
export const IZINLI_TIPLER: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
