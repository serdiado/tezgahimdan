import { prisma } from "@/lib/prisma";
import { bildirimGonderAdminlere } from "@/lib/bildirim";

// Hesap silme SELF-SERVIS DEGIL (2026-07-13 karari): kullanici "Hesabımı Sil"
// butonuna basinca hesap SILINMEZ - admin'e bir TALEP dusurulur (denetim kaydi +
// bildirim), admin /admin/kullanicilar/[id]'deki mevcut "Hesabı Sil" butonuyle
// (bkz. api/admin/kullanici-sil) isleme alir. Ayni DurumGecmisi kaydini iki amac
// icin kullaniyoruz: (1) "beklemede mi" sorgusu, (2) audit izi - yeni tablo yok.
const TALEP_OLAYI = "hesap_silme_talep_edildi";
const SILINDI_OLAYI = "kullanici_hesabi_silindi"; // api/admin/kullanici-sil ile ayni sabit

export async function hesapSilmeTalebiBekliyorMu(kullaniciId: string): Promise<boolean> {
  const sonKayit = await prisma.durumGecmisi.findFirst({
    where: {
      varlikTuru: "Kullanici",
      varlikId: kullaniciId,
      olay: { in: [TALEP_OLAYI, SILINDI_OLAYI] },
    },
    orderBy: { createdAt: "desc" },
    select: { olay: true },
  });
  return sonKayit?.olay === TALEP_OLAYI;
}

export type HesapSilmeTalebiSonucu = "talep-edildi" | "zaten-talep-var";

// Iki tikla iki bildirim gibi kucuk yaris pencereleri kabul edilebilir (en
// kotu ihtimalle admin ayni talebi iki kez gorur) - kilit gerektirmeyecek
// kadar dusuk riskli, projenin diger dusuk-riskli yaris kararlariyla tutarli.
export async function hesapSilmeTalebiOlustur(kullaniciId: string): Promise<HesapSilmeTalebiSonucu> {
  if (await hesapSilmeTalebiBekliyorMu(kullaniciId)) return "zaten-talep-var";

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: { ad: true },
  });
  if (!kullanici) return "zaten-talep-var";

  await prisma.durumGecmisi.create({
    data: { kullaniciId, varlikTuru: "Kullanici", varlikId: kullaniciId, olay: TALEP_OLAYI },
  });

  await bildirimGonderAdminlere({
    mesaj: `${kullanici.ad} hesabını silmek istiyor.`,
    hedefYolu: `/admin/kullanicilar/${kullaniciId}`,
  });

  return "talep-edildi";
}
