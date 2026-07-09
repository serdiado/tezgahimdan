import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { magazaTakipToggle } from "@/lib/magaza-takip";
import { bildirimGonderKullaniciya } from "@/lib/bildirim";

// /api/favori ile ayni desen: tek toggle endpoint. Girisli HERKES herhangi bir
// magazayi takip edebilir, rol kisiti yok (kendi magazasini takip etmesi de
// engellenmez - favoriToggle'daki "satici kendi urununu begenebilir" gevsekligiyle
// tutarli, bilincli).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "giriş yapmak için önce oturum açmalısınız", girisGerekli: true }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const magazaId = typeof body?.magazaId === "string" ? body.magazaId : "";
  if (!magazaId) {
    return NextResponse.json({ hata: "magazaId zorunlu" }, { status: 400 });
  }

  const magaza = await prisma.magaza.findUnique({
    where: { id: magazaId },
    select: { id: true, silindiMi: true, sahipId: true },
  });
  if (!magaza || magaza.silindiMi) {
    return NextResponse.json({ hata: "tezgah bulunamadı" }, { status: 404 });
  }

  const sonuc = await magazaTakipToggle({ kullaniciId: session.user.id, magazaId });

  // Bildirim: motor cagrisi (yukarida) tamamlandiktan SONRA, sadece YENI takipte
  // (false->true), kendine bildirim yok (satici kendi magazasini takip ederse).
  if (sonuc.takipMi && session.user.id !== magaza.sahipId) {
    await bildirimGonderKullaniciya({
      kullaniciId: magaza.sahipId,
      mesaj: "Tezgahını yeni biri takip etmeye başladı.",
      hedefYolu: "/panel",
    });
  }

  return NextResponse.json(sonuc);
}
