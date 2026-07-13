import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { magazaDuraklatmaSupurmesi } from "@/lib/rezervasyon";
import { bildirimGonderKullaniciya } from "@/lib/bildirim";

// SELF-SERVIS tezgah duraklatma / devam ettirme (2026-07-11 kullanici karari).
// Admin'in magaza-gizle'sinden AYRI: bu saticinin kendi tatil modu
// (Magaza.duraklatildiMi), o admin moderasyonu (Magaza.gizliMi) - satici admin
// gizlemesini bu yoldan ACAMAZ (zaten ayri alanlar).
//
// Duraklatirken sira ONEMLI: once bayrak yazilir (yeni rezervasyon kapisi
// kapanir - rezervasyonOlustur "magaza-duraklatilmis" doner), SONRA bekleyenler
// supurulur (magazaDuraklatmaSupurmesi, 2 turlu - yaris penceresi icin).
// Supurme CEZASIZ iptaldir; baslamis pazarin kayitlarina dokunulmaz (hukum
// saticida - zorunlu islem ekrani duraklatmayla kapanmaz). Bildirimler motor
// disinda, burada gonderilir (bkz. lib/bildirim.ts sozlesmesi): iptal edilen
// her aliciya tezgah sayfasina (WhatsApp dugmesinin oldugu yere) goturen bir
// bildirim duser - kullanici karari: "isteyen aninda ulasabilsin".
export async function POST(request: Request) {
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    return NextResponse.json({ hata: "tezgah bulunamadı" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const duraklat = body?.duraklat;
  if (typeof duraklat !== "boolean") {
    return NextResponse.json({ hata: "geçersiz istek" }, { status: 400 });
  }

  if (magaza.duraklatildiMi === duraklat) {
    return NextResponse.json({ tur: "degismedi", duraklatildiMi: magaza.duraklatildiMi });
  }

  await prisma.$transaction([
    prisma.magaza.update({ where: { id: magaza.id }, data: { duraklatildiMi: duraklat } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Magaza",
        varlikId: magaza.id,
        olay: duraklat ? "magaza_duraklatildi" : "magaza_devam_etti",
      },
    }),
  ]);

  if (!duraklat) {
    return NextResponse.json({ tur: "devam", duraklatildiMi: false });
  }

  // Bayrak yazildi, kapi kapali - simdi bekleyenleri supur ve haber ver.
  const iptaller = await magazaDuraklatmaSupurmesi(magaza.id);
  for (const iptal of iptaller) {
    await bildirimGonderKullaniciya({
      kullaniciId: iptal.aliciId,
      mesaj:
        `"${magaza.ad}" bu hafta pazara gelemiyor; "${iptal.urunBaslik}" rezervasyonun iptal edildi. ` +
        `Merak ettiklerini tezgah sayfasındaki WhatsApp hattından sorabilirsin.`,
      hedefYolu: `/magaza/${magaza.slug}`,
    });
  }

  return NextResponse.json({
    tur: "duraklatildi",
    duraklatildiMi: true,
    iptalSayisi: iptaller.length,
  });
}
