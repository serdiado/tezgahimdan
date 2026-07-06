import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { urunEkle } from "@/lib/urun";
import { bildirimGonderMagazaTakipcilerine } from "@/lib/bildirim";

// Admin, bir saticinin adina urun ekler (PLAN.md SS2D). urunEkle() ayni
// dogrulama/yukleme/olusturma mantigini kullanir (src/lib/urun.ts) - tek fark
// magazaId'nin oturumdan degil, admin'in secip route'a verdigi bir id'den gelmesi.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const formData = await request.formData();

  const magazaId = typeof formData.get("magazaId") === "string" ? (formData.get("magazaId") as string) : "";
  const kategoriId = formData.get("kategoriId");
  const baslik = typeof formData.get("baslik") === "string" ? (formData.get("baslik") as string) : "";
  const aciklamaRaw = formData.get("aciklama");
  const aciklama = typeof aciklamaRaw === "string" ? aciklamaRaw : null;
  const fiyatRaw = formData.get("fiyat");
  const stokRaw = formData.get("stokAdedi");
  const dosyalar = formData.getAll("fotograflar").filter((f): f is File => f instanceof File && f.size > 0);

  if (!magazaId) {
    return NextResponse.json({ hata: "magazaId zorunlu" }, { status: 400 });
  }
  const magaza = await prisma.magaza.findUnique({ where: { id: magazaId }, select: { id: true, ad: true, silindiMi: true } });
  if (!magaza || magaza.silindiMi) {
    return NextResponse.json({ hata: "mağaza bulunamadı" }, { status: 404 });
  }

  if (typeof kategoriId !== "string" || !kategoriId) {
    return NextResponse.json({ hata: "kategori zorunlu" }, { status: 400 });
  }
  const fiyatStr = typeof fiyatRaw === "string" ? fiyatRaw.trim() : "";
  const stokAdedi = typeof stokRaw === "string" && stokRaw ? Number.parseInt(stokRaw, 10) : 1;

  const sonuc = await urunEkle({
    magazaId: magaza.id,
    kategoriId,
    baslik,
    aciklama,
    fiyat: fiyatStr,
    stokAdedi,
    dosyalar,
  });

  if (sonuc.tur !== "eklendi") {
    switch (sonuc.tur) {
      case "gecersiz-baslik":
        return NextResponse.json({ hata: "baslik zorunlu (en fazla 200 karakter)" }, { status: 400 });
      case "gecersiz-fiyat":
        return NextResponse.json({ hata: "gecerli bir fiyat girilmeli" }, { status: 400 });
      case "gecersiz-stok":
        return NextResponse.json({ hata: "stok adedi en az 1 olmali" }, { status: 400 });
      case "gecersiz-fotograf":
        return NextResponse.json({ hata: sonuc.mesaj }, { status: 400 });
      case "gecersiz-kategori":
        return NextResponse.json(
          { hata: "Bu kategori artık kullanılmıyor, lütfen başka bir kategori seçin" },
          { status: 400 },
        );
    }
  }

  // Admin izi: kullaniciId etkilenen magazanin sahibi DEGIL, eylemi yapan
  // ADMIN'in kendisi - digger admin eylemleriyle (magaza-gizle vb.) ayni kural.
  await prisma.durumGecmisi.create({
    data: {
      kullaniciId: session.user.id,
      varlikTuru: "Urun",
      varlikId: sonuc.urun.id,
      olay: "urun_eklendi:admin_adina",
    },
  });

  // urunEkle() SAF kalir - bildirim burada, basariyla dondukten SONRA tetiklenir.
  await bildirimGonderMagazaTakipcilerine({
    magazaId: magaza.id,
    urunId: sonuc.urun.id,
    mesaj: `Takip ettiğiniz "${magaza.ad}" mağazasına yeni bir ürün eklendi: "${baslik.trim()}"`,
    haricKullaniciId: session.user.id,
  });

  return NextResponse.json({ id: sonuc.urun.id, fotograflar: sonuc.urun.fotograflar }, { status: 201 });
}
