import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { PLATFORM_AYARLARI_ID } from "@/lib/platform-ayarlari";

// Makul sinirlar: 0/negatif ya da absurd buyuk degerler yanlislikla motoru
// bozmasin (ör. esik=0 -> herkes aninda kisitli, maxYedek=10000 -> anlamsiz
// kuyruk). Gercek is kurali degil, savunmaci giris kontrolu.
const MIN_ESIK = 1;
const MAX_ESIK = 20;
const MIN_YEDEK = 0;
const MAX_YEDEK_SINIRI = 50;

export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const guvenilirlikEsigi = Number(body?.guvenilirlikEsigi);
  const maxYedek = Number(body?.maxYedek);

  if (!Number.isInteger(guvenilirlikEsigi) || guvenilirlikEsigi < MIN_ESIK || guvenilirlikEsigi > MAX_ESIK) {
    return NextResponse.json(
      { hata: `güvenilirlik eşiği ${MIN_ESIK}-${MAX_ESIK} arasında bir tam sayı olmalı` },
      { status: 400 },
    );
  }
  if (!Number.isInteger(maxYedek) || maxYedek < MIN_YEDEK || maxYedek > MAX_YEDEK_SINIRI) {
    return NextResponse.json(
      { hata: `maksimum yedek ${MIN_YEDEK}-${MAX_YEDEK_SINIRI} arasında bir tam sayı olmalı` },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.platformAyarlari.upsert({
      where: { id: PLATFORM_AYARLARI_ID },
      create: { id: PLATFORM_AYARLARI_ID, guvenilirlikEsigi, maxYedek },
      update: { guvenilirlikEsigi, maxYedek },
    }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "PlatformAyarlari",
        varlikId: PLATFORM_AYARLARI_ID,
        olay: `platform_ayarlari_guncellendi:esik=${guvenilirlikEsigi}:yedek=${maxYedek}`,
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi", guvenilirlikEsigi, maxYedek });
}
