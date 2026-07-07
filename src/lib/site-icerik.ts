import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { gercekDosyaTuruDogrula } from "@/lib/dosya";
import { IZINLI_TIPLER, MAX_BOYUT_BYTE } from "@/lib/urun-sabitleri";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "site-icerik");

// PlatformAyarlari'nin aksine burada TEK bir singleton yerine cok sayida
// bagimsiz anahtar var (hero_baslik, hero_aciklama, ileride footer/SSS...) -
// find-or-create yerine "harita + cagiran taraf varsayilani uygular" deseni.
// Satir yoksa harita'da o anahtar hic yok demektir.
export async function siteIcerikHaritasiGetir(anahtarlar: string[]): Promise<Map<string, string>> {
  const harita = new Map<string, string>();
  if (anahtarlar.length === 0) return harita;
  const satirlar = await prisma.siteIcerik.findMany({ where: { anahtar: { in: anahtarlar } } });
  for (const s of satirlar) harita.set(s.anahtar, s.deger);
  return harita;
}

// Bos deger gelirse satir SILINIR (bos string DB'de tutmanin bir anlami yok,
// "ayarlanmamis" haritada "yok" ile ayni sekilde temsil edilir).
export async function siteIcerikGuncelle(anahtar: string, deger: string): Promise<void> {
  const temiz = deger.trim();
  if (!temiz) {
    await prisma.siteIcerik.deleteMany({ where: { anahtar } });
    return;
  }
  await prisma.siteIcerik.upsert({
    where: { anahtar },
    create: { anahtar, deger: temiz },
    update: { deger: temiz },
  });
}

export type SiteIcerikGorselSonucu =
  | { tur: "kaydedildi"; deger: string }
  | { tur: "gecersiz-fotograf"; mesaj: string };

// magazaKrokiGuncelle (lib/magaza-kroki.ts) ile AYNI magic-number dogrulama +
// "once yeni yaz, DB guncelle, SONRA eskiyi sil" deseni.
export async function siteIcerikGorselGuncelle(params: {
  anahtar: string;
  dosya: File;
  eskiDeger: string | null;
}): Promise<SiteIcerikGorselSonucu> {
  if (!IZINLI_TIPLER[params.dosya.type]) {
    return { tur: "gecersiz-fotograf", mesaj: `desteklenmeyen dosya turu: ${params.dosya.type || "bilinmiyor"}` };
  }
  if (params.dosya.size > MAX_BOYUT_BYTE) {
    return { tur: "gecersiz-fotograf", mesaj: "fotoğraf en fazla 5MB olabilir" };
  }
  const buffer = Buffer.from(await params.dosya.arrayBuffer());
  if (!gercekDosyaTuruDogrula(buffer, params.dosya.type)) {
    return { tur: "gecersiz-fotograf", mesaj: "dosya içeriği beyan edilen türle eşleşmiyor" };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const uzanti = IZINLI_TIPLER[params.dosya.type];
  const dosyaAdi = `${randomUUID()}.${uzanti}`;
  await writeFile(path.join(UPLOAD_DIR, dosyaAdi), buffer);
  const yeniYol = `/uploads/site-icerik/${dosyaAdi}`;

  try {
    await prisma.siteIcerik.upsert({
      where: { anahtar: params.anahtar },
      create: { anahtar: params.anahtar, deger: yeniYol },
      update: { deger: yeniYol },
    });
  } catch (err) {
    await unlink(path.join(UPLOAD_DIR, dosyaAdi)).catch(() => undefined);
    throw err;
  }

  if (params.eskiDeger) {
    const eskiDosyaAdi = path.basename(params.eskiDeger);
    await unlink(path.join(UPLOAD_DIR, eskiDosyaAdi)).catch(() => undefined);
  }

  return { tur: "kaydedildi", deger: yeniYol };
}

export async function siteIcerikGorselKaldir(params: { anahtar: string; mevcutDeger: string | null }): Promise<void> {
  await prisma.siteIcerik.deleteMany({ where: { anahtar: params.anahtar } });
  if (params.mevcutDeger) {
    const dosyaAdi = path.basename(params.mevcutDeger);
    await unlink(path.join(UPLOAD_DIR, dosyaAdi)).catch(() => undefined);
  }
}
