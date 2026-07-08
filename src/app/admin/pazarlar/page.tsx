import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { PazarKartAdmin } from "./PazarKartAdmin";

export default async function AdminPazarlarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
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
    const arama = q?.trim();
    const pazarlar = await prisma.pazar.findMany({
      where: arama
        ? {
            OR: [
              { ad: { contains: arama, mode: "insensitive" } },
              { il: { contains: arama, mode: "insensitive" } },
              { ilce: { contains: arama, mode: "insensitive" } },
              { semt: { contains: arama, mode: "insensitive" } },
            ],
          }
        : {},
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

        <form method="get" className="mt-3 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={arama}
            placeholder="Pazar adı, il veya ilçe ara"
            className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            Ara
          </button>
          {arama && (
            <Link
              href="/admin/pazarlar"
              className="rounded-lg border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Temizle
            </Link>
          )}
        </form>

        {pazarlar.length === 0 ? (
          <p className="mt-4 text-neutral-600">{arama ? "Bu aramayla eşleşen pazar yok." : "Henüz pazar yok."}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {pazarlar.map((p) => (
              <PazarKartAdmin
                key={p.id}
                pazar={{
                  id: p.id,
                  ad: p.ad,
                  il: p.il,
                  ilce: p.ilce,
                  semt: p.semt,
                  googleHaritaLinki: p.googleHaritaLinki,
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
