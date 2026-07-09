import { NextResponse } from "next/server";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { urunEkle } from "@/lib/urun";
import { bildirimGonderMagazaTakipcilerine } from "@/lib/bildirim";

export async function POST(request: Request) {
  const { yetkili, session } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  // magazaId istemciden ASLA alinmaz - oturumdaki saticinin kendi magazasindan
  // turetilir, yoksa bir satici baskasinin magazasina urun ekleyebilirdi.
  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    return NextResponse.json({ hata: "once tezgah olusturulmali" }, { status: 409 });
  }

  const formData = await request.formData();

  const kategoriId = formData.get("kategoriId");
  const baslik = typeof formData.get("baslik") === "string" ? (formData.get("baslik") as string) : "";
  const aciklamaRaw = formData.get("aciklama");
  const aciklama = typeof aciklamaRaw === "string" ? aciklamaRaw : null;
  const fiyatRaw = formData.get("fiyat");
  const stokRaw = formData.get("stokAdedi");
  const dosyalar = formData.getAll("fotograflar").filter((f): f is File => f instanceof File && f.size > 0);

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

  switch (sonuc.tur) {
    case "eklendi":
      // urunEkle() SAF kalir (motor/lib fonksiyonu) - bildirim burada, basariyla
      // dondukten SONRA tetiklenir (bildirim.ts deseni).
      await bildirimGonderMagazaTakipcilerine({
        magazaId: magaza.id,
        urunId: sonuc.urun.id,
        mesaj: `Takip ettiğiniz "${magaza.ad}" tezgahına yeni bir ürün eklendi: "${baslik.trim()}"`,
        haricKullaniciId: session.user.id,
      });
      return NextResponse.json({ id: sonuc.urun.id, fotograflar: sonuc.urun.fotograflar }, { status: 201 });
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
