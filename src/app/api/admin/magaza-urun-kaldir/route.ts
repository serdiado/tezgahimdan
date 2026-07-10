import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { urunKaldir } from "@/lib/urun";
import { bildirimGonderKullaniciya } from "@/lib/bildirim";

// api/panel/urun-kaldir ile AYNI urunKaldir() lib fonksiyonunu kullanir -
// sahiplik kontrolu yok (admin herhangi bir saticinin urununu kaldirabilir).
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
  }

  const sonuc = await urunKaldir({ id });

  if (sonuc.tur === "bekleyen-var") {
    return NextResponse.json(
      {
        hata: `bu urunde ${sonuc.sayi} bekleyen rezervasyon var, once bunlar sonuclanmali`,
        bekleyenSayisi: sonuc.sayi,
      },
      { status: 409 },
    );
  }
  if (sonuc.tur === "bulunamadi") {
    return NextResponse.json({ hata: "urun bulunamadi" }, { status: 404 });
  }

  await prisma.durumGecmisi.create({
    data: {
      kullaniciId: session.user.id,
      varlikTuru: "Urun",
      varlikId: id,
      olay: "urun_kaldirildi:admin_adina",
    },
  });

  // Tezgah sahibine haber ver: urunu vitrinden kaybolan satici nedenini bilmeli
  // (magaza-gizle deseni - moderasyon etkilenen sahibe bildirilir). Urun
  // soft-delete oldugu icin hala okunabilir (baslik + sahip).
  const urun = await prisma.urun.findUnique({
    where: { id },
    select: { baslik: true, magaza: { select: { sahipId: true } } },
  });
  if (urun && urun.magaza.sahipId !== session.user.id) {
    await bildirimGonderKullaniciya({
      kullaniciId: urun.magaza.sahipId,
      mesaj: `"${urun.baslik}" ürünün admin tarafından tezgahından kaldırıldı.`,
      hedefYolu: "/panel/urunlerim",
    });
  }

  return NextResponse.json({ tur: "kaldirildi" });
}
