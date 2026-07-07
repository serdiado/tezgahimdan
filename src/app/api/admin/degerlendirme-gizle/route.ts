import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

// Admin moderasyon: urun-seviyesi Degerlendirme.gizliMi bayragini yaz.
// Magaza.gizliMi ile AYNI desen (bkz. api/admin/magaza-gizle/route.ts) - okuma
// tarafindaki filtre (gizliMi:false) src/lib/degerlendirme.ts'deki vitrin
// fonksiyonlarinda uygulaniyor, sahibinin kendi listesi (/degerlendirmelerim)
// filtrelenmiyor.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const degerlendirmeId = typeof body?.degerlendirmeId === "string" ? body.degerlendirmeId : "";
  if (!degerlendirmeId) {
    return NextResponse.json({ hata: "degerlendirmeId zorunlu" }, { status: 400 });
  }
  if (typeof body?.gizle !== "boolean") {
    return NextResponse.json({ hata: "gizle (true/false) zorunlu" }, { status: 400 });
  }
  const gizle: boolean = body.gizle;

  const degerlendirme = await prisma.degerlendirme.findUnique({
    where: { id: degerlendirmeId },
    select: { id: true, gizliMi: true },
  });
  if (!degerlendirme) {
    return NextResponse.json({ hata: "değerlendirme bulunamadı" }, { status: 404 });
  }
  if (degerlendirme.gizliMi === gizle) {
    return NextResponse.json({ tur: "degismedi", gizliMi: degerlendirme.gizliMi });
  }

  await prisma.$transaction([
    prisma.degerlendirme.update({ where: { id: degerlendirmeId }, data: { gizliMi: gizle } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Degerlendirme",
        varlikId: degerlendirmeId,
        olay: gizle ? "degerlendirme_gizlendi" : "degerlendirme_tekrar_gorunur",
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi", gizliMi: gizle });
}
