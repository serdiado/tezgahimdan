import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { magazaDegerlendirmeUpsert } from "@/lib/magaza-degerlendirme";
import { bildirimGonderKullaniciya } from "@/lib/bildirim";

const YORUM_MAX = 500;

// /api/degerlendirme ile ayni desen (auth -> dogrulama -> DB yaz -> donus).
// Sadece bu magazadan gercekten satin alan (durum="satildi") degerlendirebilir
// - bu kontrol magazaDegerlendirmeUpsert() icinde yapilir (salt-okunur).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "giriş yapmak için önce oturum açmalısınız", girisGerekli: true }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const magazaId = typeof body?.magazaId === "string" ? body.magazaId : "";
  const puan = Number(body?.puan);
  const yorumRaw = typeof body?.yorum === "string" ? body.yorum.trim() : "";

  if (!magazaId) {
    return NextResponse.json({ hata: "magazaId zorunlu" }, { status: 400 });
  }
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
    return NextResponse.json({ hata: "puan 1-5 arasında bir tam sayı olmalı" }, { status: 400 });
  }
  if (yorumRaw.length > YORUM_MAX) {
    return NextResponse.json({ hata: `yorum en fazla ${YORUM_MAX} karakter olabilir` }, { status: 400 });
  }

  const magaza = await prisma.magaza.findUnique({
    where: { id: magazaId },
    select: { id: true, silindiMi: true, sahipId: true, slug: true },
  });
  if (!magaza || magaza.silindiMi) {
    return NextResponse.json({ hata: "tezgah bulunamadı" }, { status: 404 });
  }

  const sonuc = await magazaDegerlendirmeUpsert({
    kullaniciId: session.user.id,
    magazaId,
    puan,
    yorum: yorumRaw || null,
  });

  if (sonuc.tur === "satin-alinmadi") {
    return NextResponse.json(
      { hata: "bu tezgahı değerlendirmek için önce bir üründen satın almış olmalısınız" },
      { status: 403 },
    );
  }
  if (sonuc.tur === "yasakli") {
    return NextResponse.json(
      { hata: "Hesabınız kısıtlandığı için değerlendirme bırakamazsınız." },
      { status: 403 },
    );
  }

  // Bildirim: motor cagrisi (yukarida) tamamlandiktan SONRA, sadece ILK KEZ
  // birakilan degerlendirmede (guncellemede bildirim YOK), kendine bildirim yok
  // (satici kendi tezgahini degerlendiremez zaten, ama yine de kontrol edilir).
  // 2026-07-09 duzeltmesi: mesaj puan/yorum icermiyordu VE hedefYolu hic
  // yoktu (Bildirim.hedefYolu bos -> kart tiklanamiyordu, bkz. Bildirim
  // modeli yorumu) - ürün-degerlendirme bildirimiyle AYNI duzeltme burada da
  // uygulandi.
  if (sonuc.yeniMi && session.user.id !== magaza.sahipId) {
    const yorumOzeti = sonuc.yorum
      ? `: "${sonuc.yorum.length > 80 ? `${sonuc.yorum.slice(0, 80)}…` : sonuc.yorum}"`
      : ".";
    await bildirimGonderKullaniciya({
      kullaniciId: magaza.sahipId,
      mesaj: `Tezgahına ${sonuc.puan}/5 yıldız değerlendirme aldın${yorumOzeti}`,
      hedefYolu: `/magaza/${magaza.slug}/yorumlar`,
    });
  }

  return NextResponse.json({ puan: sonuc.puan, yorum: sonuc.yorum });
}
