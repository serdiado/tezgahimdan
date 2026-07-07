// Tezgah bilgisi (serbest metin) uzunluk siniri - hem server action (actions.ts)
// hem form bileseni (MagazaAyarlariForm.tsx, maxLength) tarafindan kullanilir.
// "use server" dosyalarindan sadece async fonksiyon export edilebildigi icin
// (Next.js kurali) bu sabit AYRI, action-olmayan bir dosyada tutuluyor.
export const TEZGAH_BILGISI_MAX = 100;
