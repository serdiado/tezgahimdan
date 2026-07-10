import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { gercekDosyaTuruDogrula } from "@/lib/dosya";
import { IZINLI_TIPLER, MAX_BOYUT_BYTE } from "@/lib/urun-sabitleri";

// Duyuru gorseli (tek alan: Duyuru.gorselUrl). pazar-gorsel.ts ile AYNI
// magic-number dogrulama + "once yeni yaz, DB guncelle, SONRA eskiyi sil"
// deseni; tek fark hedefin tek bir kolon (gorselUrl) olmasi - alan union'i
// gerekmiyor. Serveet: /uploads/[...dosyaYolu] route'unun IZINLI_ALT_DIZINLER
// listesine "duyuru" EKLENDI (aksi halde prod'da yeni dosya 404'e duserdi).
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "duyuru");

export type DuyuruGorselSonucu =
  | { tur: "kaydedildi"; deger: string }
  | { tur: "gecersiz-fotograf"; mesaj: string };

export async function duyuruGorselGuncelle(params: {
  duyuruId: string;
  dosya: File;
  eskiDeger: string | null;
}): Promise<DuyuruGorselSonucu> {
  if (!IZINLI_TIPLER[params.dosya.type]) {
    return {
      tur: "gecersiz-fotograf",
      mesaj: `desteklenmeyen dosya turu: ${params.dosya.type || "bilinmiyor"}`,
    };
  }
  if (params.dosya.size > MAX_BOYUT_BYTE) {
    return { tur: "gecersiz-fotograf", mesaj: "görsel en fazla 5MB olabilir" };
  }
  const buffer = Buffer.from(await params.dosya.arrayBuffer());
  if (!gercekDosyaTuruDogrula(buffer, params.dosya.type)) {
    return { tur: "gecersiz-fotograf", mesaj: "dosya içeriği beyan edilen türle eşleşmiyor" };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const uzanti = IZINLI_TIPLER[params.dosya.type];
  const dosyaAdi = `${randomUUID()}.${uzanti}`;
  await writeFile(path.join(UPLOAD_DIR, dosyaAdi), buffer);
  const yeniYol = `/uploads/duyuru/${dosyaAdi}`;

  try {
    await prisma.duyuru.update({ where: { id: params.duyuruId }, data: { gorselUrl: yeniYol } });
  } catch (err) {
    await unlink(path.join(UPLOAD_DIR, dosyaAdi)).catch(() => undefined);
    throw err;
  }

  if (params.eskiDeger) {
    await unlink(path.join(UPLOAD_DIR, path.basename(params.eskiDeger))).catch(() => undefined);
  }

  return { tur: "kaydedildi", deger: yeniYol };
}

export async function duyuruGorselKaldir(params: {
  duyuruId: string;
  mevcutDeger: string | null;
}): Promise<void> {
  await prisma.duyuru.update({ where: { id: params.duyuruId }, data: { gorselUrl: null } });
  if (params.mevcutDeger) {
    await unlink(path.join(UPLOAD_DIR, path.basename(params.mevcutDeger))).catch(() => undefined);
  }
}
