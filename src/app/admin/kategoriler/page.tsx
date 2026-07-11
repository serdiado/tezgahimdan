import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { KategoriEkleForm } from "./KategoriEkleForm";
import { KategoriKartAdmin } from "./KategoriKartAdmin";

export default async function AdminKategorilerPage({
  searchParams,
}: {
  searchParams: Promise<{ kaldirilanlar?: string }>;
}) {
  const { kaldirilanlar } = await searchParams;
  const kaldirilanlarGosteriliyor = kaldirilanlar === "1";
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
    // Kullanimda-mi kontrolu icin urun sayisi da cekilir - "kullanimdaysa
    // kaldirma engellenir" kuralinin liste tarafinda da (kaldir butonu
    // devre disi/uyarili) yansitilmasi icin.
    const kategoriler = await prisma.kategori.findMany({
      where: { silindiMi: kaldirilanlarGosteriliyor },
      include: { _count: { select: { urunler: true } } },
      orderBy: [{ sira: "asc" }, { ad: "asc" }],
    });

    icerik = (
      <>
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-neutral-900">Kategoriler</h1>
          <Link
            href={
              kaldirilanlarGosteriliyor
                ? "/admin/kategoriler"
                : "/admin/kategoriler?kaldirilanlar=1"
            }
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            {kaldirilanlarGosteriliyor ? "Aktif kategorilere dön" : "Kaldırılanlar"}
          </Link>
        </div>
        <AdminNav aktif="kategoriler" />

        {!kaldirilanlarGosteriliyor && <KategoriEkleForm />}

        {kategoriler.length === 0 ? (
          <p className="mt-4 text-neutral-600">
            {kaldirilanlarGosteriliyor ? "Kaldırılmış kategori yok." : "Henüz kategori yok."}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {kategoriler.map((k) => (
              <KategoriKartAdmin
                key={k.id}
                kategori={{
                  id: k.id,
                  ad: k.ad,
                  silindiMi: k.silindiMi,
                  urunSayisi: k._count.urunler,
                }}
              />
            ))}
          </div>
        )}
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
