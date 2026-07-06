import { NextResponse } from "next/server";
import { getSaticiSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { rezervasyonSonuclandir } from "@/lib/rezervasyon";
import { bildirimGonderTakipcilere, bildirimGonderYukselenKullaniciya } from "@/lib/bildirim";

export async function POST(request: Request) {
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rezervId = typeof body?.rezervId === "string" ? body.rezervId : "";
  const sonuc = body?.sonuc === "satildi" || body?.sonuc === "gelmedi" ? body.sonuc : null;
  if (!rezervId || !sonuc) {
    return NextResponse.json({ hata: "rezervId ve gecerli sonuc zorunlu" }, { status: 400 });
  }

  const cikti = await rezervasyonSonuclandir({
    rezervId,
    sonuc,
    saticiUserId: session.user.id,
  });

  switch (cikti.tur) {
    case "sonuclandi": {
      // Her zaman aktif-tier (yedek sonuclandirilamaz) - kosulsuz bildirim.
      const urun = await prisma.urun.findUnique({ where: { id: cikti.urunId }, select: { baslik: true } });
      if (urun) {
        // yukselenKodu SADECE "gelmedi" dalinda dolu olur (motor kodu garanti
        // ediyor - "satildi" dalinda hicbir zaman yedek yukselmez), bu yuzden
        // ekstra bir cikti.sonuc==="gelmedi" kontrolune gerek yok - tek basina
        // if(yukselenKodu) hem yeterli hem DRY (motor sozlesmesi route
        // katmaninda tekrar edilmemis olur).
        const haricListesi = [session.user.id];
        if (cikti.yukselenKodu) {
          const yukselenAliciId = await bildirimGonderYukselenKullaniciya({
            yukselenKodu: cikti.yukselenKodu,
            urunId: cikti.urunId,
            urunBaslik: urun.baslik,
          });
          if (yukselenAliciId) haricListesi.push(yukselenAliciId);
        }
        const mesaj =
          cikti.sonuc === "satildi"
            ? `Takip ettiğiniz "${urun.baslik}" satıldı.`
            : `Takip ettiğiniz "${urun.baslik}" için hak sahibi gelmedi, yeni bir hak açıldı.`;
        await bildirimGonderTakipcilere({ urunId: cikti.urunId, mesaj, haricKullaniciIdler: haricListesi });
      }
      return NextResponse.json({
        sonuc: cikti.sonuc,
        yukselenKodu: cikti.yukselenKodu,
        urunTukendi: cikti.urunTukendi,
      });
    }
    case "yetkisiz":
      return NextResponse.json({ hata: "bu rezervasyon sizin magazaniza ait degil" }, { status: 403 });
    case "bulunamadi":
      return NextResponse.json({ hata: "rezervasyon bulunamadi" }, { status: 404 });
    case "islenemez":
      return NextResponse.json({ hata: "islenemez", sebep: cikti.sebep }, { status: 409 });
  }
}
