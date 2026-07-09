// Saf URL dogrulama yardimcisi - hem admin pazar route'lari hem satici tezgah
// ayarlari (sosyal medya linkleri) kullanir, tek dogru kaynak.
export function gecerliUrlMi(deger: string): boolean {
  try {
    const u = new URL(deger);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
