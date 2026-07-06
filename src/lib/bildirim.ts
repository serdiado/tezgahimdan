import { prisma } from "@/lib/prisma";

// Rezervasyon motoruna (rezervasyon.ts) HIC import edilmez - motor cagrisi
// basariyla dondukten SONRA (kilit/transaction disinda), API route katmanindan
// cagrilir. Boylece motorun kritik-bolge (FOR UPDATE) suresi uzamaz.
export async function bildirimGonderTakipcilere(params: {
  urunId: string;
  mesaj: string;
  haricKullaniciId: string;
}): Promise<void> {
  const takipciler = await prisma.urunFavori.findMany({
    where: { urunId: params.urunId, takipMi: true, kullaniciId: { not: params.haricKullaniciId } },
    select: { kullaniciId: true },
  });
  if (takipciler.length === 0) return;

  await prisma.bildirim.createMany({
    data: takipciler.map((t) => ({
      kullaniciId: t.kullaniciId,
      urunId: params.urunId,
      mesaj: params.mesaj,
    })),
  });
}
