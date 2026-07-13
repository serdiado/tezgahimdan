import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

// Admin-basvurulu hesap silme (2026-07-13 kullanici karari, KVKK): self-servis
// DEGIL - kullanici KVKK sayfasindaki yoldan basvurur, admin buradan siler.
// "Hicbir kayit kalici silinmez" kurali geregi SOFT silme + ANONIMLESTIRME:
//   - silindiMi=true -> giris engellenir (auth.ts authorize + Google signIn),
//   - ad -> "Silinmiş Üye" (degerlendirme/yorum gecmisinde gercek ad kalmaz),
//   - telefon/email/sifreHash/emailVerified -> NULL (kisisel veri kalkar;
//     unique alanlar bosaldigi icin ayni telefon/email ile YENIDEN kayit
//     acilabilir - KVKK'nin istedigi "bagin kopmasi" tam olarak bu).
// Rezervasyon/degerlendirme SATIRLARI kalir (platform butunlugu + denetim izi),
// ama artik anonim bir kullaniciya isaret ederler.
// GERI DONUSU YOK (kisisel veri anonimlestirildigi icin) - UI iki adimli onay ister.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const kullaniciId = typeof body?.kullaniciId === "string" ? body.kullaniciId : "";
  if (!kullaniciId) {
    return NextResponse.json({ hata: "kullaniciId zorunlu" }, { status: 400 });
  }

  // Admin kendi hesabini silemez - kendi kendini kilitleme riskini onler.
  if (kullaniciId === session.user.id) {
    return NextResponse.json({ hata: "kendi hesabınızı silemezsiniz" }, { status: 409 });
  }

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: {
      id: true,
      rol: true,
      silindiMi: true,
      magazalar: { where: { silindiMi: false }, select: { id: true } },
    },
  });
  if (!kullanici) {
    return NextResponse.json({ hata: "kullanıcı bulunamadı" }, { status: 404 });
  }
  if (kullanici.silindiMi) {
    return NextResponse.json({ tur: "degismedi", silindiMi: true });
  }
  // Baska bir admin hesabi bu yoldan silinemez (yanlislikla/kotu niyetle tek
  // admin kalma riski) - admin hesabi ancak dogrudan DB mudahalesiyle kaldirilir.
  if (kullanici.rol === "admin") {
    return NextResponse.json({ hata: "admin hesabı bu yoldan silinemez" }, { status: 409 });
  }
  // Aktif tezgahi olan satici silinemez: once tezgah kaldirilmali (bekleyen
  // rezervasyonlar/urunler oradan duzgun kapanir). Admin, magaza detayindan
  // gizleyip kaldirabilir; sonra buraya doner.
  if (kullanici.magazalar.length > 0) {
    return NextResponse.json(
      { hata: "aktif tezgahı olan kullanıcı silinemez — önce tezgahı kaldırın" },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.kullanici.update({
      where: { id: kullaniciId },
      data: {
        silindiMi: true,
        ad: "Silinmiş Üye",
        telefon: null,
        email: null,
        emailVerified: null,
        sifreHash: null,
      },
    }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Kullanici",
        varlikId: kullaniciId,
        olay: "kullanici_hesabi_silindi",
      },
    }),
  ]);

  return NextResponse.json({ tur: "silindi", silindiMi: true });
}
