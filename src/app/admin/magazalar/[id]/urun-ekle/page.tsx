import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../../../AdminNav";
import { AdminUrunEkleForm } from "./AdminUrunEkleForm";

export default async function AdminMagazaUrunEklePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, yetkili } = await getAdminSession();
  if (!session) {
    redirect("/giris");
  }

  let icerik;
  if (!yetkili) {
    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
        <p className="mt-1 text-neutral-600">Bu sayfaya sadece yönetici hesapları erişebilir.</p>
      </>
    );
  } else {
    // silindiMi kontrolu yok: silinmis bir magazaya urun eklemek anlamsiz olsa
    // da bu route zaten sadece admin'e acik, kaza sonucu bir islem degil.
    const magaza = await prisma.magaza.findUnique({ where: { id } });
    if (!magaza) {
      notFound();
    }

    const kategoriler = await prisma.kategori.findMany({
      where: { silindiMi: false },
      orderBy: [{ sira: "asc" }, { ad: "asc" }],
    });

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Ürün Ekle — {magaza.ad}</h1>
        <AdminNav aktif="magazalar" />
        <p className="mt-3 text-sm text-neutral-600">
          Bu ürün, satıcının kendi eklediği ürünler gibi doğrudan{" "}
          <span className="font-semibold">{magaza.ad}</span> tezgahında görünecek.
        </p>
        <div className="mt-4 max-w-2xl">
          <AdminUrunEkleForm
            magazaId={magaza.id}
            magazaAd={magaza.ad}
            kategoriler={kategoriler.map((k) => ({ id: k.id, ad: k.ad }))}
          />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{icerik}</main>
    </div>
  );
}
