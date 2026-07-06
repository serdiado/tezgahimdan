import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { degerlendirmeUpsert } from "@/lib/degerlendirme";

const YORUM_MAX = 500;

// /api/sikayet ile ayni desen (auth -> dogrulama -> DB yaz -> donus). Sadece
// gercekten satin alan (durum="satildi") degerlendirebilir - bu kontrol
// degerlendirmeUpsert() icinde yapilir (Rezervasyon.findFirst, salt-okunur).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "giriş yapmak için önce oturum açmalısınız", girisGerekli: true }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const urunId = typeof body?.urunId === "string" ? body.urunId : "";
  const puan = Number(body?.puan);
  const yorumRaw = typeof body?.yorum === "string" ? body.yorum.trim() : "";

  if (!urunId) {
    return NextResponse.json({ hata: "urunId zorunlu" }, { status: 400 });
  }
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
    return NextResponse.json({ hata: "puan 1-5 arasında bir tam sayı olmalı" }, { status: 400 });
  }
  if (yorumRaw.length > YORUM_MAX) {
    return NextResponse.json({ hata: `yorum en fazla ${YORUM_MAX} karakter olabilir` }, { status: 400 });
  }

  const urun = await prisma.urun.findUnique({ where: { id: urunId }, select: { id: true, silindiMi: true } });
  if (!urun || urun.silindiMi) {
    return NextResponse.json({ hata: "ürün bulunamadı" }, { status: 404 });
  }

  const sonuc = await degerlendirmeUpsert({
    kullaniciId: session.user.id,
    urunId,
    puan,
    yorum: yorumRaw || null,
  });

  if (sonuc.tur === "satin-alinmadi") {
    return NextResponse.json(
      { hata: "bu ürünü değerlendirmek için önce satın almış olmalısınız" },
      { status: 403 },
    );
  }

  return NextResponse.json({ puan: sonuc.puan, yorum: sonuc.yorum });
}
