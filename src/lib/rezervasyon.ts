import { randomInt, randomUUID } from "node:crypto";
import { p2002Hedefi, p2002Mi, prisma } from "@/lib/prisma";
import {
  pazarBaslangicAni,
  pazarHatirlatmaAni,
  pazarIslemSonAni,
  sonrakiSifirlamaTarihi,
} from "@/lib/pazar-haftasi";
import { kullaniciYasakliMi } from "@/lib/yetki";
import { platformAyarlariGetir } from "@/lib/platform-ayarlari";

// PLAN.md SS3: stok kadar aktif hak sahibi + arkasinda en fazla "maxYedek"
// yedek; toplam (stok + maxYedek) dolunca rezervasyon kapanir. Eskiden kod-ici
// sabitti (MAX_YEDEK=5, GUVENILIRLIK_ESIGI=3) - artik PlatformAyarlari
// tablosunda tutulur, admin /admin/ayarlar'dan degistirebilir (bkz.
// src/lib/platform-ayarlari.ts). rezervasyonOlustur/rezervasyonGeriAl bu
// degerleri kilit ONCESI (platformAyarlariGetir ile) okur.

// Kart/vitrin gosterimi icin salt-okunur ozet (karar-kritik degil, kilit
// GEREKTIRMEZ - rezervasyonOlustur/vazgec/sonuclandir'in FOR UPDATE'li kilit
// akisina hic dokunmaz). begeniSayilariHaritasi (lib/favori.ts) ile ayni
// groupBy+Map deseni, N+1 onler.
export async function kuyrukSayilariHaritasi(
  urunIdler: string[],
): Promise<Map<string, { aktif: number; yedek: number }>> {
  const harita = new Map<string, { aktif: number; yedek: number }>();
  if (urunIdler.length === 0) return harita;
  const satirlar = await prisma.rezervasyon.groupBy({
    by: ["urunId", "tip"],
    where: { urunId: { in: urunIdler }, durum: "bekliyor" },
    _count: true,
  });
  for (const satir of satirlar) {
    const mevcut = harita.get(satir.urunId) ?? { aktif: 0, yedek: 0 };
    if (satir.tip === "aktif") mevcut.aktif = satir._count;
    else mevcut.yedek = satir._count;
    harita.set(satir.urunId, mevcut);
  }
  return harita;
}

// id: kart/modaldaki vazgec butonunun /api/rezervasyon/vazgec'e gonderecegi
// rezervId (2026-07-07: gosterge artik tiklanabilir, dogrudan iptal edebiliyor).
export type BenimRezervasyonum = { id: string; tip: "aktif" | "yedek"; siraNo: number; rezervKodu: string };

// UrunKarti/UrunDetayModal'in "Rezerve Et" yerine kullanicinin KENDI sira
// durumunu gostermesi icin (2026-07-07 onaylanan istek) - kuyrukSayilariHaritasi
// ile AYNI toplu-Map deseni (N+1 onler). Partial unique index (asagida,
// rezervasyonOlustur) her (urunId, aliciId) icin en fazla 1 'bekliyor' kaydi
// garantiledigi icin harita degeri her zaman TEKIL.
export async function benimRezervasyonlarimHaritasi(
  aliciId: string | null | undefined,
  urunIdler: string[],
): Promise<Map<string, BenimRezervasyonum>> {
  const harita = new Map<string, BenimRezervasyonum>();
  if (!aliciId || urunIdler.length === 0) return harita;
  const satirlar = await prisma.rezervasyon.findMany({
    where: { urunId: { in: urunIdler }, aliciId, durum: "bekliyor" },
    select: { id: true, urunId: true, tip: true, siraNo: true, rezervKodu: true },
  });
  for (const satir of satirlar) {
    harita.set(satir.urunId, {
      id: satir.id,
      tip: satir.tip,
      siraNo: satir.siraNo,
      rezervKodu: satir.rezervKodu,
    });
  }
  return harita;
}

export type RezervasyonSonucu =
  | { tur: "olusturuldu"; tip: "aktif" | "yedek"; siraNo: number; rezervKodu: string }
  | { tur: "zaten-var"; tip: "aktif" | "yedek"; siraNo: number; rezervKodu: string }
  | { tur: "dolu" }
  | { tur: "urun-yok" }
  | { tur: "magaza-gizli" }
  | { tur: "satista-degil" }
  | { tur: "guvenilirlik-kisitli"; gelmediSayisi: number }
  | { tur: "yasakli" };

// 0/O, 1/I gibi karistirilabilir karakterler yok - kod pazarda sozlu soylenecek.
const KOD_ALFABESI = "ABCDEFGHJKMNPRSTUVYZ23456789";

function rezervKoduUret(): string {
  let govde = "";
  for (let i = 0; i < 6; i++) govde += KOD_ALFABESI[randomInt(KOD_ALFABESI.length)];
  return `TZ-${govde}`;
}

// Kilit stratejisi: urun satirinda SELECT ... FOR UPDATE. Ayni urune gelen tum
// rezervasyon denemeleri bu kilitte tam siraya girer; sayim + karar + insert
// kilit altinda oldugu icin kapasite asimi veya cift siraNo olusamaz. Farkli
// urunler birbirini engellemez. Optimistic (P2002-retry) yaklasima tercih
// nedeni: retry dongusu yok, "dolu" karari icin zaten guvenilir sayim gerekir
// ve urun basina es zamanli istek sayisi bu uygulamada kucuk - milisaniyelik
// kritik bolge icin pesimistik kilit en denetlenebilir cozum.
// KP-1 (uyelik zorunlulugu): alici artik telefonla degil, giris yapmis kullanici
// kimligiyle (aliciId = session.user.id) gelir. Kimlik cozumleme (kullanici bul/
// olustur, telefon kaydi) API katmaninda yapilir; motor yalniz aliciId alir.
export async function rezervasyonOlustur(params: {
  urunId: string;
  aliciId: string;
}): Promise<RezervasyonSonucu> {
  // Admin moderasyon: yasakli kullanici YENI rezervasyon alamaz (mevcut
  // gizli-magaza on-kontrolu ile AYNI konum/gerekce - kilide girmeden, tek
  // kullaniciya bagli, motor kilidine ihtiyaci yok).
  if (await kullaniciYasakliMi(params.aliciId)) return { tur: "yasakli" };

  // Guvenilirlik afi: admin bir sifirlama tarihi atadiysa (bkz.
  // api/admin/kullanici-guvenilirlik-sifirla), asagidaki gelmediSayisi sayimi
  // SADECE bu tarihten SONRAKI kayitlari sayar - kalici muafiyet degil, yeniden
  // esigi asarsa kisit tekrar devreye girer. Tek kullaniciya bagli, kilide
  // girmeden okunabilir (yasakliMi ile ayni konum/gerekce).
  const guvenilirlik = await prisma.kullanici.findUnique({
    where: { id: params.aliciId },
    select: { guvenilirlikSifirlamaTarihi: true },
  });
  const guvenilirlikBaslangici = guvenilirlik?.guvenilirlikSifirlamaTarihi ?? null;

  // Platform ayarlari (guvenilirlik esigi, max yedek) - tek satirlik, sik
  // degismeyen global config; yasakliMi/guvenilirlik ile AYNI konum/gerekce.
  const ayarlar = await platformAyarlariGetir();

  // Hizli 404 + pazar bilgisi (kilide girmeden okunabilir; pazar tanimi
  // rezervasyon aninda degismez).
  const urunOn = await prisma.urun.findUnique({
    where: { id: params.urunId },
    select: { id: true, silindiMi: true, magaza: { select: { gizliMi: true, pazar: true } } },
  });
  if (!urunOn || urunOn.silindiMi) return { tur: "urun-yok" };
  // Admin bir magazayi vitrinsen gizlediyse (moderasyon) yeni rezervasyon
  // ALINMAZ. Mevcut bekleyen rezervasyonlara dokunulmaz - onlar satici panelinden
  // normal sonuclanir; sadece yeni giris kapanir. (gizliMi degisimi admin kaynakli
  // ve nadir; kilit oncesi on-kontrol yeterli - satildiMi/silindiMi ile ayni desen.)
  if (urunOn.magaza.gizliMi) return { tur: "magaza-gizli" };
  const pazarHaftasi = sonrakiSifirlamaTarihi(urunOn.magaza.pazar);

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
            where: { urunId: urun.id, aliciId: params.aliciId, durum: "bekliyor" },
          });
          if (zaten) {
            return {
              tur: "zaten-var",
              tip: zaten.tip,
              siraNo: zaten.siraNo,
              rezervKodu: zaten.rezervKodu,
            };
          }

          // Guvenilirlik kisitlamasi (PLAN.md SS3): GUVENILIRLIK_ESIGI'ni asan
          // gelmedi sayisi olan alici, halihazirda (herhangi bir urunde) bir
          // aktif rezervasyonu varsa YENI rezervasyon (aktif ya da yedek fark
          // etmez) alamaz - once elindekini sonuclandirmasi gerekir. Bu kontrol
          // sadece BU urunun kilidi altinda calisiyor; alicinin ayni anda BASKA
          // bir urune de saldirmasi (iki farkli urun kilidi) ele alinmiyor -
          // dusuk ihtimalli, kabul edilen bir yaris (bkz. docs/mimari).
          const gelmediSayisi = await tx.rezervasyon.count({
            where: {
              aliciId: params.aliciId,
              durum: "gelmedi",
              ...(guvenilirlikBaslangici ? { createdAt: { gt: guvenilirlikBaslangici } } : {}),
            },
          });
          if (gelmediSayisi >= ayarlar.guvenilirlikEsigi) {
            const aktifRezervasyonVarMi = await tx.rezervasyon.count({
              where: { aliciId: params.aliciId, durum: "bekliyor", tip: "aktif" },
            });
            if (aktifRezervasyonVarMi > 0) {
              return { tur: "guvenilirlik-kisitli", gelmediSayisi };
            }
          }

          // Kapasiteyi sadece 'bekliyor' kayitlar isgal eder - iptal/gelmedi
          // gecmis kayittir, slot acar (vazgec/gelmedi akislarinin temeli).
          // 'satildi' ise BIRIMI TUKETIR: her satis kalan satilabilir birimi
          // (kalanBirim) 1 azaltir, yani aktif kapasitesi stokAdedi degil
          // kalanBirim'dir (satildi=0 iken ikisi esit -> geriye uyumlu).
          const satildiSayisi = await tx.rezervasyon.count({
            where: { urunId: urun.id, durum: "satildi" },
          });
          const kalanBirim = urun.stokAdedi - satildiSayisi;
          if (kalanBirim <= 0) return { tur: "satista-degil" };

          const aktifSayisi = await tx.rezervasyon.count({
            where: { urunId: urun.id, durum: "bekliyor", tip: "aktif" },
          });
          const yedekSayisi = await tx.rezervasyon.count({
            where: { urunId: urun.id, durum: "bekliyor", tip: "yedek" },
          });

          let tip: "aktif" | "yedek";
          let siraNo: number;
          if (aktifSayisi < kalanBirim) {
            tip = "aktif";
            siraNo = aktifSayisi + 1; // aktif icinde 1..kalanBirim
          } else if (yedekSayisi < ayarlar.maxYedek) {
            tip = "yedek";
            siraNo = yedekSayisi + 1; // yedek kuyrugunda 1..5
          } else {
            return { tur: "dolu" };
          }

          const rezervasyon = await tx.rezervasyon.create({
            data: {
              urunId: urun.id,
              aliciId: params.aliciId,
              tip,
              siraNo,
              rezervKodu,
              pazarHaftasi,
              // aktif atandiysa sifirlama cezasi icin "aktife gecis ani" kaydedilir.
              aktifOlmaZamani: tip === "aktif" ? new Date() : null,
            },
          });

          // PLAN.md SS5: onemli degisiklikler DurumGecmisi'ne loglanir.
          await tx.durumGecmisi.create({
            data: {
              kullaniciId: params.aliciId,
              varlikTuru: "Rezervasyon",
              varlikId: rezervasyon.id,
              olay: `rezervasyon_olusturuldu:${tip}:${siraNo}`,
            },
          });

          // Son slot da dolduysa urunu 'doldu' yap - vitrin butonu kapanir.
          // Kapasite = kalanBirim + maxYedek (satildikca kalanBirim kucultur).
          if (aktifSayisi + yedekSayisi + 1 >= kalanBirim + ayarlar.maxYedek && urun.durum === "sergide") {
            await tx.urun.update({ where: { id: urun.id }, data: { durum: "doldu" } });
            await tx.durumGecmisi.create({
              data: {
                kullaniciId: params.aliciId,
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
          where: { urunId: params.urunId, aliciId: params.aliciId, durum: "bekliyor" },
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

// Birden fazla alici icin tek sorguda satildi/gelmedi sayilarini doner (satici
// "Gelen Rezervasyonlar" ekraninda her satir icin ayri sorgu yerine toplu
// cekim). PLAN.md SS3: "Saticiya rezervasyonda alicinin orani gosterilir".
export async function aliciGuvenilirlikHaritasi(
  aliciIdler: string[],
): Promise<Map<string, { satildi: number; gelmedi: number }>> {
  const harita = new Map<string, { satildi: number; gelmedi: number }>();
  if (aliciIdler.length === 0) return harita;

  const satirlar = await prisma.rezervasyon.groupBy({
    by: ["aliciId", "durum"],
    where: { aliciId: { in: aliciIdler }, durum: { in: ["satildi", "gelmedi"] } },
    _count: true,
  });
  for (const satir of satirlar) {
    const mevcut = harita.get(satir.aliciId) ?? { satildi: 0, gelmedi: 0 };
    if (satir.durum === "satildi") mevcut.satildi = satir._count;
    else if (satir.durum === "gelmedi") mevcut.gelmedi = satir._count;
    harita.set(satir.aliciId, mevcut);
  }

  // Guvenilirlik afi (bkz. Kullanici.guvenilirlikSifirlamaTarihi, rezervasyonOlustur):
  // sifirlanmis kullanicilar icin "gelmedi" yukaridaki TUM-ZAMANLAR toplu
  // groupBy'da hala eski degeriyle duruyor - sifirlama tarihi kullanici basina
  // farkli oldugu icin tek sorguda ifade edilemez, bu yuzden SADECE sifirlanmis
  // olanlar icin (kucuk N) ayri ayri yeniden hesaplanir. Bu fonksiyonu cagiran
  // satici paneli (panel/rezervasyonlar) "kisitli" rozetini motorla TUTARLI
  // gostersin diye gerekli.
  const sifirlanmislar = await prisma.kullanici.findMany({
    where: { id: { in: aliciIdler }, guvenilirlikSifirlamaTarihi: { not: null } },
    select: { id: true, guvenilirlikSifirlamaTarihi: true },
  });
  for (const k of sifirlanmislar) {
    const yeniGelmedi = await prisma.rezervasyon.count({
      where: { aliciId: k.id, durum: "gelmedi", createdAt: { gt: k.guvenilirlikSifirlamaTarihi! } },
    });
    const mevcut = harita.get(k.id) ?? { satildi: 0, gelmedi: 0 };
    harita.set(k.id, { ...mevcut, gelmedi: yeniGelmedi });
  }

  return harita;
}

// ---------------------------------------------------------------------------
// Ortak slot-bosaltma yardimcilari
// (transaction + urun kilidi CAGIRAN tarafindan tutulur; buradaki islemler o
// kilit altinda calisir)
// ---------------------------------------------------------------------------

type TxKismi = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Bir AKTIF slot'u serbest birakir. "Birim hala satilik" durumlarinda kullanilir
// (vazgec, gelmedi) - satildi'da KULLANILMAZ (o birim tuketilir). Yedek#1 varsa
// aktife yukseltir ve bosalan siraNo'yu devralir, kalan yedekler 1 kayar; yedek
// yoksa ustteki aktifleri kaydirir. Yukselenin rezervKodu'nu doner.
async function aktifSlotBosalt(
  tx: TxKismi,
  urunId: string,
  bosalan: { siraNo: number },
): Promise<string | null> {
  const birinciYedek = await tx.rezervasyon.findFirst({
    where: { urunId, durum: "bekliyor", tip: "yedek" },
    orderBy: { siraNo: "asc" },
  });
  if (birinciYedek) {
    await tx.rezervasyon.update({
      where: { id: birinciYedek.id },
      // Yedekten aktife yukseliyor -> aktife gecis ani guncellenir (sifirlama
      // cezasi bu ani pazar baslangiciyla karsilastirir).
      data: { tip: "aktif", siraNo: bosalan.siraNo, aktifOlmaZamani: new Date() },
    });
    await tx.rezervasyon.updateMany({
      where: { urunId, durum: "bekliyor", tip: "yedek", siraNo: { gt: birinciYedek.siraNo } },
      data: { siraNo: { decrement: 1 } },
    });
    await tx.durumGecmisi.create({
      data: {
        kullaniciId: birinciYedek.aliciId,
        varlikTuru: "Rezervasyon",
        varlikId: birinciYedek.id,
        olay: `rezervasyon_yedekten_aktife:${bosalan.siraNo}`,
      },
    });
    return birinciYedek.rezervKodu;
  }
  await tx.rezervasyon.updateMany({
    where: { urunId, durum: "bekliyor", tip: "aktif", siraNo: { gt: bosalan.siraNo } },
    data: { siraNo: { decrement: 1 } },
  });
  return null;
}

// Bir YEDEK slot'unu serbest birakir: ustteki yedekleri 1 kaydirir.
async function yedekSlotBosalt(tx: TxKismi, urunId: string, bosalan: { siraNo: number }) {
  await tx.rezervasyon.updateMany({
    where: { urunId, durum: "bekliyor", tip: "yedek", siraNo: { gt: bosalan.siraNo } },
    data: { siraNo: { decrement: 1 } },
  });
}

// ---------------------------------------------------------------------------
// Sorgula + Vazgec
// ---------------------------------------------------------------------------

export type VazgecSonucu =
  // tip: iptal edilen kaydin aktif/yedek olmasi - cagiran taraf (API route) bunu
  // favori/bildirim tetiklemesinde kullanir (yedek-tier hareketleri bildirilmez).
  // urunId: hangi urunun takipcilerine bildirim gidecegini bilmek icin.
  | { tur: "iptal-edildi"; yukselenKodu: string | null; tip: "aktif" | "yedek"; urunId: string }
  | { tur: "bulunamadi" }
  | { tur: "islenemez"; durum: string };

// Vazgec, rezervasyonOlustur ile AYNI kilidi (urun satirinda FOR UPDATE)
// kullanir - iki akis ayni urunun kuyrugunu ayni anda degistiremez.
//
// KP-1: kimlik dogrulama artik (kod + telefon) degil, giris yapmis kullanicinin
// KENDI rezervasyonu olmasi. rezervId istemciden gelir ama rezervasyon aliciId'si
// session'daki kullaniciyla eslesmezse "bulunamadi" (baskasinin rezervasyonuna
// dokunulamaz, kayit varligini sizdirmayiz).
//
// Numaralandirma kurali (olusturma tarafindaki "sayim+1" atamasiyla uyum icin
// bosluk birakilmaz):
//  - aktif iptal + yedek varsa: yedek#1 aktif olur ve iptal edilenin
//    siraNo'sunu devralir; kalan yedekler 1 azalir.
//  - aktif iptal + yedek yoksa: iptal edilenin ustundeki aktifler 1 azalir.
//  - yedek iptal: ustundeki yedekler 1 azalir.
export async function rezervasyonVazgec(params: {
  rezervId: string;
  aliciId: string;
}): Promise<VazgecSonucu> {
  const rezOn = await prisma.rezervasyon.findUnique({
    where: { id: params.rezervId },
    select: { id: true, urunId: true, aliciId: true },
  });
  if (!rezOn || rezOn.aliciId !== params.aliciId) return { tur: "bulunamadi" };

  return prisma.$transaction(
    async (tx): Promise<VazgecSonucu> => {
      const kilitli = await tx.$queryRaw<
        { id: string; durum: string }[]
      >`SELECT "id", "durum" FROM "Urun" WHERE "id" = ${rezOn.urunId} FOR UPDATE`;
      const urun = kilitli[0];

      // Kilidi aldiktan sonra rezervasyonu TAZE oku: es zamanli bir vazgec
      // onu coktan iptal etmis ya da bir yukselme tip/siraNo'sunu degistirmis
      // olabilir.
      const rez = await tx.rezervasyon.findUnique({ where: { id: params.rezervId } });
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
        yukselenKodu = await aktifSlotBosalt(tx, rez.urunId, rez);
      } else {
        await yedekSlotBosalt(tx, rez.urunId, rez);
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

      return { tur: "iptal-edildi", yukselenKodu, tip: rez.tip, urunId: rez.urunId };
    },
    { maxWait: 5000, timeout: 15000 },
  );
}

// ---------------------------------------------------------------------------
// Satici tarafi: Satildi / Gelmedi
// ---------------------------------------------------------------------------

export type SonuclandirSonucu =
  // urunId: favori/bildirim tetiklemesi icin (cagiran API route hangi urunun
  // takipcilerine bildirim gonderecegini bilir - her zaman aktif-tier).
  | { tur: "sonuclandi"; sonuc: "satildi" | "gelmedi"; yukselenKodu: string | null; urunTukendi: boolean; urunId: string }
  | { tur: "yetkisiz" }
  | { tur: "bulunamadi" }
  | { tur: "islenemez"; sebep: string };

// Satici, KENDI magazasinin bir urununun AKTIF hak sahibini sonuclandirir.
// Ayni kilit stratejisi (urun satirinda FOR UPDATE) - vazgec/yeni-rezervasyon
// ile ayni anda calissa bile kuyruk tutarli kalir.
//
//  - "gelmedi": alici gelmedi, hak duser. Birim HALA SATILIK -> yedek#1 aktife
//    yukselir (aktifSlotBosalt), urun doldu idiyse sergide'ye doner. Guvenilirlik
//    icin DurumGecmisi'ne aliciId ile 'rezervasyon_gelmedi' yazilir (PLAN SS3).
//  - "satildi": alici urunu aldi, BIRIM TUKETILIR -> yedek YUKSELMEZ, ustteki
//    aktifler kayar. Toplam satildi stokAdedi'ye ulasinca urun 'satildi' olur ve
//    kalan tum bekleyenler iptal edilir (satilacak birim kalmadi).
export async function rezervasyonSonuclandir(params: {
  rezervId: string;
  sonuc: "satildi" | "gelmedi";
  saticiUserId: string;
}): Promise<SonuclandirSonucu> {
  const rezOn = await prisma.rezervasyon.findUnique({
    where: { id: params.rezervId },
    include: { urun: { select: { id: true, magaza: { select: { sahipId: true } } } } },
  });
  if (!rezOn) return { tur: "bulunamadi" };
  // Yetki: rezervId istemciden gelir ama sadece kendi magazasinin urununu
  // sonuclandirabilir - baska saticinin rezervId'sini ele gecirse bile reddedilir.
  if (rezOn.urun.magaza.sahipId !== params.saticiUserId) return { tur: "yetkisiz" };

  return prisma.$transaction(
    async (tx): Promise<SonuclandirSonucu> => {
      const kilitli = await tx.$queryRaw<
        { id: string; stokAdedi: number; durum: string }[]
      >`SELECT "id", "stokAdedi", "durum" FROM "Urun" WHERE "id" = ${rezOn.urunId} FOR UPDATE`;
      const urun = kilitli[0];

      const rez = await tx.rezervasyon.findUnique({ where: { id: params.rezervId } });
      if (!rez || rez.durum !== "bekliyor") {
        return { tur: "islenemez", sebep: `durum:${rez?.durum ?? "yok"}` };
      }
      // Sadece aktif hak sahibi satildi/gelmedi olabilir; yedek sirada bekliyor.
      if (rez.tip !== "aktif") {
        return { tur: "islenemez", sebep: "sadece aktif hak sahibi isaretlenebilir" };
      }

      await tx.rezervasyon.update({ where: { id: rez.id }, data: { durum: params.sonuc } });
      await tx.durumGecmisi.create({
        data: {
          kullaniciId: rez.aliciId,
          varlikTuru: "Rezervasyon",
          varlikId: rez.id,
          olay: `rezervasyon_${params.sonuc}:aktif:${rez.siraNo}`,
        },
      });

      let yukselenKodu: string | null = null;
      let urunTukendi = false;

      if (params.sonuc === "gelmedi") {
        // Birim hala satilik: yedek yukselir, doldu -> sergide.
        yukselenKodu = await aktifSlotBosalt(tx, rez.urunId, rez);
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
      } else {
        // satildi: birim tuketildi, yedek YUKSELMEZ; sadece ustteki aktifleri kaydir.
        await tx.rezervasyon.updateMany({
          where: { urunId: rez.urunId, durum: "bekliyor", tip: "aktif", siraNo: { gt: rez.siraNo } },
          data: { siraNo: { decrement: 1 } },
        });
        const satildiSayisi = await tx.rezervasyon.count({
          where: { urunId: rez.urunId, durum: "satildi" },
        });
        if (satildiSayisi >= (urun?.stokAdedi ?? 0)) {
          urunTukendi = true;
          const kalanlar = await tx.rezervasyon.findMany({
            where: { urunId: rez.urunId, durum: "bekliyor" },
            select: { id: true, aliciId: true },
          });
          if (kalanlar.length) {
            await tx.rezervasyon.updateMany({
              where: { urunId: rez.urunId, durum: "bekliyor" },
              data: { durum: "iptal" },
            });
            for (const k of kalanlar) {
              await tx.durumGecmisi.create({
                data: {
                  kullaniciId: k.aliciId,
                  varlikTuru: "Rezervasyon",
                  varlikId: k.id,
                  olay: "rezervasyon_urun_tukendi",
                },
              });
            }
          }
          await tx.urun.update({ where: { id: rez.urunId }, data: { durum: "satildi" } });
          await tx.durumGecmisi.create({
            data: {
              kullaniciId: rez.aliciId,
              varlikTuru: "Urun",
              varlikId: rez.urunId,
              olay: "urun_satildi",
            },
          });
        }
      }

      return { tur: "sonuclandi", sonuc: params.sonuc, yukselenKodu, urunTukendi, urunId: rez.urunId };
    },
    { maxWait: 5000, timeout: 15000 },
  );
}

// ---------------------------------------------------------------------------
// Geri Al (satici yanlis isaretlemeyi geri alir)
// ---------------------------------------------------------------------------

export type GeriAlSebep = "kapasite_dolu" | "urun_satildi";

export type GeriAlSonucu =
  // urunId: favori/bildirim tetiklemesi icin (bkz. VazgecSonucu/SonuclandirSonucu).
  | { tur: "geri-alindi"; siraNo: number; dusenYedekKodu: string | null; urunId: string }
  | { tur: "yetkisiz" }
  | { tur: "bulunamadi" }
  | { tur: "reddedildi"; sebep: GeriAlSebep }
  | { tur: "islenemez"; sebep: string };

// Bir 'satildi'/'gelmedi' kaydini tekrar 'bekliyor' yapip kisiyi ESKI sira
// numarasina geri koyar. Ayni kilit (urun satirinda FOR UPDATE).
//
// Onemli sadelestirme: satildi/gelmedi SADECE aktif hak sahibine uygulanir
// (rezervasyonSonuclandir guard'i), ve sonuclandirma kaydin tip/siraNo'suna
// dokunmaz - yalnizca durum'u degistirir. Yani geri alinan kaydin eski tip'i
// her zaman "aktif", eski siraNo'su da kaydin kendi alaninda; DurumGecmisi
// okumaya gerek yok.
//
// Iki red durumu (kullanici karari):
//  - urun_satildi: urun tukendiyse (durum='satildi') hicbir geri alma yapilmaz.
//  - kapasite_dolu: geri alma bekleyeni +1 yapar; yeni kapasiteyi asarsa reddedilir.
// Her red DurumGecmisi'ne "geri_alma_reddedildi:{rezervId}:{sebep}" olarak
// yazilir (admin sonra ne oldugunu gorebilsin - admin paneli henuz yok).
export async function rezervasyonGeriAl(params: {
  rezervId: string;
  saticiUserId: string;
}): Promise<GeriAlSonucu> {
  const rezOn = await prisma.rezervasyon.findUnique({
    where: { id: params.rezervId },
    include: { urun: { select: { id: true, magaza: { select: { sahipId: true } } } } },
  });
  if (!rezOn) return { tur: "bulunamadi" };
  if (rezOn.urun.magaza.sahipId !== params.saticiUserId) return { tur: "yetkisiz" };

  // Platform ayarlari (max yedek) - rezervasyonOlustur ile AYNI konum/gerekce,
  // kilit ONCESI okunur.
  const ayarlar = await platformAyarlariGetir();

  return prisma.$transaction(
    async (tx): Promise<GeriAlSonucu> => {
      const kilitli = await tx.$queryRaw<
        { id: string; stokAdedi: number; durum: string }[]
      >`SELECT "id", "stokAdedi", "durum" FROM "Urun" WHERE "id" = ${rezOn.urunId} FOR UPDATE`;
      const urun = kilitli[0];

      const rez = await tx.rezervasyon.findUnique({ where: { id: params.rezervId } });
      // Sadece satildi/gelmedi geri alinabilir (iptal alicinin vazgecmesidir,
      // bekliyor zaten aktif).
      if (!rez || (rez.durum !== "satildi" && rez.durum !== "gelmedi")) {
        return { tur: "islenemez", sebep: `durum:${rez?.durum ?? "yok"}` };
      }

      const redKaydi = async (sebep: GeriAlSebep) => {
        await tx.durumGecmisi.create({
          data: {
            kullaniciId: rez.aliciId,
            varlikTuru: "Rezervasyon",
            varlikId: rez.id,
            olay: `geri_alma_reddedildi:${rez.id}:${sebep}`,
          },
        });
      };

      // Red (urun_satildi): urun tukendiyse geri alma yok.
      if (!urun || urun.durum === "satildi") {
        await redKaydi("urun_satildi");
        return { tur: "reddedildi", sebep: "urun_satildi" };
      }

      const geriAlinanSatildi = rez.durum === "satildi";
      const satildiSayisi = await tx.rezervasyon.count({
        where: { urunId: urun.id, durum: "satildi" },
      });
      // satildi geri alinirsa o birim tekrar satilik olur -> kalanBirim +1.
      const yeniKalanBirim = urun.stokAdedi - (satildiSayisi - (geriAlinanSatildi ? 1 : 0));
      const mevcutBekleyen = await tx.rezervasyon.count({
        where: { urunId: urun.id, durum: "bekliyor" },
      });

      // Red (kapasite_dolu): geri alma bekleyeni +1 yapar; yeni kapasiteyi asamaz.
      if (mevcutBekleyen + 1 > yeniKalanBirim + ayarlar.maxYedek) {
        await redKaydi("kapasite_dolu");
        return { tur: "reddedildi", sebep: "kapasite_dolu" };
      }

      const eskiSira = rez.siraNo;
      // 1) Aktif kuyrugunda eskiSira ve sonrasi icin yer ac.
      await tx.rezervasyon.updateMany({
        where: { urunId: urun.id, durum: "bekliyor", tip: "aktif", siraNo: { gte: eskiSira } },
        data: { siraNo: { increment: 1 } },
      });
      // 2) Kaydi eski aktif pozisyonuna geri koy. Geri alma da bir "aktife
      //    gecis"tir -> aktifOlmaZamani guncellenir.
      await tx.rezervasyon.update({
        where: { id: rez.id },
        data: { durum: "bekliyor", tip: "aktif", siraNo: eskiSira, aktifOlmaZamani: new Date() },
      });
      await tx.durumGecmisi.create({
        data: {
          kullaniciId: rez.aliciId,
          varlikTuru: "Rezervasyon",
          varlikId: rez.id,
          olay: `rezervasyon_geri_alindi:${rez.durum}:${eskiSira}`,
        },
      });

      // 3) Aktif tasmasi: yeniKalanBirim'i asan aktif(ler) yedek kuyrugunun
      //    basina iner (gelmedi geri almada en fazla 1; satildi geri almada
      //    kalanBirim de +1 arttigi icin tasma olmaz). Dusen, eski onceligini
      //    korur -> yedek#1.
      let dusenYedekKodu: string | null = null;
      const tasanlar = await tx.rezervasyon.findMany({
        where: { urunId: urun.id, durum: "bekliyor", tip: "aktif", siraNo: { gt: yeniKalanBirim } },
        orderBy: { siraNo: "asc" },
      });
      for (const t of tasanlar) {
        await tx.rezervasyon.updateMany({
          where: { urunId: urun.id, durum: "bekliyor", tip: "yedek" },
          data: { siraNo: { increment: 1 } },
        });
        await tx.rezervasyon.update({ where: { id: t.id }, data: { tip: "yedek", siraNo: 1 } });
        await tx.durumGecmisi.create({
          data: {
            kullaniciId: t.aliciId,
            varlikTuru: "Rezervasyon",
            varlikId: t.id,
            olay: "rezervasyon_aktiften_yedege:1",
          },
        });
        dusenYedekKodu = t.rezervKodu;
      }

      // 4) Urun durumu: geri alma sonrasi kapasiteye gore doldu/sergide.
      const yeniBekleyen = mevcutBekleyen + 1;
      const kapasite = yeniKalanBirim + ayarlar.maxYedek;
      if (yeniBekleyen >= kapasite && urun.durum !== "doldu") {
        await tx.urun.update({ where: { id: urun.id }, data: { durum: "doldu" } });
        await tx.durumGecmisi.create({
          data: { kullaniciId: rez.aliciId, varlikTuru: "Urun", varlikId: urun.id, olay: "urun_doldu" },
        });
      } else if (yeniBekleyen < kapasite && urun.durum === "doldu") {
        await tx.urun.update({ where: { id: urun.id }, data: { durum: "sergide" } });
        await tx.durumGecmisi.create({
          data: {
            kullaniciId: rez.aliciId,
            varlikTuru: "Urun",
            varlikId: urun.id,
            olay: "urun_tekrar_sergide",
          },
        });
      }

      return { tur: "geri-alindi", siraNo: eskiSira, dusenYedekKodu, urunId: rez.urunId };
    },
    { maxWait: 5000, timeout: 15000 },
  );
}

// ---------------------------------------------------------------------------
// Haftalik sifirlama (otomatik, harici cron tetikler)
// ---------------------------------------------------------------------------

function isoHafta(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Tek bir urunun kuyrugunu (kilit altinda) sifirlar. Islem-sonu ani gecmis
// bekleyen kayitlar temizlenir:
//  - Sonradan yukselen aktifler + tum yedekler -> iptal (cezasiz).
//  - Pazar BASLANGICINDA aktif olan (aktifOlmaZamani < baslangicAni) ve hala
//    bekleyen -> ARTIK OTOMATIK ISLENMEZ (2026-07-09 karari asagida).
//  - Temizlenen herkese bildirim izi (bildirimKanali; gonderim YOK, Faz 2).
//  - satildi/gelmedi/iptal olanlara DOKUNULMAZ (sorgu sadece durum=bekliyor).
//
// 2026-07-09 karari (onemli davranis degisikligi): "pazar baslangicinda aktif
// + hala isaretlenmemis" kategori ESKIDEN burada otomatik "gelmedi" oluyordu
// (alici cezalandiriliyordu). Kullanici gerekcesi: sistem "satici mi unuttu
// yoksa alici mi hic gelmedi" ayrimini YAPAMAZ - iki durum da disaridan ayni
// gorunur (kayit bekliyor kalir). Alici bu belirsizlikten ASLA ceza almamali.
// Yeni model: bu kayitlar BURADA HIC DOKUNULMADAN "bekliyor" kalir - satici
// panele girip bizzat "Sattim/Gelmedi" diyene kadar (bkz. panel/layout.tsx
// zorunlu ekran + saticininBekleyenIslemleriGetir). Boylece ne alici cezalanir
// ne de sistem yanlis bir tahminde bulunur - gercegi bilen tek taraf (satici)
// konusturulur. Ilgili urun de ayrica vitrin sorgularinda "beklemede" gosterilir
// (Urun.durum'a DOKUNULMADAN, ayri bir gorunurluk katmaninda).
type SifirlaSonucu = { etkilenen: number };

async function urunSifirla(urunId: string, now: Date): Promise<SifirlaSonucu> {
  return prisma.$transaction(
    async (tx): Promise<SifirlaSonucu> => {
      const bos = { etkilenen: 0 };
      const kilitli = await tx.$queryRaw<
        { id: string; durum: string }[]
      >`SELECT "id", "durum" FROM "Urun" WHERE "id" = ${urunId} FOR UPDATE`;
      const urun = kilitli[0];
      if (!urun) return bos;

      const urunTam = await tx.urun.findUnique({
        where: { id: urunId },
        select: { magaza: { select: { pazar: true } } },
      });
      const pazar = urunTam?.magaza.pazar;
      if (!pazar) return bos;

      const kuyruk = await tx.rezervasyon.findMany({
        where: { urunId, durum: "bekliyor" },
        select: { id: true, tip: true, aliciId: true, pazarHaftasi: true, aktifOlmaZamani: true },
      });

      let etkilenen = 0;
      const haftaSayilari = new Map<string, number>();
      for (const rez of kuyruk) {
        // Islem-sonu ani (varsayilan gun sonu/gece yarisi, admin manuel
        // ayarlarsa Pazar.islemSonGunu/Saati - bkz. pazarIslemSonAni) henuz
        // gelmedi ise atla - satici kapanistan itibaren bu ana kadar
        // isaretleme suresine sahip. Kapanis ANI (pazarKapanisAni) artik
        // BURADA tetikleyici DEGIL, sadece no-show esigi (baslangic) hesabinda
        // dolayli kullaniliyor.
        if (now < pazarIslemSonAni(pazar, rez.pazarHaftasi)) continue;

        const baslangic = pazarBaslangicAni(pazar, rez.pazarHaftasi);
        const saticiSorumluOlmasiGereken =
          rez.tip === "aktif" && rez.aktifOlmaZamani != null && rez.aktifOlmaZamani < baslangic;
        // Yukaridaki 2026-07-09 karari: bu kategoriye HIC DOKUNMA, satici
        // bizzat isaretlesin.
        if (saticiSorumluOlmasiGereken) continue;

        const hafta = isoHafta(rez.pazarHaftasi);
        await tx.rezervasyon.update({
          where: { id: rez.id },
          data: { durum: "iptal", bildirimKanali: "whatsapp" },
        });
        await tx.durumGecmisi.create({
          data: {
            kullaniciId: rez.aliciId,
            varlikTuru: "Rezervasyon",
            varlikId: rez.id,
            olay: `rezervasyon_sifirlama_iptal:${hafta}`,
          },
        });
        etkilenen++;
        haftaSayilari.set(hafta, (haftaSayilari.get(hafta) ?? 0) + 1);
      }

      if (etkilenen === 0) return bos;

      // Kuyruk temizlendi -> urun tekrar satisa acik (satildi/tukenmis degilse).
      if (urun.durum !== "satildi" && urun.durum !== "sergide") {
        await tx.urun.update({ where: { id: urunId }, data: { durum: "sergide" } });
        await tx.durumGecmisi.create({
          data: { varlikTuru: "Urun", varlikId: urunId, olay: "urun_tekrar_sergide" },
        });
      }

      // PazarSifirlama upsert (atomik ON CONFLICT) - idempotency + audit.
      for (const [hafta, sayi] of haftaSayilari) {
        await tx.$executeRaw`
          INSERT INTO "PazarSifirlama" ("id", "pazarId", "pazarHaftasi", "calismaZamani", "etkilenenSayi")
          VALUES (${randomUUID()}, ${pazar.id}, ${new Date(hafta)}::date, ${now}, ${sayi})
          ON CONFLICT ("pazarId", "pazarHaftasi")
          DO UPDATE SET "etkilenenSayi" = "PazarSifirlama"."etkilenenSayi" + ${sayi}`;
      }

      return { etkilenen };
    },
    { maxWait: 5000, timeout: 15000 },
  );
}

// Cron tarafindan cagrilir. ZAMANA degil DURUMA bakar: islem-sonu ani gecmis
// VE hala bekleyen kuyrugu olan urunleri sifirlar (catch-up: restart'ta
// kaçmaz). Idempotent: ikinci cagride bekleyen kalmadigi icin no-op. Her urun
// ayri transaction + FOR UPDATE (kisa kilit, kismi basari toleransi).
export async function pazarlariSifirla(
  now: Date = new Date(),
): Promise<{ islenenUrun: number; toplamEtkilenen: number }> {
  const bekleyenler = await prisma.rezervasyon.findMany({
    where: { durum: "bekliyor" },
    select: {
      urunId: true,
      pazarHaftasi: true,
      urun: { select: { magaza: { select: { pazar: true } } } },
    },
  });

  const sifirlanacak = new Set<string>();
  for (const r of bekleyenler) {
    if (now >= pazarIslemSonAni(r.urun.magaza.pazar, r.pazarHaftasi)) {
      sifirlanacak.add(r.urunId);
    }
  }

  let islenenUrun = 0;
  let toplamEtkilenen = 0;
  for (const urunId of sifirlanacak) {
    const { etkilenen } = await urunSifirla(urunId, now);
    if (etkilenen > 0) {
      islenenUrun++;
      toplamEtkilenen += etkilenen;
    }
  }
  return { islenenUrun, toplamEtkilenen };
}

// Kapanistan SONRA saticiya hatirlatma (kullanici karari 2026-07-09: kapanistan
// ONCE degil - satici pazar bitmeden "sonuc" karari veremez). urunSifirla'nin
// cezasindan TAMAMEN bagimsiz bir mekanizma - o an hicbir rezervasyon durumu
// DEGISTIRMEZ, sadece "isaretlemeyi unutma" uyarisi gonderir. Ayni cron
// (pazar-sifirlama route) tarafindan cagirilir - yeni bir VPS cron girdisi
// gerektirmez.
//
// Zamanlama: pazarHatirlatmaAni (varsayilan kapanis+1saat, admin manuel
// ayarlarsa Pazar.hatirlatmaGunu/hatirlatmaSaati) ile urunSifirla'nin
// tetikleyicisi pazarIslemSonAni (varsayilan gun sonu/gece yarisi, admin
// manuel ayarlarsa Pazar.islemSonGunu/islemSonSaati) ARTIK BIRBIRINDEN
// BAGIMSIZ, ikisi de admin tarafindan manuel yapilandirilabilir (2026-07-09,
// gece pazarlari - kapanis 01:00-02:00 gibi - icin sabit varsayimlar yanlis
// olurdu). Admin bu iki alani celiskili ayarlarsa (hatirlatma, islem-sonundan
// SONRAYA denk gelirse) API katmaninda (pazar-olustur/pazar-guncelle) engellenir.
export async function pazarHatirlatmalariGonder(
  now: Date = new Date(),
): Promise<{ hatirlatilanPazarSayisi: number; hatirlatilanSaticiSayisi: number }> {
  const pazarlar = await prisma.pazar.findMany({
    where: { aktifMi: true },
    select: {
      id: true,
      ad: true,
      baslangicGunu: true,
      baslangicSaati: true,
      sifirlamaGunu: true,
      sifirlamaSaati: true,
      saatDilimi: true,
      hatirlatmaGunu: true,
      hatirlatmaSaati: true,
      islemSonGunu: true,
      islemSonSaati: true,
    },
  });

  let hatirlatilanPazarSayisi = 0;
  let hatirlatilanSaticiSayisi = 0;
  for (const pazar of pazarlar) {
    // sonrakiSifirlamaTarihi(pazar, now) "bundan sonraki ILK kapanisi" verir -
    // ama bu fonksiyon TAM OLARAK kapanistan SONRA calisiyor, yani cagrildigi
    // anda o hafta ZATEN kapanmis olur ve sonrakiSifirlamaTarihi otomatik bir
    // SONRAKI haftaya yuvarlar (bkz. pazar-haftasi.ts: "kalanGun===0 && saat
    // gecti -> +7 gun"). Ilgilenmemiz gereken hafta "yeni kapanan" olan, yani
    // bu yuvarlanmis tarihten 7 gun GERI - donguler her zaman tam 7 gun ara
    // oldugu icin bu her durumda dogru sonucu verir (now kapanistan once de
    // olsa: sonrakiSifirlamaTarihi rollansiz THIS haftayi doner, -7gun ile PREV
    // haftayi buluruz - zaten kapanmis, tek dogru aday odur).
    const gelecekHaftasi = sonrakiSifirlamaTarihi(pazar, now);
    const pazarHaftasi = new Date(gelecekHaftasi.getTime() - 7 * 24 * 60 * 60 * 1000);
    const esikAni = pazarHatirlatmaAni(pazar, pazarHaftasi);
    // Esik ani gelmediyse atla. Ust sinir YOK (durum-bazli catch-up deseni,
    // urunSifirla'daki "zamana degil duruma bakar" ilkesiyle tutarli) -
    // idempotency asagidaki INSERT ile saglaniyor, tekrar tekrar gonderilmez.
    if (now < esikAni) continue;

    // Idempotency: (pazarId, pazarHaftasi) icin daha once eklendiyse (baska bir
    // cron tetiklemesinde) DO NOTHING - 0 satir eklenir, tekrar gonderilmez.
    const eklenenSatir = await prisma.$executeRaw`
      INSERT INTO "PazarHatirlatma" ("id", "pazarId", "pazarHaftasi", "gonderilmeZamani")
      VALUES (${randomUUID()}, ${pazar.id}, ${pazarHaftasi}::date, ${now})
      ON CONFLICT ("pazarId", "pazarHaftasi") DO NOTHING`;
    if (eklenenSatir === 0) continue;

    // Bu pazarda, bu hafta icin hala isaretlenmemis (bekliyor+aktif) rezervasyonu
    // olan saticilari bul - yedekler haric (satici icin "isaretlenecek" tek sey
    // aktif hak sahipleri, yedek zaten Sattı/Gelmedi ile islenemez).
    const bekleyenler = await prisma.rezervasyon.findMany({
      where: {
        durum: "bekliyor",
        tip: "aktif",
        pazarHaftasi,
        urun: { magaza: { pazarId: pazar.id } },
      },
      select: { urun: { select: { magaza: { select: { sahipId: true } } } } },
    });
    const saticiIdler = [...new Set(bekleyenler.map((b) => b.urun.magaza.sahipId))];
    if (saticiIdler.length === 0) continue;

    // 2026-07-09 karari sonrasi: artik "otomatik gelmedi" YOK - mesaj bunun
    // yerine gercek sonucu (pasif urun + panel kilidi) anlatir (kullanici
    // onayladigi metin, hafifce duzenlendi).
    await prisma.bildirim.createMany({
      data: saticiIdler.map((kullaniciId) => ({
        kullaniciId,
        mesaj: `${pazar.ad} pazarı kapandı. Tezgah satışlarınızla ilgili "Sattım/Gelmedi" işlemini yapmazsanız, işlem yapana kadar ürünleriniz pasif görünecek ve panele giriş yapamayacaksınız.`,
        hedefYolu: "/panel/rezervasyonlar",
      })),
    });
    hatirlatilanPazarSayisi++;
    hatirlatilanSaticiSayisi += saticiIdler.length;
  }
  return { hatirlatilanPazarSayisi, hatirlatilanSaticiSayisi };
}

// ---------------------------------------------------------------------------
// Satici ihmali -> ASLA alici cezasi (2026-07-09 karari)
// ---------------------------------------------------------------------------
//
// urunSifirla artik "pazar baslangicinda aktif + isaretlenmemis" kategoriye
// HIC DOKUNMUYOR (yukaridaki yorum). Bu kayitlar "bekliyor" kalir - satici
// panele girip bizzat "Sattim/Gelmedi" diyene kadar. Bu bolumdeki fonksiyonlar
// UC farkli tuketici icin AYNI temel sorguyu paylasir (tutarsizlik riski
// olmasin diye tek dogru kaynak):
//   1. panel/layout.tsx zorunlu ekrani (satici bazinda, TAM detay)
//   2. SiteHeader uyari banner'i (satici bazinda, sadece "var mi" bilgisi)
//   3. Vitrin "beklemede" gorunumu (urun bazinda, magaza/global)

export type BekleyenIslem = {
  rezervId: string;
  urunId: string;
  urunBaslik: string;
  siraNo: number;
  rezervKodu: string;
  aliciAd: string;
  aliciTelefon: string | null;
  pazarHaftasi: Date;
};

// Bir saticinin TUM magazalarindaki, islem-sonu ani gecmis ama hala
// isaretlenmemis rezervasyonlari - panel/layout.tsx zorunlu ekrani ve
// SiteHeader banner'i bunu kullanir.
export async function saticininBekleyenIslemleriGetir(
  saticiId: string,
  now: Date = new Date(),
): Promise<BekleyenIslem[]> {
  const adaylar = await prisma.rezervasyon.findMany({
    where: { durum: "bekliyor", tip: "aktif", urun: { magaza: { sahipId: saticiId } } },
    select: {
      id: true,
      urunId: true,
      siraNo: true,
      rezervKodu: true,
      pazarHaftasi: true,
      aktifOlmaZamani: true,
      alici: { select: { ad: true, telefon: true } },
      urun: { select: { baslik: true, magaza: { select: { pazar: true } } } },
    },
    orderBy: { pazarHaftasi: "asc" },
  });

  const sonuc: BekleyenIslem[] = [];
  for (const r of adaylar) {
    const pazar = r.urun.magaza.pazar;
    if (now < pazarIslemSonAni(pazar, r.pazarHaftasi)) continue;
    const baslangic = pazarBaslangicAni(pazar, r.pazarHaftasi);
    if (r.aktifOlmaZamani == null || r.aktifOlmaZamani >= baslangic) continue;
    sonuc.push({
      rezervId: r.id,
      urunId: r.urunId,
      urunBaslik: r.urun.baslik,
      siraNo: r.siraNo,
      rezervKodu: r.rezervKodu,
      aliciAd: r.alici.ad,
      aliciTelefon: r.alici.telefon,
      pazarHaftasi: r.pazarHaftasi,
    });
  }
  return sonuc;
}

// Vitrin gorunumu icin: "beklemede" gosterilmesi gereken urunId'lerin kumesi.
// magazaId verilirse tek magaza sayfasina (ör. magaza/[slug]) gore daraltilir,
// verilmezse TUM platform taranir (ör. anasayfa vitrini, coklu-magaza).
// saticininBekleyenIslemleriGetir ile AYNI filtre mantigi (kasitli - tek
// dogru kaynak, iki fonksiyon arasinda sapma riski olmasin).
export async function pasifUrunIdSeti(
  magazaId?: string,
  now: Date = new Date(),
): Promise<Set<string>> {
  const adaylar = await prisma.rezervasyon.findMany({
    where: {
      durum: "bekliyor",
      tip: "aktif",
      ...(magazaId ? { urun: { magazaId } } : {}),
    },
    select: {
      urunId: true,
      pazarHaftasi: true,
      aktifOlmaZamani: true,
      urun: { select: { magaza: { select: { pazar: true } } } },
    },
  });

  const urunIdler = new Set<string>();
  for (const r of adaylar) {
    if (urunIdler.has(r.urunId)) continue; // ayni urun icin birden fazla adayda tekrar hesaplamaya gerek yok
    const pazar = r.urun.magaza.pazar;
    if (now < pazarIslemSonAni(pazar, r.pazarHaftasi)) continue;
    const baslangic = pazarBaslangicAni(pazar, r.pazarHaftasi);
    if (r.aktifOlmaZamani != null && r.aktifOlmaZamani < baslangic) {
      urunIdler.add(r.urunId);
    }
  }
  return urunIdler;
}

// Cron tarafindan (pazar-sifirlama route icinde) cagrilir: islem-sonundan 3+
// gun gecmis hala isaretlenmemis rezervasyonlar icin admin'e TEK SEFERLIK
// uyari gonderir (satici muhtemelen platformu terk etmis/uzun sure girmemis -
// alici sonsuza kadar askida kalmasin diye admin'e haber verilir, kullanici
// karari 2026-07-09). Idempotency: Rezervasyon.saticiIhmalUyarisiGonderildi
// bayragi (once-atomik UPDATE...WHERE ile).
const IHMAL_UYARISI_GUN = 3;

export async function saticiIhmalUyarilariGonder(
  now: Date = new Date(),
): Promise<{ uyarilanRezervasyonSayisi: number }> {
  const adaylar = await prisma.rezervasyon.findMany({
    where: { durum: "bekliyor", tip: "aktif", saticiIhmalUyarisiGonderildi: false },
    select: {
      id: true,
      urunId: true,
      rezervKodu: true,
      pazarHaftasi: true,
      aktifOlmaZamani: true,
      urun: {
        select: {
          baslik: true,
          magaza: { select: { ad: true, sahipId: true, pazar: true } },
        },
      },
    },
  });

  let uyarilanRezervasyonSayisi = 0;
  for (const r of adaylar) {
    const pazar = r.urun.magaza.pazar;
    const islemSonAni = pazarIslemSonAni(pazar, r.pazarHaftasi);
    const esikAni = new Date(islemSonAni.getTime() + IHMAL_UYARISI_GUN * 24 * 60 * 60 * 1000);
    if (now < esikAni) continue;
    const baslangic = pazarBaslangicAni(pazar, r.pazarHaftasi);
    if (r.aktifOlmaZamani == null || r.aktifOlmaZamani >= baslangic) continue;

    // Atomik "sadece hala false ise" guncelleme - ayni anda iki cron
    // tetiklemesi olsa bile cift bildirim gitmez (satir zaten idempotent
    // WHERE kosuluyla korunuyor, ek bir kilit gerekmiyor - tek satirlik UPDATE).
    const guncellenen = await prisma.rezervasyon.updateMany({
      where: { id: r.id, saticiIhmalUyarisiGonderildi: false },
      data: { saticiIhmalUyarisiGonderildi: true },
    });
    if (guncellenen.count === 0) continue; // baska bir cron tetiklemesi zaten isledi

    const adminler = await prisma.kullanici.findMany({ where: { rol: "admin" }, select: { id: true } });
    await prisma.bildirim.createMany({
      data: adminler.map((a) => ({
        kullaniciId: a.id,
        mesaj: `"${r.urun.magaza.ad}" tezgahı, "${r.urun.baslik}" ürünündeki bir rezervasyonu (${r.rezervKodu}) ${IHMAL_UYARISI_GUN} günden uzun süredir işaretlemedi - satıcı platforma girmemiş olabilir.`,
        hedefYolu: "/admin/magazalar",
      })),
    });
    uyarilanRezervasyonSayisi++;
  }
  return { uyarilanRezervasyonSayisi };
}
