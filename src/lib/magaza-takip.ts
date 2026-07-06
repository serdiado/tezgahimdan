import { prisma } from "@/lib/prisma";

// MagazaTakip: UrunFavori'den AYRI tablo (bkz. prisma/schema.prisma) - farkli
// varlik (Magaza), begeniMi karsiligi yok, tek bayrak. Tek kullanicinin kendi
// satiri oldugu icin kilide gerek yok (rezervasyon motorundaki gibi paylasilan
// kapasite yarisi yok).

export type MagazaTakipToggleSonucu = { takipMi: boolean };

export async function magazaTakipToggle(params: {
  kullaniciId: string;
  magazaId: string;
}): Promise<MagazaTakipToggleSonucu> {
  const mevcut = await prisma.magazaTakip.findUnique({
    where: { kullaniciId_magazaId: { kullaniciId: params.kullaniciId, magazaId: params.magazaId } },
  });
  const yeniDeger = !(mevcut?.takipMi ?? false);

  const guncel = await prisma.magazaTakip.upsert({
    where: { kullaniciId_magazaId: { kullaniciId: params.kullaniciId, magazaId: params.magazaId } },
    create: { kullaniciId: params.kullaniciId, magazaId: params.magazaId, takipMi: yeniDeger },
    update: { takipMi: yeniDeger },
  });

  return { takipMi: guncel.takipMi };
}

// Tekil magaza sayfasinda N+1 endisesi yok (tek magaza) - toplu Map yerine
// dogrudan findUnique yeterli.
export async function kullaniciMagazaTakipDurumu(
  kullaniciId: string | null | undefined,
  magazaId: string,
): Promise<boolean> {
  if (!kullaniciId) return false;
  const satir = await prisma.magazaTakip.findUnique({
    where: { kullaniciId_magazaId: { kullaniciId, magazaId } },
    select: { takipMi: true },
  });
  return satir?.takipMi ?? false;
}
