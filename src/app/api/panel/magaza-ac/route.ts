import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { magazaAc } from "@/lib/magaza";
import { slugTuret } from "@/lib/slug";
import { telefonNormallestir } from "@/lib/telefon";

// Onboarding: giris yapmis HERKES (alici dahil) kendi magazasini acabilir - bu
// yol satici geciti (getSaticiSession) ile korunmaz, cunku kullanici henuz satici
// degil; magazaAc onu ayni islemde satici'ya terfi eder.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "önce giriş yapmalısınız" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ad = typeof body?.ad === "string" ? body.ad.trim() : "";
  const slugHam = typeof body?.slug === "string" ? body.slug.trim() : "";
  const whatsappHam = typeof body?.whatsappNo === "string" ? body.whatsappNo.trim() : "";
  const pazarId = typeof body?.pazarId === "string" ? body.pazarId.trim() : undefined;

  if (!ad || ad.length > 100) {
    return NextResponse.json({ hata: "mağaza adı zorunlu (en fazla 100 karakter)" }, { status: 400 });
  }

  // Slug bos gelirse ad'dan turet (deneyimsiz satici slug yazmasin).
  const slug = slugHam || slugTuret(ad);

  let whatsappNo: string | null = null;
  if (whatsappHam) {
    whatsappNo = telefonNormallestir(whatsappHam);
    if (!whatsappNo) {
      return NextResponse.json(
        { hata: "geçersiz WhatsApp numarası (ör. 05XX XXX XX XX biçimini deneyin)" },
        { status: 400 },
      );
    }
  }

  const sonuc = await magazaAc({ userId: session.user.id, ad, slug, whatsappNo, pazarId });

  switch (sonuc.tur) {
    case "acildi":
      return NextResponse.json({ slug: sonuc.magaza.slug }, { status: 201 });
    case "gecersiz-ad":
      return NextResponse.json({ hata: "mağaza adı zorunlu" }, { status: 400 });
    case "gecersiz-slug":
      return NextResponse.json(
        { hata: "mağaza adından geçerli bir bağlantı üretilemedi, lütfen harf içeren bir ad girin" },
        { status: 400 },
      );
    case "gecersiz-pazar":
      return NextResponse.json(
        { hata: "geçersiz pazar seçimi, lütfen listeden bir pazar seçin" },
        { status: 400 },
      );
    case "slug-alinmis":
      return NextResponse.json(
        { hata: "bu bağlantı zaten kullanılıyor, farklı bir mağaza adı deneyin" },
        { status: 409 },
      );
    case "zaten-magaza-var":
      return NextResponse.json({ hata: "zaten bir mağazanız var" }, { status: 409 });
    case "yasakli":
      return NextResponse.json(
        { hata: "Hesabınız kısıtlandığı için yeni mağaza açamazsınız." },
        { status: 403 },
      );
  }
}
