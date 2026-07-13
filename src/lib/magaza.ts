import { cache } from "react";
import { p2002Hedefi, p2002Mi, prisma } from "@/lib/prisma";
import { SLUG_REGEX } from "@/lib/slug";
import { kullaniciYasakliMi } from "@/lib/yetki";

// cache(): ayni istekte (ör. panel/layout.tsx + panel sayfasi) birden fazla
// cagrilirsa tek Prisma sorgusuna duser (React'in istek-basi memoization'i).
// pazar dahil - cagiran taraf magaza.pazar.aktifMi'yi kontrol edebilsin diye
// (bkz. src/app/panel/layout.tsx "pazar pasif" kapisi).
export const getOwnMagaza = cache((userId: string) => {
  return prisma.magaza.findFirst({
    where: { sahipId: userId, silindiMi: false },
    include: { pazar: true },
  });
});

// Vitrin (herkese acik) magaza sayfasi icin - slug tekil oldugu icin en fazla 1
// sonuc bekleriz, ama findUnique tek basina ek (silindiMi) filtresi almadigindan
// findFirst kullaniyoruz. Hero bandinda pazar bilgisini gosterebilmek icin
// pazar iliskisini de dahil ediyoruz. gizliMi: admin moderasyonuyla vitrinsen
// gizlenen magaza herkese acik sayfada gorunmez (sahibi panelden erisebilir).
export function getMagazaBySlug(slug: string) {
  return prisma.magaza.findFirst({
    where: { slug, silindiMi: false, gizliMi: false, pazar: { aktifMi: true } },
    include: { pazar: true },
  });
}

export type MagazaAcSonucu =
  | { tur: "acildi"; magaza: { id: string; slug: string } }
  | { tur: "gecersiz-ad" }
  | { tur: "gecersiz-slug" }
  | { tur: "gecersiz-pazar" }
  | { tur: "slug-alinmis" }
  | { tur: "zaten-magaza-var" }
  | { tur: "yasakli" };

// Self-servis onboarding'in kalbi: magazayi olusturur VE (kullanici hala alici ise)
// ayni transaction'da rolu satici'ya terfi eder + DurumGecmisi'ne iz birakir. Admin
// onayi YOK - herkes aninda satici olur (moderasyon sonradan magaza.gizliMi ile).
//
// Tek noktada tutulmasinin nedeni: hem yeni onboarding sihirbazi hem de urun-ekle
// icindeki "once magaza olustur" dali ayni yolu kullansin, terfi/iz mantigi kopya
// olmasin. P2002 (slug carpismasi ya da WHERE silindiMi=false partial unique index
// ile ikinci aktif magaza) yakalanir; cagiran taraf sonuca gore UX'i secer.
export async function magazaAc(params: {
  userId: string;
  ad: string;
  slug: string;
  whatsappNo?: string | null;
  // Zorunlu: pazarlar artik sadece admin panelinden elle olusturuluyor (varsayilan/
  // otomatik pazar YOK), hem ana onboarding sihirbazi (magaza-ac) hem de urun-ekle
  // icindeki "magaza silinmisse yeniden olustur" dali gercek bir secim gonderir.
  pazarId: string;
}): Promise<MagazaAcSonucu> {
  if (await kullaniciYasakliMi(params.userId)) return { tur: "yasakli" };

  const ad = params.ad.trim();
  const slug = params.slug.trim().toLowerCase();
  if (!ad) return { tur: "gecersiz-ad" };
  if (!SLUG_REGEX.test(slug)) return { tur: "gecersiz-slug" };
  // params.pazarId tip olarak zorunlu ama JSON body'den gelen cagiran taraflar
  // (route.ts) "any" uzerinden okudugu icin runtime'da bos/undefined gelebilir.
  // Bos deger prisma where'inde SESSIZCE yok sayilir (undefined alan filtreden
  // cikar) - kontrol olmazsa mağaza rastgele bir aktif pazara baglanirdi.
  if (!params.pazarId) return { tur: "gecersiz-pazar" };

  const pazar = await prisma.pazar.findFirst({ where: { id: params.pazarId, aktifMi: true } });
  if (!pazar) return { tur: "gecersiz-pazar" };

  let sonuc: MagazaAcSonucu;
  try {
    sonuc = await prisma.$transaction(async (tx): Promise<MagazaAcSonucu> => {
      const magaza = await tx.magaza.create({
        data: {
          sahipId: params.userId,
          ad,
          slug,
          whatsappNo: params.whatsappNo ?? null,
          pazarId: pazar.id,
        },
      });

      // Kullanici hala alici ise satici'ya terfi et (admin ise dokunma). Terfi
      // sadece "kendi magazasini acan" kisi icin - baskasinin rolunu degistirmez.
      await tx.kullanici.updateMany({
        where: { id: params.userId, rol: "alici" },
        data: { rol: "satici" },
      });

      // Admin izi: yeni magaza acilislari DurumGecmisi'ne duser; admin paneli
      // gelince "yeni acilan magazalar" listelenip gerekirse gizliMi ile frenlenir.
      await tx.durumGecmisi.create({
        data: {
          kullaniciId: params.userId,
          varlikTuru: "Magaza",
          varlikId: magaza.id,
          olay: "magaza_olusturuldu",
        },
      });

      return { tur: "acildi", magaza: { id: magaza.id, slug: magaza.slug } };
    });
  } catch (err) {
    // Es zamanli istek ayni slug'i ya da (partial unique index sayesinde) ayni
    // saticiya ikinci aktif magazayi olusturmus olabilir (TOCTOU). DB engeller,
    // biz dostca cevaba ceviririz.
    if (p2002Mi(err)) {
      const hedef = p2002Hedefi(err);
      if (hedef.includes("slug")) return { tur: "slug-alinmis" };
      return { tur: "zaten-magaza-var" };
    }
    throw err;
  }

  // Profil telefonu senkronu (2026-07-13 kullanici istegi): tezgah acarken
  // girilen WhatsApp, kullanicinin PROFIL telefonu BOSSA oraya da yazilir
  // (satici ilk rezervasyonunda bir daha telefon girmek zorunda kalmasin).
  // BILINCLI sinirlar: (1) dolu profil telefonu ASLA ezilmez - o alan alici
  // KIMLIGI (unique), tezgah WhatsApp'i ise ayri bir hat olabilir; (2) numara
  // baska bir hesapta kayitliysa sessizce atlanir; (3) best-effort - hata
  // tezgah acilisini ASLA geri almaz/etkilemez (tx DISINDA kosulmasinin nedeni).
  if (sonuc.tur === "acildi" && params.whatsappNo) {
    await profilTelefonunuBossaDoldur(params.userId, params.whatsappNo);
  }
  return sonuc;
}

async function profilTelefonunuBossaDoldur(userId: string, telefon: string): Promise<void> {
  try {
    const baskasindaKayitli = await prisma.kullanici.findFirst({
      where: { telefon, NOT: { id: userId } },
      select: { id: true },
    });
    if (baskasindaKayitli) return;
    // where telefon:null -> dolu profili DB seviyesinde de asla ezmez. Pre-check
    // ile update arasindaki mikro yarista P2002 gelebilir - catch yutar (senkron
    // ikincil is, tezgah acilisi coktan basarili).
    await prisma.kullanici.updateMany({
      where: { id: userId, telefon: null },
      data: { telefon },
    });
  } catch (err) {
    console.error("profilTelefonunuBossaDoldur: senkron atlandı", err);
  }
}
