import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { gercekDosyaTuruDogrula } from "@/lib/dosya";
import { IZINLI_TIPLER, MAX_BOYUT_BYTE, MAX_FOTOGRAF } from "@/lib/urun-sabitleri";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "urunler");

export type UrunEkleSonucu =
  | { tur: "eklendi"; urun: { id: string; fotograflar: string[] } }
  | { tur: "gecersiz-kategori" }
  | { tur: "gecersiz-baslik" }
  | { tur: "gecersiz-fiyat" }
  | { tur: "gecersiz-stok" }
  | { tur: "gecersiz-fotograf"; mesaj: string };

// src/app/api/panel/urun-ekle/route.ts'ten cikarildi - hem satici kendi
// magazasina hem admin bir saticinin adina urun eklerken (magazaId farkli
// kaynaklardan gelir: oturum vs admin secimi) AYNI dogrulama/yukleme/olusturma
// mantigini kullansin diye. magazaAc()'teki "userId'yi disaridan al" deseninin
// urun tarafindaki esdegeri.
export async function urunEkle(params: {
  magazaId: string;
  kategoriId: string;
  baslik: string;
  aciklama?: string | null;
  fiyat: string;
  stokAdedi: number;
  dosyalar: File[];
}): Promise<UrunEkleSonucu> {
  const baslik = params.baslik.trim();
  if (!baslik || baslik.length > 200) return { tur: "gecersiz-baslik" };

  const fiyatSayisal = Number.parseFloat(params.fiyat);
  if (!params.fiyat || !Number.isFinite(fiyatSayisal) || fiyatSayisal <= 0) {
    return { tur: "gecersiz-fiyat" };
  }

  if (!Number.isInteger(params.stokAdedi) || params.stokAdedi < 1) {
    return { tur: "gecersiz-stok" };
  }

  if (params.dosyalar.length < 1 || params.dosyalar.length > MAX_FOTOGRAF) {
    return { tur: "gecersiz-fotograf", mesaj: `en az 1, en fazla ${MAX_FOTOGRAF} fotograf yuklenmeli` };
  }

  // Once tum dosyalari bellekte oku (bir kez), hem MIME/boyut kontrolu hem de
  // gercek bayt imzasi (magic number) dogrulamasi icin - istemcinin gonderdigi
  // Content-Type'a guvenmiyoruz, aksi halde sahte bir uzantiyla rastgele icerik
  // public/uploads altina yazilip sunulabilirdi.
  const okunanDosyalar: { buffer: Buffer; uzanti: string }[] = [];
  for (const dosya of params.dosyalar) {
    if (!IZINLI_TIPLER[dosya.type]) {
      return { tur: "gecersiz-fotograf", mesaj: `desteklenmeyen dosya turu: ${dosya.type || "bilinmiyor"}` };
    }
    if (dosya.size > MAX_BOYUT_BYTE) {
      return { tur: "gecersiz-fotograf", mesaj: "her fotograf en fazla 5MB olabilir" };
    }
    const buffer = Buffer.from(await dosya.arrayBuffer());
    if (!gercekDosyaTuruDogrula(buffer, dosya.type)) {
      return { tur: "gecersiz-fotograf", mesaj: "dosya icerigi beyan edilen turle eslesmiyor" };
    }
    okunanDosyalar.push({ buffer, uzanti: IZINLI_TIPLER[dosya.type] });
  }

  // silindiMi kontrolu: kategori tam bu istekle ayni anda kaldirilmis olabilir
  // (TOCTOU) - kalan milisaniyelik pencere kabul edilebilir (bkz. docs/MIMARI.md
  // "Bilinen kisitlar"), ama en azindan formda hic gorunmeyen bir kategoriyle
  // dogrudan API cagrisi net bir sonucla reddedilir.
  const kategori = await prisma.kategori.findUnique({ where: { id: params.kategoriId } });
  if (!kategori || kategori.silindiMi) return { tur: "gecersiz-kategori" };

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
        magazaId: params.magazaId,
        kategoriId: params.kategoriId,
        baslik,
        aciklama: params.aciklama?.trim() || null,
        fiyat: params.fiyat,
        stokAdedi: params.stokAdedi,
        fotograflar: yazilanYollar.map((ad) => `/uploads/urunler/${ad}`),
        durum: "sergide",
      },
    });
    return { tur: "eklendi", urun: { id: urun.id, fotograflar: urun.fotograflar } };
  } catch (err) {
    // urun.create basarisiz olursa (or. kategori bu istek sirasinda silindiyse)
    // diske yazilmis ama hicbir kayda baglanmamis dosyalari yetim birakmayalim.
    await Promise.all(
      yazilanYollar.map((ad) => unlink(path.join(UPLOAD_DIR, ad)).catch(() => undefined)),
    );
    throw err;
  }
}
