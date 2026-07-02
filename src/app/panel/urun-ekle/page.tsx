import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { MagazaOlusturForm } from "./MagazaOlusturForm";
import { UrunEkleForm } from "./UrunEkleForm";

export default async function UrunEklePage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
  const { session, yetkili } = await getSaticiSession();

  if (!session) {
    redirect("/giris");
  }

  if (!yetkili) {
    return (
      <main>
        <h1>Yetkisiz Erişim</h1>
        <p>Bu sayfaya sadece satıcı hesapları erişebilir.</p>
      </main>
    );
  }

  const magaza = await getOwnMagaza(session.user.id);

  if (!magaza) {
    return (
      <main>
        <h1>Önce Mağazanı Oluştur</h1>
        {hata && <p style={{ color: "red" }}>{hata}</p>}
        <MagazaOlusturForm />
      </main>
    );
  }

  const kategoriler = await prisma.kategori.findMany({ orderBy: { ad: "asc" } });

  return (
    <main>
      <h1>Ürün Ekle — {magaza.ad}</h1>
      <UrunEkleForm kategoriler={kategoriler.map((k) => ({ id: k.id, ad: k.ad }))} />
    </main>
  );
}
