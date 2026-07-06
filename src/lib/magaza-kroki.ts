import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { gercekDosyaTuruDogrula } from "@/lib/dosya";
import { IZINLI_TIPLER, MAX_BOYUT_BYTE } from "@/lib/urun-sabitleri";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "magaza-kroki");

export type KrokiYukleSonucu =
  | { tur: "kaydedildi"; krokiFotoUrl: string }
  | { tur: "gecersiz-fotograf"; mesaj: string };

// urunEkle()'nin tek-fotograf sadelestirilmis hali - saticinin kendi magazasi
// icin yukledigi TEK fotograf (tezgah/kroki), admin-yonetimli ortak pazar
// haritasi DEGIL. Ayni magic-number dogrulama + fs yazma deseni.
export async function magazaKrokiGuncelle(params: {
  magazaId: string;
  dosya: File;
  eskiKrokiFotoUrl: string | null;
}): Promise<KrokiYukleSonucu> {
  if (!IZINLI_TIPLER[params.dosya.type]) {
    return { tur: "gecersiz-fotograf", mesaj: `desteklenmeyen dosya turu: ${params.dosya.type || "bilinmiyor"}` };
  }
  if (params.dosya.size > MAX_BOYUT_BYTE) {
    return { tur: "gecersiz-fotograf", mesaj: "fotograf en fazla 5MB olabilir" };
  }
  const buffer = Buffer.from(await params.dosya.arrayBuffer());
  if (!gercekDosyaTuruDogrula(buffer, params.dosya.type)) {
    return { tur: "gecersiz-fotograf", mesaj: "dosya icerigi beyan edilen turle eslesmiyor" };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Orijinal dosya adina asla guvenilmez (path traversal riski); rastgele ad ureteriz.
  const uzanti = IZINLI_TIPLER[params.dosya.type];
  const dosyaAdi = `${randomUUID()}.${uzanti}`;
  await writeFile(path.join(UPLOAD_DIR, dosyaAdi), buffer);
  const yeniYol = `/uploads/magaza-kroki/${dosyaAdi}`;

  try {
    await prisma.magaza.update({ where: { id: params.magazaId }, data: { krokiFotoUrl: yeniYol } });
  } catch (err) {
    await unlink(path.join(UPLOAD_DIR, dosyaAdi)).catch(() => undefined);
    throw err;
  }

  // ONCE yeni dosya yazilip DB guncellendi, SONRA eskisi silinir - yeni yazma
  // basarisiz olsaydi eski fotograf kaybolmayacakti.
  if (params.eskiKrokiFotoUrl) {
    const eskiDosyaAdi = path.basename(params.eskiKrokiFotoUrl);
    await unlink(path.join(UPLOAD_DIR, eskiDosyaAdi)).catch(() => undefined);
  }

  return { tur: "kaydedildi", krokiFotoUrl: yeniYol };
}

export async function magazaKrokiKaldir(params: { magazaId: string; mevcutKrokiFotoUrl: string | null }) {
  await prisma.magaza.update({ where: { id: params.magazaId }, data: { krokiFotoUrl: null } });
  if (params.mevcutKrokiFotoUrl) {
    const dosyaAdi = path.basename(params.mevcutKrokiFotoUrl);
    await unlink(path.join(UPLOAD_DIR, dosyaAdi)).catch(() => undefined);
  }
}
