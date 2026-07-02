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

  // magazaId istemciden ASLA alinmaz - oturumdaki saticinin kendi magazasindan
  // turetilir, yoksa bir satici baskasinin magazasina urun ekleyebilirdi.
  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    return NextResponse.json({ hata: "once magaza olusturulmali" }, { status: 409 });
  }

  const formData = await request.formData();

  const kategoriId = formData.get("kategoriId");
  const baslik = typeof formData.get("baslik") === "string" ? (formData.get("baslik") as string).trim() : "";
  const aciklamaRaw = formData.get("aciklama");
  const aciklama = typeof aciklamaRaw === "string" && aciklamaRaw.trim() ? aciklamaRaw.trim() : null;
  const fiyatRaw = formData.get("fiyat");
  const stokRaw = formData.get("stokAdedi");
  const dosyalar = formData.getAll("fotograflar").filter((f): f is File => f instanceof File && f.size > 0);

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
  const stokAdedi = typeof stokRaw === "string" && stokRaw ? Number.parseInt(stokRaw, 10) : 1;
  if (!Number.isInteger(stokAdedi) || stokAdedi < 1) {
    return NextResponse.json({ hata: "stok adedi en az 1 olmali" }, { status: 400 });
  }
  if (dosyalar.length < 1 || dosyalar.length > MAX_FOTOGRAF) {
    return NextResponse.json(
      { hata: `en az 1, en fazla ${MAX_FOTOGRAF} fotograf yuklenmeli` },
      { status: 400 },
    );
  }

  // Once tum dosyalari bellekte oku (bir kez), hem MIME/boyut kontrolu hem de
  // gercek bayt imzasi (magic number) dogrulamasi icin - istemcinin gonderdigi
  // Content-Type'a guvenmiyoruz, aksi halde sahte bir uzantiyla rastgele icerik
  // public/uploads altina yazilip sunulabilirdi.
  const okunanDosyalar: { buffer: Buffer; uzanti: string }[] = [];
  for (const dosya of dosyalar) {
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

  const kategori = await prisma.kategori.findUnique({ where: { id: kategoriId } });
  if (!kategori) {
    return NextResponse.json({ hata: "gecersiz kategori" }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const yazilanYollar: string[] = [];
  for (const { buffer, uzanti } of okunanDosyalar) {
    // Orijinal dosya adina asla guvenilmez (path traversal riski); rastgele ad ureteriz.
    const dosyaAdi = `${randomUUID()}.${uzanti}`;
    await writeFile(path.join(UPLOAD_DIR, dosyaAdi), buffer);
    yazilanYollar.push(dosyaAdi);
  }

  try {
    const urun = await prisma.urun.create({
      data: {
        magazaId: magaza.id,
        kategoriId,
        baslik,
        aciklama,
        fiyat: fiyatStr,
        stokAdedi,
        fotograflar: yazilanYollar.map((ad) => `/uploads/urunler/${ad}`),
        durum: "sergide",
      },
    });
    return NextResponse.json({ id: urun.id, fotograflar: urun.fotograflar }, { status: 201 });
  } catch (err) {
    // urun.create basarisiz olursa (or. kategori bu istek sirasinda silindiyse)
    // diske yazilmis ama hicbir kayda baglanmamis dosyalari yetim birakmayalim.
    await Promise.all(
      yazilanYollar.map((ad) => unlink(path.join(UPLOAD_DIR, ad)).catch(() => undefined)),
    );
    throw err;
  }
}
