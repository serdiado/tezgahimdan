import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { gercekDosyaTuruDogrula } from "@/lib/dosya";
import { IZINLI_TIPLER, MAX_BOYUT_BYTE, MAX_FOTOGRAF } from "@/lib/urun-sabitleri";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "urunler");

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
  // duzenleyebilirdi.
  const mevcutUrun = await prisma.urun.findUnique({ where: { id } });
  if (!mevcutUrun) {
    return NextResponse.json({ hata: "urun bulunamadi" }, { status: 404 });
  }
  if (mevcutUrun.magazaId !== magaza.id) {
    return NextResponse.json({ hata: "bu urun sizin magazaniza ait degil" }, { status: 403 });
  }

  const kategoriId = formData.get("kategoriId");
  const baslik = typeof formData.get("baslik") === "string" ? (formData.get("baslik") as string).trim() : "";
  const aciklamaRaw = formData.get("aciklama");
  const aciklama = typeof aciklamaRaw === "string" && aciklamaRaw.trim() ? aciklamaRaw.trim() : null;
  const fiyatRaw = formData.get("fiyat");
  const stokRaw = formData.get("stokAdedi");
  const siralamaRaw = formData.get("siralama");
  const yeniDosyalar = formData.getAll("fotograflar").filter((f): f is File => f instanceof File && f.size > 0);

  if (typeof kategoriId !== "string" || !kategoriId) {
    return NextResponse.json({ hata: "kategori zorunlu" }, { status: 400 });
  }
  if (!baslik || baslik.length > 200) {
    return NextResponse.json({ hata: "baslik zorunlu (en fazla 200 karakter)" }, { status: 400 });
  }
  const fiyatStr = typeof fiyatRaw === "string" ? fiyatRaw.trim() : "";
  const fiyatSayisal = Number.parseFloat(fiyatStr);
  if (!fiyatStr || !Number.isFinite(fiyatSayisal) || fiyatSayisal <= 0) {
    return NextResponse.json({ hata: "gecerli bir fiyat girilmeli" }, { status: 400 });
  }
  const stokAdedi = typeof stokRaw === "string" && stokRaw ? Number.parseInt(stokRaw, 10) : NaN;
  if (!Number.isInteger(stokAdedi) || stokAdedi < 1) {
    return NextResponse.json({ hata: "stok adedi en az 1 olmali" }, { status: 400 });
  }

  // Nihai foto sirasi istemciden "siralama" token dizisiyle gelir: her oge ya
  // {tur:"mevcut", yol} (var olan foto) ya {tur:"yeni", index} (bu istekte yuklenen
  // dosyanin sirasi). Guvenlik: "mevcut" yollar mevcutUrun.fotograflar ile
  // dogrulanir (uydurma yol enjekte edilemez), "yeni" index'ler yeniDosyalar
  // sinirinda tutulur. Kapak = nihai dizinin ilk elemani.
  type SiraOge = { tur: "mevcut"; yol: string } | { tur: "yeni"; index: number };
  let siralama: SiraOge[] = [];
  try {
    const parsed = typeof siralamaRaw === "string" ? JSON.parse(siralamaRaw) : [];
    if (Array.isArray(parsed)) {
      siralama = parsed.filter(
        (t): t is SiraOge =>
          !!t &&
          ((t.tur === "mevcut" &&
            typeof t.yol === "string" &&
            mevcutUrun.fotograflar.includes(t.yol)) ||
            (t.tur === "yeni" &&
              Number.isInteger(t.index) &&
              t.index >= 0 &&
              t.index < yeniDosyalar.length)),
      );
    }
  } catch {
    // gecersiz JSON -> bos say; asagidaki sayim kontrolu yakalar.
  }

  if (siralama.length < 1 || siralama.length > MAX_FOTOGRAF) {
    return NextResponse.json(
      { hata: `en az 1, en fazla ${MAX_FOTOGRAF} fotograf olmali` },
      { status: 400 },
    );
  }

  const kategori = await prisma.kategori.findUnique({ where: { id: kategoriId } });
  if (!kategori) {
    return NextResponse.json({ hata: "gecersiz kategori" }, { status: 400 });
  }

  // Yeni dosyalari bellekte oku + dogrula (magic number), istemcinin
  // Content-Type beyanina guvenilmez.
  const okunanDosyalar: { buffer: Buffer; uzanti: string }[] = [];
  for (const dosya of yeniDosyalar) {
    if (!IZINLI_TIPLER[dosya.type]) {
      return NextResponse.json(
        { hata: `desteklenmeyen dosya turu: ${dosya.type || "bilinmiyor"}` },
        { status: 400 },
      );
    }
    if (dosya.size > MAX_BOYUT_BYTE) {
      return NextResponse.json({ hata: "her fotograf en fazla 5MB olabilir" }, { status: 400 });
    }
    const buffer = Buffer.from(await dosya.arrayBuffer());
    if (!gercekDosyaTuruDogrula(buffer, dosya.type)) {
      return NextResponse.json(
        { hata: "dosya icerigi beyan edilen turle eslesmiyor" },
        { status: 400 },
      );
    }
    okunanDosyalar.push({ buffer, uzanti: IZINLI_TIPLER[dosya.type] });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const yazilanYollar: string[] = [];
  for (const { buffer, uzanti } of okunanDosyalar) {
    const dosyaAdi = `${randomUUID()}.${uzanti}`;
    await writeFile(path.join(UPLOAD_DIR, dosyaAdi), buffer);
    yazilanYollar.push(`/uploads/urunler/${dosyaAdi}`);
  }

  // Nihai dizi: siralama sirasinda "mevcut" yollar + "yeni" yazilan yollar (index
  // hizali; yazilanYollar, yeniDosyalar ile ayni sirada). Kapak = [0].
  const yeniFotograflar = siralama.map((t) =>
    t.tur === "mevcut" ? t.yol : yazilanYollar[t.index],
  );
  const kaldirilanFotograflar = mevcutUrun.fotograflar.filter((f) => !yeniFotograflar.includes(f));
  // Bu istekte yazilip nihai diziye girmeyen (siralamada gecmeyen) dosyalar yetim
  // kalmasin.
  const kullanilmayanYeni = yazilanYollar.filter((y) => !yeniFotograflar.includes(y));

  try {
    // Ayni kilit stratejisi (urun satirinda FOR UPDATE) rezervasyon motoruyla
    // paylasilir: stok dogrulamasi + guncelleme ayni kilit altinda, es zamanli
    // bir rezervasyon olusturma/sonuclandirma ile yarisa girmez.
    const sonuc = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Urun" WHERE "id" = ${id} FOR UPDATE`;

        // INVARIANT (docs/mimari/rezervasyon-motoru.md): aktif <= stok - satildi.
        // Stok dusurulurken bu hep korunmali, yoksa mevcut aktif hak sahipleri
        // fazla-satis durumuna duser.
        const aktifSayisi = await tx.rezervasyon.count({
          where: { urunId: id, durum: "bekliyor", tip: "aktif" },
        });
        const satildiSayisi = await tx.rezervasyon.count({
          where: { urunId: id, durum: "satildi" },
        });
        const minStok = aktifSayisi + satildiSayisi;
        if (stokAdedi < minStok) {
          return { tur: "stok-yetersiz" as const, minStok };
        }

        await tx.urun.update({
          where: { id },
          data: {
            kategoriId,
            baslik,
            aciklama,
            fiyat: fiyatStr,
            stokAdedi,
            fotograflar: yeniFotograflar,
          },
        });
        return { tur: "guncellendi" as const };
      },
      { maxWait: 5000, timeout: 15000 },
    );

    if (sonuc.tur === "stok-yetersiz") {
      // DB guncellenmedi; diske yazilmis yeni fotograflari yetim birakma.
      await Promise.all(
        yazilanYollar.map((yol) =>
          unlink(path.join(process.cwd(), "public", yol)).catch(() => undefined),
        ),
      );
      return NextResponse.json(
        {
          hata: `stok, ${sonuc.minStok} bekleyen/satılmış hak sahibinin altına düşürülemez`,
          minStok: sonuc.minStok,
        },
        { status: 409 },
      );
    }

    // Basarili guncelleme sonrasi artik kullanilmayan eski fotolari + siralamada
    // yer almayan yeni yazilan dosyalari sil.
    await Promise.all(
      [...kaldirilanFotograflar, ...kullanilmayanYeni].map((yol) =>
        unlink(path.join(process.cwd(), "public", yol)).catch(() => undefined),
      ),
    );

    return NextResponse.json({ id, fotograflar: yeniFotograflar });
  } catch (err) {
    await Promise.all(
      yazilanYollar.map((yol) =>
        unlink(path.join(process.cwd(), "public", yol)).catch(() => undefined),
      ),
    );
    throw err;
  }
}
