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

// Bir saat diliminin verilen andaki UTC ofsetini (dakika) dondurur. "shortOffset"
// DST dahil dogru ofseti verir (Turkiye 2016'dan beri sabit +3, ama genel calisir).
function tzOffsetDakika(saatDilimi: string, an: Date): number {
  const parcalar = new Intl.DateTimeFormat("en-US", {
    timeZone: saatDilimi,
    timeZoneName: "shortOffset",
  }).formatToParts(an);
  const tz = parcalar.find((x) => x.type === "timeZoneName")?.value ?? "GMT+0";
  const m = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const isaret = m[1] === "-" ? -1 : 1;
  return isaret * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

// Bir saat dilimindeki yerel gun+saati UTC ana cevirir. yerel = UTC + offset
// oldugu icin UTC = yerelGibiUTC - offset. (DST'siz bolgelerde kesin.)
function yerelAniUTC(
  saatDilimi: string,
  yil: number,
  ay0: number,
  gun: number,
  saat: number,
  dakika: number,
): Date {
  const yerelGibiUTC = Date.UTC(yil, ay0, gun, saat, dakika);
  const offset = tzOffsetDakika(saatDilimi, new Date(yerelGibiUTC));
  return new Date(yerelGibiUTC - offset * 60000);
}

type PazarZaman = {
  baslangicGunu: string;
  baslangicSaati: Date;
  sifirlamaGunu: string;
  sifirlamaSaati: Date;
  saatDilimi: string;
};

// pazarHaftasi: kapanis gununun tarihi (UTC geceyarisi, o pazarin Istanbul
// takvim gununu temsil eder). Kapanis/sifirlama ani = o gun + sifirlamaSaati.
export function pazarKapanisAni(pazar: PazarZaman, pazarHaftasi: Date): Date {
  return yerelAniUTC(
    pazar.saatDilimi || "Europe/Istanbul",
    pazarHaftasi.getUTCFullYear(),
    pazarHaftasi.getUTCMonth(),
    pazarHaftasi.getUTCDate(),
    pazar.sifirlamaSaati.getUTCHours(),
    pazar.sifirlamaSaati.getUTCMinutes(),
  );
}

// Kapanis gununun YEREL gece yarisi (24:00 = ertesi gunun 00:00). Kullanici
// karari (2026-07-09): otomatik "gelmedi" cezasi kapanis ANINDA DEGIL, saticiya
// isaretlemesi icin o gunun sonuna kadar sure taninip BURADA uygulanir -
// pazarHatirlatmalariGonder (rezervasyon.ts) kapanistan 1 saat sonra hatirlatir,
// urunSifirla/pazarlariSifirla bu andan once kuyruga DOKUNMAZ. pazarKapanisAni
// (yukarida) hala pazarin GERCEK/ilan edilen kapanis saati - UI'da "pazar acik
// mi" gostergesi (pazarRitimBilgisi) ve hatirlatma zamanlamasi ONU kullanmaya
// devam eder, SADECE ceza-uygulama tetikleyicisi bu fonksiyona tasindi.
export function pazarGunSonuAni(pazar: PazarZaman, pazarHaftasi: Date): Date {
  return yerelAniUTC(
    pazar.saatDilimi || "Europe/Istanbul",
    pazarHaftasi.getUTCFullYear(),
    pazarHaftasi.getUTCMonth(),
    pazarHaftasi.getUTCDate() + 1,
    0,
    0,
  );
}

// Baslangic (ceza esigi) ani = ayni hafta icinde, kapanis gununden GERIYE
// baslangicGunu + baslangicSaati. Ceza yalnizca bu andan ONCE aktif olanlara.
export function pazarBaslangicAni(pazar: PazarZaman, pazarHaftasi: Date): Date {
  const kapanisIdx = GUN_INDEKSI[pazar.sifirlamaGunu];
  const baslangicIdx = GUN_INDEKSI[pazar.baslangicGunu];
  if (kapanisIdx === undefined || baslangicIdx === undefined) {
    throw new Error(`taninmayan gun: ${pazar.sifirlamaGunu} / ${pazar.baslangicGunu}`);
  }
  const gunFarki = (kapanisIdx - baslangicIdx + 7) % 7; // baslangic kapanistan kac gun once
  return yerelAniUTC(
    pazar.saatDilimi || "Europe/Istanbul",
    pazarHaftasi.getUTCFullYear(),
    pazarHaftasi.getUTCMonth(),
    pazarHaftasi.getUTCDate() - gunFarki,
    pazar.baslangicSaati.getUTCHours(),
    pazar.baslangicSaati.getUTCMinutes(),
  );
}

// Verilen anin, pazarin saat diliminde hangi haftanin gunune denk geldigini
// (GUN_INDEKSI olcegiyle) dondurur - Ana Sayfa "bugun pazar gunu mu" kontrolu icin.
function yerelGunIndeksi(saatDilimi: string, simdi: Date): number {
  const gun = new Intl.DateTimeFormat("en-US", {
    timeZone: saatDilimi || "Europe/Istanbul",
    weekday: "short",
  }).format(simdi);
  return INTL_GUNLER.indexOf(gun);
}

export type PazarRitim = {
  // Hafta-penceresi anlaminda "rezervasyon kuyrugu hala acik mi" (kapanis/sifirlama
  // anina kadar) - motor anlaminda dogru ama alici yuzunde "pazar bugun mu" ile
  // KARISTIRILMAMALI (bkz. bugunPazarGunuMu). Ileride ise yarayabilir diye tutuluyor,
  // Ana Sayfa UI'i BUNU degil bugunPazarGunuMu'nu kullanir.
  acikMi: boolean;
  sonrakiAcilisAni: Date;
  gunAdi: string;
  // Bugun (pazarin saat diliminde) tam olarak baslangicGunu mu - alici yuzunde
  // gosterilecek tek gercek: "pazar GUNU bugun mu", hafta-penceresinin tamami degil.
  bugunPazarGunuMu: boolean;
};

// Ana Sayfa "haftalik ritim" widget'i icin: mevcut uc saf fonksiyonu birlestirir,
// yeni tarih-yuvarlama mantigi EKLEMEZ. sonrakiSifirlamaTarihi zaten "sifirlama
// saati gectiyse bir sonraki haftaya sar" kuralini uyguladigi icin, kapanisAni
// HER ZAMAN simdi'den sonradir - "zaten kapandi" icin ayrica dal gerekmez.
export function pazarRitimBilgisi(pazar: PazarZaman, simdi: Date = new Date()): PazarRitim {
  const pazarHaftasi = sonrakiSifirlamaTarihi(pazar, simdi);
  const baslangicAni = pazarBaslangicAni(pazar, pazarHaftasi);
  const kapanisAni = pazarKapanisAni(pazar, pazarHaftasi);
  const bugunGunIndeksi = yerelGunIndeksi(pazar.saatDilimi || "Europe/Istanbul", simdi);
  return {
    acikMi: simdi >= baslangicAni && simdi < kapanisAni,
    sonrakiAcilisAni: baslangicAni,
    gunAdi: pazar.baslangicGunu,
    bugunPazarGunuMu: bugunGunIndeksi === GUN_INDEKSI[pazar.baslangicGunu],
  };
}
