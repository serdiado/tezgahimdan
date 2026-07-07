"use server";

import { revalidatePath } from "next/cache";

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
