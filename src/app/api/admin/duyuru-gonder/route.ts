import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

const MESAJ_MAX = 500;
const HEDEF_KITLELER = ["hepsi", "satici", "alici"] as const;

// Toplu site-ici duyuru: Bildirim.urunId artik opsiyonel oldugu icin (bkz.
// bildirimGonderKullaniciya, src/lib/bildirim.ts) urune bagli olmayan genel
// bir mesaj tum hedef kitleye createMany ile tek seferde yazilir - N tekil
// insert yerine tek sorgu (yayin buyudukce onemli).
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const hedefKitle = body?.hedefKitle;
  const mesaj = typeof body?.mesaj === "string" ? body.mesaj.trim() : "";

  if (!(HEDEF_KITLELER as readonly string[]).includes(hedefKitle)) {
    return NextResponse.json({ hata: "geçersiz hedef kitle" }, { status: 400 });
  }
  if (!mesaj || mesaj.length > MESAJ_MAX) {
    return NextResponse.json({ hata: `mesaj zorunlu (en fazla ${MESAJ_MAX} karakter)` }, { status: 400 });
  }

  // "as const" (readonly tuple) DEGIL: Prisma'nin "in" filtresi mutable dizi
  // bekliyor - pnpm lint bunu yakalamadi, sadece `tsc --noEmit` yakaladi.
  const rolFiltre =
    hedefKitle === "hepsi" ? { in: ["satici", "alici"] as ("satici" | "alici")[] } : (hedefKitle as "satici" | "alici");
  const aliciKullanicilar = await prisma.kullanici.findMany({
    where: { rol: rolFiltre },
    select: { id: true },
  });

  if (aliciKullanicilar.length === 0) {
    return NextResponse.json({ hata: "hedef kitlede kullanıcı yok" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.bildirim.createMany({
      data: aliciKullanicilar.map((k) => ({ kullaniciId: k.id, mesaj })),
    }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Duyuru",
        varlikId: hedefKitle,
        olay: `duyuru_gonderildi:${hedefKitle}:${aliciKullanicilar.length}`,
      },
    }),
  ]);

  return NextResponse.json({ tur: "gonderildi", gonderilenSayisi: aliciKullanicilar.length });
}
