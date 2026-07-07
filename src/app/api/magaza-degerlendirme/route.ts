import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { magazaDegerlendirmeUpsert } from "@/lib/magaza-degerlendirme";

const YORUM_MAX = 500;

// /api/degerlendirme ile ayni desen (auth -> dogrulama -> DB yaz -> donus).
// Sadece bu magazadan gercekten satin alan (durum="satildi") degerlendirebilir
// - bu kontrol magazaDegerlendirmeUpsert() icinde yapilir (salt-okunur).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "giriş yapmak için önce oturum açmalısınız", girisGerekli: true }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const magazaId = typeof body?.magazaId === "string" ? body.magazaId : "";
  const puan = Number(body?.puan);
  const yorumRaw = typeof body?.yorum === "string" ? body.yorum.trim() : "";

  if (!magazaId) {
    return NextResponse.json({ hata: "magazaId zorunlu" }, { status: 400 });
  }
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
    return NextResponse.json({ hata: "puan 1-5 arasında bir tam sayı olmalı" }, { status: 400 });
  }
  if (yorumRaw.length > YORUM_MAX) {
    return NextResponse.json({ hata: `yorum en fazla ${YORUM_MAX} karakter olabilir` }, { status: 400 });
  }

  const magaza = await prisma.magaza.findUnique({ where: { id: magazaId }, select: { id: true, silindiMi: true } });
  if (!magaza || magaza.silindiMi) {
    return NextResponse.json({ hata: "mağaza bulunamadı" }, { status: 404 });
  }

  const sonuc = await magazaDegerlendirmeUpsert({
    kullaniciId: session.user.id,
    magazaId,
    puan,
    yorum: yorumRaw || null,
  });

  if (sonuc.tur === "satin-alinmadi") {
    return NextResponse.json(
      { hata: "bu mağazayı değerlendirmek için önce bir üründen satın almış olmalısınız" },
      { status: 403 },
    );
  }
  if (sonuc.tur === "yasakli") {
    return NextResponse.json(
      { hata: "Hesabınız kısıtlandığı için değerlendirme bırakamazsınız." },
      { status: 403 },
    );
  }

  return NextResponse.json({ puan: sonuc.puan, yorum: sonuc.yorum });
}
