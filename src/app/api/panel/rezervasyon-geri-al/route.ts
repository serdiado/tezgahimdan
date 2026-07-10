import { NextResponse } from "next/server";
import { getSaticiSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { rezervasyonGeriAl } from "@/lib/rezervasyon";
import {
  bildirimGonderDusenKullaniciya,
  bildirimGonderKullaniciya,
  bildirimGonderTakipcilere,
} from "@/lib/bildirim";

const RED_MESAJI: Record<string, string> = {
  urun_satildi: "Ürün tükendiği için güvenle geri alınamaz. Kaydınız admin'e iletildi.",
  // kapasite_dolu yaris kaynakli gecici olabilir (bkz. docs/MIMARI.md) - tekrar
  // deneme ipucu veriyoruz.
  kapasite_dolu:
    "Kuyruk dolu olduğu için şu an geri alınamadı. Bir dakika sonra tekrar deneyebilirsiniz; sorun sürerse kaydınız admin'e iletildi.",
};

export async function POST(request: Request) {
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rezervId = typeof body?.rezervId === "string" ? body.rezervId : "";
  if (!rezervId) {
    return NextResponse.json({ hata: "rezervId zorunlu" }, { status: 400 });
  }

  const cikti = await rezervasyonGeriAl({ rezervId, saticiUserId: session.user.id });

  switch (cikti.tur) {
    case "geri-alindi": {
      // Her zaman aktif-tier (sadece satildi/gelmedi geri alinabilir) - kosulsuz bildirim.
      const urun = await prisma.urun.findUnique({ where: { id: cikti.urunId }, select: { baslik: true } });
      if (urun) {
        // Geri alma kapasiteyi tasirdiysa bir alici AKTIF hak sahipliginden
        // yedege dustu (dusenYedekKodu) - yukselmenin simetrigi olarak KISISEL
        // bildirilir (aksi halde satin alma hakkini sessizce kaybederdi) ve
        // takipci bildiriminden HARIC tutulur (cift bildirim onleme).
        const haricListesi = [session.user.id];
        if (cikti.dusenYedekKodu) {
          const dusenAliciId = await bildirimGonderDusenKullaniciya({
            dusenKodu: cikti.dusenYedekKodu,
            urunId: cikti.urunId,
            urunBaslik: urun.baslik,
          });
          if (dusenAliciId) haricListesi.push(dusenAliciId);
        }
        await bildirimGonderTakipcilere({
          urunId: cikti.urunId,
          mesaj: `Takip ettiğiniz "${urun.baslik}" için bir işlem geri alındı.`,
          haricKullaniciIdler: haricListesi,
        });
      }
      // Geri alinan "gelmedi", alicinin aktif gelmedi yasagini da kaldirdiysa
      // alici bunu bilmeli - yoksa "yasakliyim" sanip denemez bile.
      if (cikti.yasakKaldirildi) {
        await bildirimGonderKullaniciya({
          kullaniciId: cikti.aliciId,
          mesaj: `Bir "gelmedi" işareti satıcı tarafından geri alındı; rezervasyon yasağın kaldırıldı, yeniden rezervasyon yapabilirsin.`,
          hedefYolu: "/rezervasyonum",
        });
      }
      return NextResponse.json({ siraNo: cikti.siraNo, dusenYedekKodu: cikti.dusenYedekKodu });
    }
    case "reddedildi":
      // 409: guvenle geri alinamaz (admin'e bildirim DurumGecmisi'ne yazildi).
      return NextResponse.json(
        { hata: RED_MESAJI[cikti.sebep] ?? "geri alinamaz", sebep: cikti.sebep, adminBildirildi: true },
        { status: 409 },
      );
    case "yetkisiz":
      return NextResponse.json({ hata: "bu rezervasyon sizin magazaniza ait degil" }, { status: 403 });
    case "bulunamadi":
      return NextResponse.json({ hata: "rezervasyon bulunamadi" }, { status: 404 });
    case "islenemez":
      return NextResponse.json(
        {
          hata:
            cikti.sebep === "alici-ayni-urunde-bekliyor"
              ? "Alıcının bu üründe zaten bekleyen yeni bir rezervasyonu var; geri alma çift kayıt oluşturacağı için yapılamadı."
              : "geri alinamaz",
          sebep: cikti.sebep,
        },
        { status: 409 },
      );
  }
}
