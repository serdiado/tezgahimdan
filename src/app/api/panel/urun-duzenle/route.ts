import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { urunGuncelle } from "@/lib/urun";
import { bildirimGonderTakipcilere } from "@/lib/bildirim";

const fiyatFormat = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export async function POST(request: Request) {
  const { yetkili, session } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    return NextResponse.json({ hata: "once magaza olusturulmali" }, { status: 409 });
  }

  const formData = await request.formData();

  const id = typeof formData.get("id") === "string" ? (formData.get("id") as string) : "";
  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
  }

  // magazaId istemciden ALINMAZ - urun oturumdaki saticinin kendi magazasindan
  // mi diye burada dogrulanir, aksi halde bir satici baskasinin urununu
  // duzenleyebilirdi. urunGuncelle() bu kontrolu yapmaz (admin varyantinda
  // gerekmiyor), o yuzden sahiplik burada, cagiran tarafta kaliyor.
  const mevcutUrun = await prisma.urun.findUnique({ where: { id }, select: { magazaId: true } });
  if (!mevcutUrun) {
    return NextResponse.json({ hata: "urun bulunamadi" }, { status: 404 });
  }
  if (mevcutUrun.magazaId !== magaza.id) {
    return NextResponse.json({ hata: "bu urun sizin magazaniza ait degil" }, { status: 403 });
  }

  const kategoriId = formData.get("kategoriId");
  const baslik = typeof formData.get("baslik") === "string" ? (formData.get("baslik") as string) : "";
  const aciklamaRaw = formData.get("aciklama");
  const aciklama = typeof aciklamaRaw === "string" ? aciklamaRaw : null;
  const fiyatRaw = formData.get("fiyat");
  const stokRaw = formData.get("stokAdedi");
  const siralamaRaw = formData.get("siralama");
  const yeniDosyalar = formData.getAll("fotograflar").filter((f): f is File => f instanceof File && f.size > 0);

  if (typeof kategoriId !== "string" || !kategoriId) {
    return NextResponse.json({ hata: "kategori zorunlu" }, { status: 400 });
  }
  const fiyatStr = typeof fiyatRaw === "string" ? fiyatRaw.trim() : "";
  const stokAdedi = typeof stokRaw === "string" && stokRaw ? Number.parseInt(stokRaw, 10) : NaN;

  const sonuc = await urunGuncelle({
    id,
    kategoriId,
    baslik,
    aciklama,
    fiyat: fiyatStr,
    stokAdedi,
    siralamaRaw: typeof siralamaRaw === "string" ? siralamaRaw : "",
    yeniDosyalar,
  });

  switch (sonuc.tur) {
    case "guncellendi":
      // urunGuncelle() SAF kalir (motor/lib fonksiyonu) - bildirim burada,
      // basariyla dondukten SONRA tetiklenir (bildirim.ts deseni). Sadece
      // DUSUSTE (<) tetiklenir.
      if (sonuc.urun.fiyat < sonuc.eskiFiyat) {
        await bildirimGonderTakipcilere({
          urunId: sonuc.urun.id,
          mesaj: `Takip ettiğiniz "${sonuc.urun.baslik}" için fiyat düştü: ${fiyatFormat.format(sonuc.eskiFiyat)} → ${fiyatFormat.format(sonuc.urun.fiyat)}`,
          haricKullaniciIdler: [session.user.id],
        });
      }
      return NextResponse.json({ id: sonuc.urun.id, fotograflar: sonuc.urun.fotograflar });
    case "bulunamadi":
      return NextResponse.json({ hata: "urun bulunamadi" }, { status: 404 });
    case "gecersiz-kategori":
      return NextResponse.json(
        { hata: "Bu kategori artık kullanılmıyor, lütfen başka bir kategori seçin" },
        { status: 400 },
      );
    case "gecersiz-baslik":
      return NextResponse.json({ hata: "baslik zorunlu (en fazla 200 karakter)" }, { status: 400 });
    case "gecersiz-fiyat":
      return NextResponse.json({ hata: "gecerli bir fiyat girilmeli" }, { status: 400 });
    case "gecersiz-stok":
      return NextResponse.json({ hata: "stok adedi 0 veya daha büyük bir tam sayı olmalı" }, { status: 400 });
    case "gecersiz-fotograf":
      return NextResponse.json({ hata: sonuc.mesaj }, { status: 400 });
    case "stok-yetersiz":
      return NextResponse.json(
        {
          hata: `stok, ${sonuc.minStok} bekleyen hak sahibinin altına düşürülemez`,
          minStok: sonuc.minStok,
        },
        { status: 409 },
      );
  }
}
