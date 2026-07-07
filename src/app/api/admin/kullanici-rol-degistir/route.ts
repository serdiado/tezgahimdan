import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

const IZINLI_ROLLER = ["admin", "alici"] as const;

// Ikinci admin ekleme / admin yetkisini kaldirma. Kapsam BILEREK dar: sadece
// admin<->alici gecisi (satici<->admin degil - saticinin magazasi varsa admin
// yaparken/kaldirirken magaza sahiplik anlamini karistirmamak icin basit
// tutuldu). Admin kendi rolunu degistiremez (kendi kendini kilitleme riski,
// kullanici-yasakla ile AYNI guvenlik gerekce).
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const kullaniciId = typeof body?.kullaniciId === "string" ? body.kullaniciId : "";
  const yeniRol = body?.yeniRol;
  if (!kullaniciId) {
    return NextResponse.json({ hata: "kullaniciId zorunlu" }, { status: 400 });
  }
  if (!(IZINLI_ROLLER as readonly string[]).includes(yeniRol)) {
    return NextResponse.json({ hata: "geçersiz rol" }, { status: 400 });
  }
  if (kullaniciId === session.user.id) {
    return NextResponse.json({ hata: "kendi rolünüzü değiştiremezsiniz" }, { status: 409 });
  }

  const kullanici = await prisma.kullanici.findUnique({ where: { id: kullaniciId }, select: { id: true, rol: true } });
  if (!kullanici) {
    return NextResponse.json({ hata: "kullanıcı bulunamadı" }, { status: 404 });
  }
  if (kullanici.rol === yeniRol) {
    return NextResponse.json({ tur: "degismedi", rol: kullanici.rol });
  }

  await prisma.$transaction([
    prisma.kullanici.update({ where: { id: kullaniciId }, data: { rol: yeniRol } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Kullanici",
        varlikId: kullaniciId,
        olay: `kullanici_rol_degisti:${kullanici.rol}->${yeniRol}`,
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi", rol: yeniRol });
}
