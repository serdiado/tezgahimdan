import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

// Kalici silme yok (PLAN.md "hicbir kayit kalici silinmez"): kullanimda degilse
// (hicbir Urun.kategoriId bu id'yi isaret etmiyorsa - TUM Urun kayitlari,
// silindiMi'sinden bagimsiz) soft-delete edilir, degilse engellenir.
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

  const kategori = await prisma.kategori.findUnique({ where: { id }, select: { id: true, silindiMi: true } });
  if (!kategori) {
    return NextResponse.json({ hata: "kategori bulunamadı" }, { status: 404 });
  }
  if (kategori.silindiMi) {
    return NextResponse.json({ tur: "degismedi" });
  }

  const urunSayisi = await prisma.urun.count({ where: { kategoriId: id } });
  if (urunSayisi > 0) {
    return NextResponse.json(
      { hata: `bu kategori ${urunSayisi} üründe kullanılıyor, kaldırılamaz`, urunSayisi },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.kategori.update({ where: { id }, data: { silindiMi: true } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Kategori",
        varlikId: id,
        olay: "kategori_kaldirildi",
      },
    }),
  ]);

  return NextResponse.json({ tur: "kaldirildi" });
}
