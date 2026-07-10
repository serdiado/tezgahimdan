"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// page.tsx zaten bildirimleri okundu=true yapiyor (render sirasinda, ekstra
// bir sey gerekmiyor) - AMA bu, Next.js'in Router Cache'indeki DIGER
// sayfalarin (SiteHeader rozetini iceren) onbellegini gecersiz kilmiyor,
// kullanici bildirim rozetini sifirlanmis gormek icin F5/sert yenileme
// yapmak zorunda kaliyordu. revalidatePath render SIRASINDA cagrilamaz
// (Next.js kurali), bu yuzden client tarafindan (mount'ta) tetiklenen ayri
// bir Server Action olarak tutuluyor.
export async function bildirimRozetiTazele() {
  revalidatePath("/", "layout");
}

// Tek bir bildirimi listeden kaldirir (soft-delete: silindiMi=true). Sahiplik
// WHERE kosuluyla zorlanir (kullaniciId = session) - baskasinin bildirimini
// silmek imkansiz, ayri bir "bulunamadi" sizintisi da yok (updateMany 0 satir
// gunceller). Kalici silme YOK (proje ilkesi), kayit DB'de durur.
export async function bildirimSil(bildirimId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.bildirim.updateMany({
    where: { id: bildirimId, kullaniciId: session.user.id },
    data: { silindiMi: true },
  });
  // Liste + SiteHeader rozeti (okunmamis + silinmemis sayar) tazelensin.
  revalidatePath("/", "layout");
}

// Kullanicinin TUM (silinmemis) bildirimlerini listeden kaldirir.
export async function bildirimleriTemizle() {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.bildirim.updateMany({
    where: { kullaniciId: session.user.id, silindiMi: false },
    data: { silindiMi: true },
  });
  revalidatePath("/", "layout");
}
