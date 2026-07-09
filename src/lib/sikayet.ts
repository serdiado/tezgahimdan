import { prisma } from "@/lib/prisma";

export type KullaniciSikayeti = {
  id: string;
  hedefTuruEtiketi: "Tezgah" | "Ürün";
  hedefAdi: string;
  hedefLink: string | null;
  sebep: string;
  durum: string;
  yanit: string | null;
  createdAt: Date;
};

// "Şikayetlerim" sayfasi icin - kullaniciTumMagazaDegerlendirmeleriGetir
// (src/lib/magaza-degerlendirme.ts) ile AYNI desen: kendi gecmisini gorme,
// silinmis hedef DAHIL edilir ("kaldırıldı" notuyla). api/sikayet/route.ts'teki
// hedefTuru/hedefId XOR mantigiyla tutarli.
export async function kullaniciSikayetleriGetir(kullaniciId: string): Promise<KullaniciSikayeti[]> {
  const satirlar = await prisma.sikayet.findMany({
    where: { sikayetciId: kullaniciId },
    select: {
      id: true,
      sebep: true,
      durum: true,
      yanit: true,
      createdAt: true,
      hedefUrun: { select: { baslik: true, silindiMi: true, magaza: { select: { slug: true } } } },
      hedefMagaza: { select: { ad: true, slug: true, silindiMi: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return satirlar.map((s) => {
    if (s.hedefMagaza) {
      return {
        id: s.id,
        hedefTuruEtiketi: "Tezgah" as const,
        hedefAdi: s.hedefMagaza.silindiMi ? `${s.hedefMagaza.ad} (kaldırıldı)` : s.hedefMagaza.ad,
        hedefLink: s.hedefMagaza.silindiMi ? null : `/magaza/${s.hedefMagaza.slug}`,
        sebep: s.sebep,
        durum: s.durum,
        yanit: s.yanit,
        createdAt: s.createdAt,
      };
    }
    const urun = s.hedefUrun;
    return {
      id: s.id,
      hedefTuruEtiketi: "Ürün" as const,
      hedefAdi: urun ? (urun.silindiMi ? `${urun.baslik} (kaldırıldı)` : urun.baslik) : "(bulunamadı)",
      hedefLink: urun && !urun.silindiMi ? `/magaza/${urun.magaza.slug}` : null,
      sebep: s.sebep,
      durum: s.durum,
      yanit: s.yanit,
      createdAt: s.createdAt,
    };
  });
}
