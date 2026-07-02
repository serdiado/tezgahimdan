// Rezervasyon.pazarHaftasi: kaydin ait oldugu pazar dongusunu etiketler. Deger,
// urunun bagli oldugu pazarin BIR SONRAKI sifirlama aninin (or. Carsamba 20:00,
// Europe/Istanbul) takvim tarihi. Haftalik sifirlama scheduler'i (PLAN.md SS3)
// bu anahtara gore calisacak.

const GUN_INDEKSI: Record<string, number> = {
  PazarGunu: 0,
  Pazartesi: 1,
  Sali: 2,
  Carsamba: 3,
  Persembe: 4,
  Cuma: 5,
  Cumartesi: 6,
};

const INTL_GUNLER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function sonrakiSifirlamaTarihi(
  pazar: { sifirlamaGunu: string; sifirlamaSaati: Date; saatDilimi: string },
  simdi: Date = new Date(),
): Date {
  const parcalar = new Intl.DateTimeFormat("en-US", {
    timeZone: pazar.saatDilimi || "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(simdi);
  const p = Object.fromEntries(
    parcalar.filter((x) => x.type !== "literal").map((x) => [x.type, x.value]),
  );

  const yerelGun = INTL_GUNLER.indexOf(p.weekday);
  const hedefGun = GUN_INDEKSI[pazar.sifirlamaGunu];
  if (yerelGun < 0 || hedefGun === undefined) {
    throw new Error(`taninmayan gun: ${p.weekday} / ${pazar.sifirlamaGunu}`);
  }

  // Prisma @db.Time degerleri 1970-01-01 UTC tabanli Date olarak gelir;
  // saat-dakika kismi pazarin YEREL sifirlama saatini temsil eder.
  const sifirlamaDakikasi =
    pazar.sifirlamaSaati.getUTCHours() * 60 + pazar.sifirlamaSaati.getUTCMinutes();
  const suankiDakika = Number(p.hour) * 60 + Number(p.minute);

  let kalanGun = (hedefGun - yerelGun + 7) % 7;
  // Sifirlama gunundeyiz ama saat gectiyse bir sonraki haftaya sarkar.
  if (kalanGun === 0 && suankiDakika >= sifirlamaDakikasi) kalanGun = 7;

  // DATE kolonu icin UTC geceyarisi; Date.UTC gun tasmalarini (ay/yil siniri)
  // kendisi cozer.
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + kalanGun));
}
