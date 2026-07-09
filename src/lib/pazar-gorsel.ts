import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { gercekDosyaTuruDogrula } from "@/lib/dosya";
import { IZINLI_TIPLER, MAX_BOYUT_BYTE } from "@/lib/urun-sabitleri";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "pazar");

// Pazar hero gorselleri: belediyeLogoUrl + kapakFotoUrl. siteIcerikGorselGuncelle
// (lib/site-icerik.ts) ile AYNI magic-number dogrulama + "once yeni yaz, DB
// guncelle, SONRA eskiyi sil" deseni - tek fark hedefin SiteIcerik anahtari
// degil Pazar kolonu olmasi. Alan adi union'la kisitli: API katmani rastgele
// kolon adi enjekte edemez.
export type PazarGorselAlani = "belediyeLogoUrl" | "kapakFotoUrl";

export type PazarGorselSonucu =
  | { tur: "kaydedildi"; deger: string }
  | { tur: "gecersiz-fotograf"; mesaj: string };

export async function pazarGorselGuncelle(params: {
  pazarId: string;
  alan: PazarGorselAlani;
  dosya: File;
  eskiDeger: string | null;
}): Promise<PazarGorselSonucu> {
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
  const yeniYol = `/uploads/pazar/${dosyaAdi}`;

  try {
    await prisma.pazar.update({
      where: { id: params.pazarId },
      data: { [params.alan]: yeniYol },
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

export async function pazarGorselKaldir(params: {
  pazarId: string;
  alan: PazarGorselAlani;
  mevcutDeger: string | null;
}): Promise<void> {
  await prisma.pazar.update({ where: { id: params.pazarId }, data: { [params.alan]: null } });
  if (params.mevcutDeger) {
    const dosyaAdi = path.basename(params.mevcutDeger);
    await unlink(path.join(UPLOAD_DIR, dosyaAdi)).catch(() => undefined);
  }
}
