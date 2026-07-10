import { prisma } from "@/lib/prisma";
import { aliciGuvenilirlikHaritasi } from "@/lib/rezervasyon";

// rezervasyonlar/page.tsx VE panel/BekleyenIslemlerEkrani.tsx (zorunlu ekran)
// AYNI KuyrukKarti veri seklini uretir - tek yerde tutulur, iki sayfa arasinda
// sapma riski olmasin diye. urunIdFiltresi verilirse SADECE o urunler (zorunlu
// ekran icin), verilmezse magazanin tum urunleri (normal liste sayfasi icin).
export async function saticininKuyrukKartVerisi(magazaId: string, urunIdFiltresi?: string[]) {
  const urunler = await prisma.urun.findMany({
    where: {
      magazaId,
      silindiMi: false,
      ...(urunIdFiltresi ? { id: { in: urunIdFiltresi } } : {}),
    },
    include: {
      rezervasyonlar: {
        include: { alici: { select: { ad: true, telefon: true } } },
        orderBy: [{ tip: "asc" }, { siraNo: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Bu magazadaki tum rezervasyonlarin alicilarini tekillestirip TEK sorguda
  // guvenilirlik (satildi/gelmedi) sayilarini cekiyoruz - satir basina ayri
  // sorgu yerine (PLAN.md SS3: "saticiya alicinin orani gosterilir").
  const aliciIdSeti = new Set<string>();
  for (const urun of urunler) {
    for (const r of urun.rezervasyonlar) aliciIdSeti.add(r.aliciId);
  }
  const guvenilirlik = await aliciGuvenilirlikHaritasi([...aliciIdSeti]);
  function guvenilirlikOzeti(aliciId: string) {
    const veri = guvenilirlik.get(aliciId) ?? { satildi: 0, gelmedi: 0, yasakliMi: false };
    // kisitliMi (2026-07-10'dan beri): alicinin SU AN aktif bir gelmedi yasagi
    // var mi - motor kapisiyla birebir ayni anlam (eskiden "esik asildi"
    // demekti ve kapiyla tutarsiz kalabiliyordu).
    return { satildi: veri.satildi, gelmedi: veri.gelmedi, kisitliMi: veri.yasakliMi };
  }

  return urunler.map((urun) => {
    const bekleyenler = urun.rezervasyonlar.filter((r) => r.durum === "bekliyor");
    // Sonuclananlar en son sonuclanandan eskiye; siraNo artik anlamsiz
    // oldugu icin createdAt'e gore siralanir.
    const sonuclananlar = urun.rezervasyonlar
      .filter((r) => r.durum !== "bekliyor")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      id: urun.id,
      baslik: urun.baslik,
      durum: urun.durum,
      stokAdedi: urun.stokAdedi,
      satildiSayisi: urun.rezervasyonlar.filter((r) => r.durum === "satildi").length,
      kuyruk: bekleyenler.map((r) => ({
        id: r.id,
        tip: r.tip,
        siraNo: r.siraNo,
        rezervKodu: r.rezervKodu,
        aliciAd: r.alici.ad,
        aliciTelefon: r.alici.telefon,
        guvenilirlik: guvenilirlikOzeti(r.aliciId),
      })),
      sonuclananlar: sonuclananlar.map((r) => ({
        id: r.id,
        durum: r.durum,
        rezervKodu: r.rezervKodu,
        aliciAd: r.alici.ad,
        aliciTelefon: r.alici.telefon,
        guvenilirlik: guvenilirlikOzeti(r.aliciId),
      })),
    };
  });
}
