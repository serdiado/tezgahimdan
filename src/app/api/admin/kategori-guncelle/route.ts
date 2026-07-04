import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

// Yeniden adlandirma. NOT (dokumantasyon amacli, kod degil): kategoriIkonuSec
// (src/lib/kategori-renkleri.ts) bilinen kategorileri ADINA gore eslestiriyor
// (Taki/Orgu/Recel -> ikon, digerleri Sparkles) - bilinen birini yeniden
// adlandirmak ikonunu kaybettirir. AP-4 kapsami bunu engellemiyor (plan notu).
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const ad = typeof body?.ad === "string" ? body.ad.trim() : "";
  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
  }
  if (!ad || ad.length > 50) {
    return NextResponse.json({ hata: "kategori adı zorunlu (en fazla 50 karakter)" }, { status: 400 });
  }

  const mevcut = await prisma.kategori.findUnique({ where: { id }, select: { id: true } });
  if (!mevcut) {
    return NextResponse.json({ hata: "kategori bulunamadı" }, { status: 404 });
  }

  const cakisan = await prisma.kategori.findFirst({
    where: { ad: { equals: ad, mode: "insensitive" }, silindiMi: false, id: { not: id } },
    select: { id: true },
  });
  if (cakisan) {
    return NextResponse.json({ hata: "bu isimde bir kategori zaten var" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.kategori.update({ where: { id }, data: { ad } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Kategori",
        varlikId: id,
        olay: "kategori_guncellendi",
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi" });
}
