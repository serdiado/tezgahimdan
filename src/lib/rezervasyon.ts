import { randomInt } from "node:crypto";
import { p2002Hedefi, p2002Mi, prisma } from "@/lib/prisma";
import { sonrakiSifirlamaTarihi } from "@/lib/pazar-haftasi";

// PLAN.md SS3: stok kadar aktif hak sahibi + arkasinda en fazla 5 yedek;
// toplam (stok + MAX_YEDEK) dolunca rezervasyon kapanir.
export const MAX_YEDEK = 5;

export type RezervasyonSonucu =
  | { tur: "olusturuldu"; tip: "aktif" | "yedek"; siraNo: number; rezervKodu: string }
  | { tur: "zaten-var"; tip: "aktif" | "yedek"; siraNo: number; rezervKodu: string }
  | { tur: "dolu" }
  | { tur: "urun-yok" }
  | { tur: "satista-degil" };

// 0/O, 1/I gibi karistirilabilir karakterler yok - kod pazarda sozlu soylenecek.
const KOD_ALFABESI = "ABCDEFGHJKMNPRSTUVYZ23456789";

function rezervKoduUret(): string {
  let govde = "";
  for (let i = 0; i < 6; i++) govde += KOD_ALFABESI[randomInt(KOD_ALFABESI.length)];
  return `TZ-${govde}`;
}

// Telefon = kimlik. Ayni telefon tekrar geldiginde mevcut kayit kullanilir; ad
// GUNCELLENMEZ (telefon dogrulamasi olmadigi icin, numarayi yazan herkesin
// baskasinin kaydini yeniden adlandirmasina izin vermiyoruz).
//
// Bilerek transaction DISINDA: Postgres'te transaction icindeki herhangi bir
// hata (P2002 dahil) tum transaction'i iptal eder; buradaki yakala-tekrar-bul
// deseni bir transaction icinde calisamazdi. Disarida olmasi ayrica urun
// kilidinin tutulma suresini kisaltir ve kilit sirasini tekduze yapar
// (once kullanici, sonra urun) - deadlock dongusu kurulamaz.
async function aliciBulVeyaOlustur(ad: string, telefon: string) {
  const mevcut = await prisma.kullanici.findUnique({ where: { telefon } });
  if (mevcut) return mevcut;
  try {
    return await prisma.kullanici.create({ data: { ad, telefon, rol: "alici" } });
  } catch (err) {
    // Ayni telefonla es zamanli iki ilk-istek: kaybeden P2002 alir, kazananin
    // kaydini kullanir.
    if (p2002Mi(err)) {
      const yarisSonrasi = await prisma.kullanici.findUnique({ where: { telefon } });
      if (yarisSonrasi) return yarisSonrasi;
    }
    throw err;
  }
}

// Kilit stratejisi: urun satirinda SELECT ... FOR UPDATE. Ayni urune gelen tum
// rezervasyon denemeleri bu kilitte tam siraya girer; sayim + karar + insert
// kilit altinda oldugu icin kapasite asimi veya cift siraNo olusamaz. Farkli
// urunler birbirini engellemez. Optimistic (P2002-retry) yaklasima tercih
// nedeni: retry dongusu yok, "dolu" karari icin zaten guvenilir sayim gerekir
// ve urun basina es zamanli istek sayisi bu uygulamada kucuk - milisaniyelik
// kritik bolge icin pesimistik kilit en denetlenebilir cozum.
export async function rezervasyonOlustur(params: {
  urunId: string;
  ad: string;
  telefon: string;
}): Promise<RezervasyonSonucu> {
  // Hizli 404 + pazar bilgisi (kilide girmeden okunabilir; pazar tanimi
  // rezervasyon aninda degismez).
  const urunOn = await prisma.urun.findUnique({
    where: { id: params.urunId },
    select: { id: true, silindiMi: true, magaza: { select: { pazar: true } } },
  });
  if (!urunOn || urunOn.silindiMi) return { tur: "urun-yok" };
  const pazarHaftasi = sonrakiSifirlamaTarihi(urunOn.magaza.pazar);

  const alici = await aliciBulVeyaOlustur(params.ad, params.telefon);

  // rezervKodu carpismasi (32^6 ihtimalde) tum transaction'i iptal ettirir;
  // yeni kodla bastan denemek guvenli (islem henuz hicbir sey yazmamistir).
  for (let deneme = 0; deneme < 3; deneme++) {
    const rezervKodu = rezervKoduUret();
    try {
      return await prisma.$transaction(
        async (tx): Promise<RezervasyonSonucu> => {
          const kilitli = await tx.$queryRaw<
            { id: string; stokAdedi: number; durum: string; silindiMi: boolean }[]
          >`SELECT "id", "stokAdedi", "durum", "silindiMi" FROM "Urun" WHERE "id" = ${params.urunId} FOR UPDATE`;
          const urun = kilitli[0];
          if (!urun || urun.silindiMi) return { tur: "urun-yok" };
          if (urun.durum === "satildi") return { tur: "satista-degil" };

          // Ayni alici + ayni urun icin ikinci 'bekliyor' kaydini dostca
          // reddet (mevcut kodunu geri goster). DB'deki partial unique index
          // (Rezervasyon_urunId_aliciId_bekliyor_unique_idx) son savunma
          // hatti olarak duruyor; kilit altinda oldugumuz icin normalde
          // hic tetiklenmez.
          const zaten = await tx.rezervasyon.findFirst({
            where: { urunId: urun.id, aliciId: alici.id, durum: "bekliyor" },
          });
          if (zaten) {
            return {
              tur: "zaten-var",
              tip: zaten.tip,
              siraNo: zaten.siraNo,
              rezervKodu: zaten.rezervKodu,
            };
          }

          // Kapasiteyi sadece 'bekliyor' kayitlar isgal eder - iptal/gelmedi/
          // satildi gecmis kayittir, slot acar (vazgec akisinin temeli).
          const aktifSayisi = await tx.rezervasyon.count({
            where: { urunId: urun.id, durum: "bekliyor", tip: "aktif" },
          });
          const yedekSayisi = await tx.rezervasyon.count({
            where: { urunId: urun.id, durum: "bekliyor", tip: "yedek" },
          });

          let tip: "aktif" | "yedek";
          let siraNo: number;
          if (aktifSayisi < urun.stokAdedi) {
            tip = "aktif";
            siraNo = aktifSayisi + 1; // aktif icinde 1..stok
          } else if (yedekSayisi < MAX_YEDEK) {
            tip = "yedek";
            siraNo = yedekSayisi + 1; // yedek kuyrugunda 1..5
          } else {
            return { tur: "dolu" };
          }

          const rezervasyon = await tx.rezervasyon.create({
            data: {
              urunId: urun.id,
              aliciId: alici.id,
              tip,
              siraNo,
              rezervKodu,
              pazarHaftasi,
            },
          });

          // PLAN.md SS5: onemli degisiklikler DurumGecmisi'ne loglanir.
          await tx.durumGecmisi.create({
            data: {
              kullaniciId: alici.id,
              varlikTuru: "Rezervasyon",
              varlikId: rezervasyon.id,
              olay: `rezervasyon_olusturuldu:${tip}:${siraNo}`,
            },
          });

          // Son slot da dolduysa urunu 'doldu' yap - vitrin butonu kapanir.
          // (Ileride vazgec/sifirlama slot bosaltinca 'sergide'ye geri
          // cevrilmeli; bu esik tek yazma noktasi olarak burada.)
          if (aktifSayisi + yedekSayisi + 1 >= urun.stokAdedi + MAX_YEDEK && urun.durum === "sergide") {
            await tx.urun.update({ where: { id: urun.id }, data: { durum: "doldu" } });
            await tx.durumGecmisi.create({
              data: {
                kullaniciId: alici.id,
                varlikTuru: "Urun",
                varlikId: urun.id,
                olay: "urun_doldu",
              },
            });
          }

          return { tur: "olusturuldu", tip, siraNo, rezervKodu };
        },
        { maxWait: 5000, timeout: 15000 },
      );
    } catch (err) {
      if (p2002Mi(err)) {
        const hedef = p2002Hedefi(err);
        if (hedef.includes("rezervKodu")) continue; // yeni kodla tekrar dene
        // Partial index tetiklendi (teoride kilit bunu engeller; yine de
        // dostca cevaba cevir).
        const mevcutRez = await prisma.rezervasyon.findFirst({
          where: { urunId: params.urunId, aliciId: alici.id, durum: "bekliyor" },
        });
        if (mevcutRez) {
          return {
            tur: "zaten-var",
            tip: mevcutRez.tip,
            siraNo: mevcutRez.siraNo,
            rezervKodu: mevcutRez.rezervKodu,
          };
        }
      }
      throw err;
    }
  }
  throw new Error("rezerv kodu uretilemedi (art arda carpisma)");
}

// ---------------------------------------------------------------------------
// Sorgula + Vazgec
// ---------------------------------------------------------------------------

// Kimlik: rezerv kodu + telefon IKISI birden eslesmeli; hangisinin yanlis
// oldugu soylenmez (kod/telefon taramasini zorlastirmak icin tek cevap:
// "bulunamadi").
export async function rezervasyonSorgula(params: { rezervKodu: string; telefon: string }) {
  const rez = await prisma.rezervasyon.findUnique({
    where: { rezervKodu: params.rezervKodu },
    include: {
      alici: { select: { telefon: true } },
      urun: { select: { baslik: true, magaza: { select: { ad: true } } } },
    },
  });
  if (!rez || rez.alici.telefon !== params.telefon) return null;
  return {
    rezervKodu: rez.rezervKodu,
    tip: rez.tip,
    siraNo: rez.siraNo,
    durum: rez.durum,
    urunBaslik: rez.urun.baslik,
    magazaAd: rez.urun.magaza.ad,
  };
}

export type VazgecSonucu =
  | { tur: "iptal-edildi"; yukselenKodu: string | null }
  | { tur: "bulunamadi" }
  | { tur: "islenemez"; durum: string };

// Vazgec, rezervasyonOlustur ile AYNI kilidi (urun satirinda FOR UPDATE)
// kullanir - iki akis ayni urunun kuyrugunu ayni anda degistiremez.
//
// Numaralandirma kurali (olusturma tarafindaki "sayim+1" atamasiyla uyum icin
// bosluk birakilmaz):
//  - aktif iptal + yedek varsa: yedek#1 aktif olur ve iptal edilenin
//    siraNo'sunu devralir; kalan yedekler 1 azalir.
//  - aktif iptal + yedek yoksa: iptal edilenin ustundeki aktifler 1 azalir.
//  - yedek iptal: ustundeki yedekler 1 azalir.
export async function rezervasyonVazgec(params: {
  rezervKodu: string;
  telefon: string;
}): Promise<VazgecSonucu> {
  const rezOn = await prisma.rezervasyon.findUnique({
    where: { rezervKodu: params.rezervKodu },
    include: { alici: { select: { telefon: true } } },
  });
  if (!rezOn || rezOn.alici.telefon !== params.telefon) return { tur: "bulunamadi" };

  return prisma.$transaction(
    async (tx): Promise<VazgecSonucu> => {
      const kilitli = await tx.$queryRaw<
        { id: string; durum: string }[]
      >`SELECT "id", "durum" FROM "Urun" WHERE "id" = ${rezOn.urunId} FOR UPDATE`;
      const urun = kilitli[0];

      // Kilidi aldiktan sonra rezervasyonu TAZE oku: es zamanli bir vazgec
      // onu coktan iptal etmis ya da bir yukselme tip/siraNo'sunu degistirmis
      // olabilir.
      const rez = await tx.rezervasyon.findUnique({ where: { rezervKodu: params.rezervKodu } });
      if (!rez || rez.durum !== "bekliyor") {
        return { tur: "islenemez", durum: rez?.durum ?? "yok" };
      }

      await tx.rezervasyon.update({ where: { id: rez.id }, data: { durum: "iptal" } });
      await tx.durumGecmisi.create({
        data: {
          kullaniciId: rez.aliciId,
          varlikTuru: "Rezervasyon",
          varlikId: rez.id,
          olay: `rezervasyon_iptal:${rez.tip}:${rez.siraNo}`,
        },
      });

      let yukselenKodu: string | null = null;
      if (rez.tip === "aktif") {
        const birinciYedek = await tx.rezervasyon.findFirst({
          where: { urunId: rez.urunId, durum: "bekliyor", tip: "yedek" },
          orderBy: { siraNo: "asc" },
        });
        if (birinciYedek) {
          // Once yukselt (tip degisince asagidaki azaltmanin disinda kalir),
          // sonra kalan yedekleri kaydir.
          await tx.rezervasyon.update({
            where: { id: birinciYedek.id },
            data: { tip: "aktif", siraNo: rez.siraNo },
          });
          await tx.rezervasyon.updateMany({
            where: {
              urunId: rez.urunId,
              durum: "bekliyor",
              tip: "yedek",
              siraNo: { gt: birinciYedek.siraNo },
            },
            data: { siraNo: { decrement: 1 } },
          });
          await tx.durumGecmisi.create({
            data: {
              kullaniciId: birinciYedek.aliciId,
              varlikTuru: "Rezervasyon",
              varlikId: birinciYedek.id,
              olay: `rezervasyon_yedekten_aktife:${rez.siraNo}`,
            },
          });
          yukselenKodu = birinciYedek.rezervKodu;
        } else {
          await tx.rezervasyon.updateMany({
            where: {
              urunId: rez.urunId,
              durum: "bekliyor",
              tip: "aktif",
              siraNo: { gt: rez.siraNo },
            },
            data: { siraNo: { decrement: 1 } },
          });
        }
      } else {
        await tx.rezervasyon.updateMany({
          where: {
            urunId: rez.urunId,
            durum: "bekliyor",
            tip: "yedek",
            siraNo: { gt: rez.siraNo },
          },
          data: { siraNo: { decrement: 1 } },
        });
      }

      // Kritik bagimlilik (docs/mimari/rezervasyon-motoru.md): iptal her zaman
      // tam bir slot bosaltir; urun 'doldu' idiyse artik degildir.
      if (urun?.durum === "doldu") {
        await tx.urun.update({ where: { id: rez.urunId }, data: { durum: "sergide" } });
        await tx.durumGecmisi.create({
          data: {
            kullaniciId: rez.aliciId,
            varlikTuru: "Urun",
            varlikId: rez.urunId,
            olay: "urun_tekrar_sergide",
          },
        });
      }

      return { tur: "iptal-edildi", yukselenKodu };
    },
    { maxWait: 5000, timeout: 15000 },
  );
}
