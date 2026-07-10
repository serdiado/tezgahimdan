import { NextResponse } from "next/server";
import { getSaticiSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { gelmediYasagiKontrolEt, rezervasyonSonuclandir } from "@/lib/rezervasyon";
import {
  bildirimGonderKullaniciya,
  bildirimGonderTakipcilere,
  bildirimGonderYukselenKullaniciya,
} from "@/lib/bildirim";

// api/rezervasyon/route.ts'teki formatla ayni (yasak bitisi kullaniciya
// "17 Temmuz 14:30" olarak soylenir).
const yasakTarihFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

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

      // Gelmedi yasagi kontrolu (2026-07-10): bu isaretlemeyle alicinin ust
      // uste gelmedi serisi dolduysa yasak baslar + bekleyen rezervasyonlari
      // supurulur. Motor cagrisi (kilit) coktan bitti - kontrol/supurme kendi
      // kisa kilitlerini alir. Supurulen her urun icin vazgec akisiyla AYNI
      // bildirim sozlesmesi uygulanir (yukselen kisisel + aktif-tier takipci +
      // tezgah sahibi), alicinin kendisine ise tek toplu yasak bildirimi gider.
      if (cikti.sonuc === "gelmedi") {
        const yasak = await gelmediYasagiKontrolEt(cikti.aliciId);
        if (yasak.uygulandi) {
          const iptalNotu =
            yasak.iptaller.length > 0
              ? ` Bekleyen ${yasak.iptaller.length} rezervasyonun da iptal edildi.`
              : "";
          await bildirimGonderKullaniciya({
            kullaniciId: cikti.aliciId,
            mesaj: `Üst üste teslim alınmayan rezervasyonların nedeniyle ${yasakTarihFormat.format(
              yasak.bitis,
            )} tarihine kadar yeni rezervasyon yapamazsın.${iptalNotu} Bu tarihten sonra temiz bir sayfayla devam edebilirsin.`,
            hedefYolu: "/rezervasyonum",
          });
          for (const iptal of yasak.iptaller) {
            const haric = [cikti.aliciId];
            if (iptal.yukselenKodu) {
              const yukselenAliciId = await bildirimGonderYukselenKullaniciya({
                yukselenKodu: iptal.yukselenKodu,
                urunId: iptal.urunId,
                urunBaslik: iptal.urunBaslik,
              });
              if (yukselenAliciId) haric.push(yukselenAliciId);
            }
            if (iptal.tip === "aktif") {
              await bildirimGonderTakipcilere({
                urunId: iptal.urunId,
                mesaj: `Takip ettiğiniz "${iptal.urunBaslik}" için aktif bir rezervasyon iptal edildi.`,
                haricKullaniciIdler: haric,
              });
            }
            // Tezgah sahibi kuyrugundaki degisikligi haber alir (sebep olarak
            // alicinin yasagi ifsa edilmez - notr metin).
            if (iptal.magazaSahipId !== cikti.aliciId && iptal.magazaSahipId !== session.user.id) {
              await bildirimGonderKullaniciya({
                kullaniciId: iptal.magazaSahipId,
                mesaj: `"${iptal.urunBaslik}" için bir rezervasyon iptal edildi.`,
                hedefYolu: "/panel/rezervasyonlar",
              });
            }
          }
        }
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
