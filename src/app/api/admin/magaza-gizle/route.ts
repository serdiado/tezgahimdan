import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

// Admin moderasyon: Magaza.gizliMi bayragini yaz. gizliMi'nin neden silindiMi'den
// AYRI oldugu ve hangi sorgulari etkiledigi icin bkz. schema.prisma:107-112 +
// docs/mimari/satici-onboarding.md - burada yalniz yazma islemi var, davranis
// zaten getMagazaBySlug + rezervasyonOlustur'da (SP-1/KP-1) uygulanmis durumda.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const magazaId = typeof body?.magazaId === "string" ? body.magazaId : "";
  if (!magazaId) {
    return NextResponse.json({ hata: "magazaId zorunlu" }, { status: 400 });
  }
  if (typeof body?.gizle !== "boolean") {
    return NextResponse.json({ hata: "gizle (true/false) zorunlu" }, { status: 400 });
  }
  const gizle: boolean = body.gizle;

  const magaza = await prisma.magaza.findUnique({
    where: { id: magazaId },
    select: { id: true, gizliMi: true, silindiMi: true },
  });
  if (!magaza) {
    return NextResponse.json({ hata: "tezgah bulunamadı" }, { status: 404 });
  }
  // Soft-delete edilmis magaza icin gizle/goster anlamsiz - bugun hicbir akis
  // silindiMi=true yazmiyor (magaza silme ozelligi yok), ama ileride eklenirse
  // tutarli davranmasi icin savunmaci kontrol.
  if (magaza.silindiMi) {
    return NextResponse.json({ hata: "silinmiş tezgah gizlenemez/gösterilemez" }, { status: 409 });
  }
  if (magaza.gizliMi === gizle) {
    return NextResponse.json({ tur: "degismedi", gizliMi: magaza.gizliMi });
  }

  // Tum admin yazma eylemleri DurumGecmisi'ne admin izi birakir. kullaniciId
  // burada magazanin sahibi DEGIL, eylemi yapan ADMIN'in kendisi - diger
  // DurumGecmisi kayitlarindan (kullaniciId = etkilenen kisi) BILEREK farkli bir
  // kullanim: admin eylemlerinde "kim yapti" izi tutulur.
  await prisma.$transaction([
    prisma.magaza.update({ where: { id: magazaId }, data: { gizliMi: gizle } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Magaza",
        varlikId: magazaId,
        olay: gizle ? "magaza_gizlendi" : "magaza_tekrar_gorunur",
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi", gizliMi: gizle });
}
