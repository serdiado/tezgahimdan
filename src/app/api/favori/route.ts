import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { favoriToggle } from "@/lib/favori";

// Tek toggle endpoint (kalp/begeni ve favori/takip AYNI (kullanici,urun) satirinda
// iki bagimsiz bayrak - bkz. src/lib/favori.ts). Girisli HERKES herhangi bir
// urunu begenip takip edebilir, rol kisiti yok (rezervasyon motorunda "satici
// kendi urununu rezerve edebiliyor" ile ayni gevseklik, bilincli tutarlilik).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "giriş yapmak için önce oturum açmalısınız", girisGerekli: true }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const urunId = typeof body?.urunId === "string" ? body.urunId : "";
  const tur = body?.tur === "begeni" || body?.tur === "takip" ? body.tur : "";
  if (!urunId || !tur) {
    return NextResponse.json({ hata: "urunId ve geçerli tur (begeni|takip) zorunlu" }, { status: 400 });
  }

  const urun = await prisma.urun.findUnique({ where: { id: urunId }, select: { id: true, silindiMi: true } });
  if (!urun || urun.silindiMi) {
    return NextResponse.json({ hata: "ürün bulunamadı" }, { status: 404 });
  }

  const sonuc = await favoriToggle({ kullaniciId: session.user.id, urunId, tur });
  return NextResponse.json(sonuc);
}
