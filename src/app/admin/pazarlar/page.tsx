import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { PazarKartAdmin } from "./PazarKartAdmin";

export default async function AdminPazarlarPage() {
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
    const pazarlar = await prisma.pazar.findMany({
      include: { _count: { select: { magazalar: true } } },
      orderBy: { createdAt: "asc" },
    });

    icerik = (
      <>
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-neutral-900">Pazarlar</h1>
          <Link
            href="/admin/pazarlar/yeni"
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            + Yeni Pazar
          </Link>
        </div>
        <AdminNav aktif="pazarlar" />

        {pazarlar.length === 0 ? (
          <p className="mt-4 text-neutral-600">Henüz pazar yok.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {pazarlar.map((p) => (
              <PazarKartAdmin
                key={p.id}
                pazar={{
                  id: p.id,
                  ad: p.ad,
                  bolge: p.bolge,
                  baslangicGunu: p.baslangicGunu,
                  baslangicSaati: p.baslangicSaati.toISOString(),
                  sifirlamaGunu: p.sifirlamaGunu,
                  sifirlamaSaati: p.sifirlamaSaati.toISOString(),
                  saatDilimi: p.saatDilimi,
                  aktifMi: p.aktifMi,
                  magazaSayisi: p._count.magazalar,
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
