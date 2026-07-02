// Telefon = alici kimligi (PLAN.md SS5) - ayni numaranin "0555...", "+90 555..."
// gibi farkli yazimlari ayri Kullanici kayitlari uretmesin diye tek bicime
// (+90XXXXXXXXXX) indirgeriz. Kurallar TR'ye ozel; yabanci numara ancak basinda
// + ile girilirse kabul edilir.
export function telefonNormallestir(ham: string): string | null {
  const temiz = ham.replace(/[\s\-().]/g, "");
  if (!/^\+?\d{10,14}$/.test(temiz)) return null;

  if (temiz.startsWith("+")) return temiz;
  if (temiz.length === 12 && temiz.startsWith("90")) return `+${temiz}`;
  if (temiz.length === 11 && temiz.startsWith("0")) return `+9${temiz}`;
  if (temiz.length === 10 && temiz.startsWith("5")) return `+90${temiz}`;

  // 10 haneli ama 5 ile baslamayan (or. bassiz sabit hat) belirsiz - reddet,
  // kullanici basina 0 koyarak tekrar denesin.
  return null;
}
