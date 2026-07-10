import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { urunGuncelle } from "@/lib/urun";
import { bildirimGonderKullaniciya, bildirimGonderTakipcilere } from "@/lib/bildirim";

const fiyatFormat = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// api/panel/urun-duzenle ile AYNI urunGuncelle() lib fonksiyonunu kullanir
// (bkz. src/lib/urun.ts) - api/admin/magaza-urun-ekle'nin duzenleme muadili.
// Sahiplik kontrolu YOK (admin herhangi bir saticinin urununu duzenleyebilir,
// moderasyon amacli) - tek fark budur.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const formData = await request.formData();

  const id = typeof formData.get("id") === "string" ? (formData.get("id") as string) : "";
  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
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
    case "guncellendi": {
      // Admin izi: kullaniciId etkilenen magazanin sahibi DEGIL, eylemi yapan
      // ADMIN'in kendisi - magaza-urun-ekle ile ayni kural.
      await prisma.durumGecmisi.create({
        data: {
          kullaniciId: session.user.id,
          varlikTuru: "Urun",
          varlikId: sonuc.urun.id,
          olay: "urun_guncellendi:admin_adina",
        },
      });
      if (sonuc.urun.fiyat < sonuc.eskiFiyat) {
        await bildirimGonderTakipcilere({
          urunId: sonuc.urun.id,
          mesaj: `Takip ettiğiniz "${sonuc.urun.baslik}" için fiyat düştü: ${fiyatFormat.format(sonuc.eskiFiyat)} → ${fiyatFormat.format(sonuc.urun.fiyat)}`,
          haricKullaniciIdler: [session.user.id],
        });
      }
      // Tezgah sahibine haber ver (admin moderasyon amacli urununu duzenledi;
      // magaza-gizle deseni). Sahip = eylemi yapan admin ise atlanir.
      const magaza = await prisma.magaza.findUnique({
        where: { id: sonuc.urun.magazaId },
        select: { sahipId: true },
      });
      if (magaza && magaza.sahipId !== session.user.id) {
        await bildirimGonderKullaniciya({
          kullaniciId: magaza.sahipId,
          mesaj: `"${sonuc.urun.baslik}" ürünün admin tarafından düzenlendi.`,
          hedefYolu: "/panel/urunlerim",
        });
      }
      return NextResponse.json({ id: sonuc.urun.id, fotograflar: sonuc.urun.fotograflar, magazaId: sonuc.urun.magazaId });
    }
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
      return NextResponse.json({ hata: "stok adedi en az 1 olmali" }, { status: 400 });
    case "gecersiz-fotograf":
      return NextResponse.json({ hata: sonuc.mesaj }, { status: 400 });
    case "stok-yetersiz":
      return NextResponse.json(
        {
          hata: `stok, ${sonuc.minStok} bekleyen/satılmış hak sahibinin altına düşürülemez`,
          minStok: sonuc.minStok,
        },
        { status: 409 },
      );
  }
}
