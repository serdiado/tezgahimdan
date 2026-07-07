import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";

const ROLLER = ["satici", "alici", "admin"] as const;
const ROL_ETIKETI: Record<(typeof ROLLER)[number], string> = {
  satici: "Satıcı",
  alici: "Alıcı",
  admin: "Admin",
};
const SAYFA_BOYU = 50;

export default async function AdminKullanicilarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rol?: string; sayfa?: string }>;
}) {
  const { q, rol, sayfa } = await searchParams;
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
    const gecerliRol = rol && (ROLLER as readonly string[]).includes(rol) ? (rol as (typeof ROLLER)[number]) : undefined;
    const arama = q?.trim();
    const sayfaNo = Math.max(1, Number(sayfa) || 1);
    const skip = (sayfaNo - 1) * SAYFA_BOYU;

    const where = {
      ...(gecerliRol ? { rol: gecerliRol } : {}),
      ...(arama
        ? {
            OR: [
              { ad: { contains: arama, mode: "insensitive" as const } },
              { telefon: { contains: arama, mode: "insensitive" as const } },
              { email: { contains: arama, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const kullanicilar = await prisma.kullanici.findMany({
      where,
      include: {
        _count: { select: { magazalar: true, rezervasyonlar: true, sikayetler: true } },
      },
      orderBy: { createdAt: "desc" },
      take: SAYFA_BOYU,
      skip,
    });

    const filtreLink = (yeniRol?: string) => {
      const params = new URLSearchParams();
      if (yeniRol) params.set("rol", yeniRol);
      if (arama) params.set("q", arama);
      const qs = params.toString();
      return `/admin/kullanicilar${qs ? `?${qs}` : ""}`;
    };
    const sayfaLink = (yeniSayfa: number) => {
      const params = new URLSearchParams();
      if (gecerliRol) params.set("rol", gecerliRol);
      if (arama) params.set("q", arama);
      if (yeniSayfa > 1) params.set("sayfa", String(yeniSayfa));
      const qs = params.toString();
      return `/admin/kullanicilar${qs ? `?${qs}` : ""}`;
    };
    const linkSinif = (aktifMi: boolean) =>
      aktifMi ? "text-primary-600 underline" : "text-neutral-500 hover:text-primary-600";

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Kullanıcılar</h1>
        <AdminNav aktif="kullanicilar" />

        <form method="get" className="mt-3 flex gap-2">
          {gecerliRol && <input type="hidden" name="rol" value={gecerliRol} />}
          <input
            type="text"
            name="q"
            defaultValue={arama}
            placeholder="Ad, telefon veya e-posta ara"
            className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            Ara
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link href={filtreLink()} className={linkSinif(!gecerliRol)}>
            Tümü
          </Link>
          {ROLLER.map((r) => (
            <span key={r} className="flex items-center gap-2">
              <span className="text-neutral-300">·</span>
              <Link href={filtreLink(r)} className={linkSinif(gecerliRol === r)}>
                {ROL_ETIKETI[r]}
              </Link>
            </span>
          ))}
        </div>

        {kullanicilar.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <Users className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Bu filtrede kullanıcı yok.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500">
                  <th className="px-4 py-2 font-medium">Ad</th>
                  <th className="px-4 py-2 font-medium">İletişim</th>
                  <th className="px-4 py-2 font-medium">Rol</th>
                  <th className="px-4 py-2 font-medium">Mağaza</th>
                  <th className="px-4 py-2 font-medium">Rezervasyon</th>
                  <th className="px-4 py-2 font-medium">Şikayet</th>
                  <th className="px-4 py-2 font-medium">Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {kullanicilar.map((k) => (
                  <tr key={k.id} className="border-b border-neutral-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2">
                      <Link href={`/admin/kullanicilar/${k.id}`} className="font-medium text-primary-600 hover:underline">
                        {k.ad}
                      </Link>
                      {k.yasakliMi && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Yasaklı
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-neutral-600">{k.telefon ?? k.email ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {ROL_ETIKETI[k.rol]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-neutral-600">{k._count.magazalar}</td>
                    <td className="px-4 py-2 text-neutral-600">{k._count.rezervasyonlar}</td>
                    <td className="px-4 py-2 text-neutral-600">{k._count.sikayetler}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                      {k.createdAt.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-sm">
          {sayfaNo > 1 ? (
            <Link href={sayfaLink(sayfaNo - 1)} className="text-primary-600 hover:underline">
              ← Önceki
            </Link>
          ) : (
            <span />
          )}
          {kullanicilar.length === SAYFA_BOYU && (
            <Link href={sayfaLink(sayfaNo + 1)} className="text-primary-600 hover:underline">
              Sonraki →
            </Link>
          )}
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
