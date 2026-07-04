import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

const GECERLI_DURUMLAR = ["bekliyor", "inceleniyor", "cozuldu", "reddedildi"] as const;

const OLAY_ADI: Record<(typeof GECERLI_DURUMLAR)[number], string> = {
  bekliyor: "sikayet_bekliyor_olarak_isaretlendi",
  inceleniyor: "sikayet_incelemeye_alindi",
  cozuldu: "sikayet_cozuldu",
  reddedildi: "sikayet_reddedildi",
};

// AP-6 karari geregi burada admin override/yeniden-acma akisi YOK - triyaj
// tek yonlu ilerler (bekliyor->inceleniyor->cozuldu/reddedildi). Tum admin
// yazma eylemleri gibi DurumGecmisi'ne admin izi birakir (AP-2/AP-4 deseni).
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const durum = typeof body?.durum === "string" ? body.durum : "";
  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
  }
  if (!GECERLI_DURUMLAR.includes(durum as (typeof GECERLI_DURUMLAR)[number])) {
    return NextResponse.json({ hata: "geçersiz durum" }, { status: 400 });
  }

  const sikayet = await prisma.sikayet.findUnique({ where: { id }, select: { id: true, durum: true } });
  if (!sikayet) {
    return NextResponse.json({ hata: "şikayet bulunamadı" }, { status: 404 });
  }
  if (sikayet.durum === durum) {
    return NextResponse.json({ tur: "degismedi", durum: sikayet.durum });
  }

  await prisma.$transaction([
    prisma.sikayet.update({ where: { id }, data: { durum: durum as (typeof GECERLI_DURUMLAR)[number] } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Sikayet",
        varlikId: id,
        olay: OLAY_ADI[durum as (typeof GECERLI_DURUMLAR)[number]],
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi", durum });
}
