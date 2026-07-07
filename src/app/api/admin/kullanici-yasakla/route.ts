import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

// Admin moderasyon: Kullanici.yasakliMi bayragini yaz. Magaza.gizliMi ile AYNI
// desen (bkz. api/admin/magaza-gizle/route.ts) - burada yalniz yazma var,
// davranis (yeni aksiyonlarin engellenmesi) kullaniciYasakliMi() cagiran her
// yerde (bkz. src/lib/yetki.ts) zaten uygulanmis durumda.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const kullaniciId = typeof body?.kullaniciId === "string" ? body.kullaniciId : "";
  if (!kullaniciId) {
    return NextResponse.json({ hata: "kullaniciId zorunlu" }, { status: 400 });
  }
  if (typeof body?.yasakla !== "boolean") {
    return NextResponse.json({ hata: "yasakla (true/false) zorunlu" }, { status: 400 });
  }
  const yasakla: boolean = body.yasakla;

  // Admin kendi hesabini yasaklayamaz - kendi kendini kilitleme riskini onler.
  if (kullaniciId === session.user.id) {
    return NextResponse.json({ hata: "kendi hesabınızı yasaklayamazsınız" }, { status: 409 });
  }

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: { id: true, yasakliMi: true },
  });
  if (!kullanici) {
    return NextResponse.json({ hata: "kullanıcı bulunamadı" }, { status: 404 });
  }
  if (kullanici.yasakliMi === yasakla) {
    return NextResponse.json({ tur: "degismedi", yasakliMi: kullanici.yasakliMi });
  }

  await prisma.$transaction([
    prisma.kullanici.update({ where: { id: kullaniciId }, data: { yasakliMi: yasakla } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Kullanici",
        varlikId: kullaniciId,
        olay: yasakla ? "kullanici_yasaklandi" : "kullanici_yasagi_kaldirildi",
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi", yasakliMi: yasakla });
}
