import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

const GECERLI_SAYFALAR = ["anasayfa", "magaza_hero"] as const;
const GECERLI_TURLER = [
  "haftalik_ritim",
  "yeni_urunler",
  "en_cok_begenilen",
  "magaza_listesi",
  "magaza_hero_whatsapp",
  "magaza_hero_kroki",
  "magaza_hero_puan",
] as const;

// Iki modulun "sira" degerini transaction icinde takas eder - tek satirlik
// update'ten farkli olarak burada IKI satirin tutarli kalmasi gerekir (biri
// guncellenip digeri guncellenemezse siralama bozulur). Komsu araması AYNI
// sayfa grubuyla sinirlanir - yoksa magaza_hero'daki bir modulun komsusu
// yanlislikla anasayfa grubundan bulunabilirdi (iki grup ayni "sira" sayaç
// alanini paylasiyor ama BAGIMSIZ, bkz. schema.prisma @@unique([sayfa,tur])).
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const sayfa = body?.sayfa;
  const tur = body?.tur;
  const yon = body?.yon;
  if (!(GECERLI_SAYFALAR as readonly string[]).includes(sayfa)) {
    return NextResponse.json({ hata: "geçersiz sayfa" }, { status: 400 });
  }
  if (!(GECERLI_TURLER as readonly string[]).includes(tur)) {
    return NextResponse.json({ hata: "geçersiz modül türü" }, { status: 400 });
  }
  if (yon !== "yukari" && yon !== "asagi") {
    return NextResponse.json({ hata: "geçersiz yön" }, { status: 400 });
  }

  const modul = await prisma.sayfaModulu.findUnique({ where: { sayfa_tur: { sayfa, tur } } });
  if (!modul) {
    return NextResponse.json({ hata: "modül bulunamadı" }, { status: 404 });
  }

  const komsu = await prisma.sayfaModulu.findFirst({
    where: {
      sayfa,
      sira: yon === "yukari" ? { lt: modul.sira } : { gt: modul.sira },
    },
    orderBy: { sira: yon === "yukari" ? "desc" : "asc" },
  });
  if (!komsu) {
    return NextResponse.json({ tur: "degismedi" });
  }

  await prisma.$transaction([
    prisma.sayfaModulu.update({ where: { sayfa_tur: { sayfa, tur: modul.tur } }, data: { sira: komsu.sira } }),
    prisma.sayfaModulu.update({ where: { sayfa_tur: { sayfa, tur: komsu.tur } }, data: { sira: modul.sira } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "SayfaModulu",
        varlikId: `${sayfa}:${modul.tur}`,
        olay: `sayfa_modulu_siralandi:${sayfa}:${modul.tur}<->${komsu.tur}`,
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi" });
}
