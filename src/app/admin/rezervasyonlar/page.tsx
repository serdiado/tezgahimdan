import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";

const DURUMLAR = ["bekliyor", "satildi", "gelmedi", "iptal"] as const;
const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  bekliyor: { etiket: "Bekliyor", className: "bg-amber-100 text-amber-700" },
  satildi: { etiket: "Satıldı", className: "bg-green-100 text-green-700" },
  gelmedi: { etiket: "Gelmedi", className: "bg-red-100 text-red-700" },
  iptal: { etiket: "İptal", className: "bg-neutral-200 text-neutral-600" },
};
const SAYFA_BOYU = 50;

const tarihFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminRezervasyonlarPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; magazaId?: string; q?: string; sayfa?: string }>;
}) {
  const { durum, magazaId, q, sayfa } = await searchParams;
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
    const gecerliDurum = durum && (DURUMLAR as readonly string[]).includes(durum) ? (durum as (typeof DURUMLAR)[number]) : undefined;
    const arama = q?.trim();
    const sayfaNo = Math.max(1, Number(sayfa) || 1);
    const skip = (sayfaNo - 1) * SAYFA_BOYU;

    const where = {
      ...(gecerliDurum ? { durum: gecerliDurum } : {}),
      ...(magazaId ? { urun: { magazaId } } : {}),
      ...(arama
        ? {
            OR: [
              { rezervKodu: { contains: arama, mode: "insensitive" as const } },
              { alici: { ad: { contains: arama, mode: "insensitive" as const } } },
              { alici: { telefon: { contains: arama, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [rezervasyonlar, magazaAdi] = await Promise.all([
      prisma.rezervasyon.findMany({
        where,
        include: {
          alici: { select: { id: true, ad: true, telefon: true } },
          urun: { select: { baslik: true, magaza: { select: { ad: true, slug: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: SAYFA_BOYU,
        skip,
      }),
      magazaId ? prisma.magaza.findUnique({ where: { id: magazaId }, select: { ad: true } }) : null,
    ]);

    const filtreLink = (yeniDurum?: string) => {
      const params = new URLSearchParams();
      if (yeniDurum) params.set("durum", yeniDurum);
      if (magazaId) params.set("magazaId", magazaId);
      if (arama) params.set("q", arama);
      const qs = params.toString();
      return `/admin/rezervasyonlar${qs ? `?${qs}` : ""}`;
    };
    const sayfaLink = (yeniSayfa: number) => {
      const params = new URLSearchParams();
      if (gecerliDurum) params.set("durum", gecerliDurum);
      if (magazaId) params.set("magazaId", magazaId);
      if (arama) params.set("q", arama);
      if (yeniSayfa > 1) params.set("sayfa", String(yeniSayfa));
      const qs = params.toString();
      return `/admin/rezervasyonlar${qs ? `?${qs}` : ""}`;
    };
    const linkSinif = (aktifMi: boolean) =>
      aktifMi ? "text-primary-600 underline" : "text-neutral-500 hover:text-primary-600";
    const csvLink = (() => {
      const params = new URLSearchParams();
      if (gecerliDurum) params.set("durum", gecerliDurum);
      if (magazaId) params.set("magazaId", magazaId);
      if (arama) params.set("q", arama);
      return `/api/admin/rezervasyonlar-csv?${params.toString()}`;
    })();

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">
          Rezervasyonlar{magazaAdi ? ` — ${magazaAdi.ad}` : ""}
        </h1>
        <AdminNav aktif="rezervasyonlar" />

        {magazaId && (
          <Link href="/admin/rezervasyonlar" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
            × Mağaza filtresini kaldır
          </Link>
        )}

        <form method="get" className="mt-3 flex gap-2">
          {gecerliDurum && <input type="hidden" name="durum" value={gecerliDurum} />}
          {magazaId && <input type="hidden" name="magazaId" value={magazaId} />}
          <input
            type="text"
            name="q"
            defaultValue={arama}
            placeholder="Rezervasyon kodu, alıcı adı veya telefon ara"
            className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            Ara
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link href={filtreLink()} className={linkSinif(!gecerliDurum)}>
            Tümü
          </Link>
          {DURUMLAR.map((d) => (
            <span key={d} className="flex items-center gap-2">
              <span className="text-neutral-300">·</span>
              <Link href={filtreLink(d)} className={linkSinif(gecerliDurum === d)}>
                {DURUM_STIL[d].etiket}
              </Link>
            </span>
          ))}
          <span className="text-neutral-300">·</span>
          <a href={csvLink} className="text-neutral-500 hover:text-primary-600">
            CSV İndir
          </a>
        </div>

        {rezervasyonlar.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <ShoppingBag className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Bu filtrede rezervasyon yok.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500">
                  <th className="px-4 py-2 font-medium">Kod</th>
                  <th className="px-4 py-2 font-medium">Ürün / Mağaza</th>
                  <th className="px-4 py-2 font-medium">Alıcı</th>
                  <th className="px-4 py-2 font-medium">Tip</th>
                  <th className="px-4 py-2 font-medium">Sıra</th>
                  <th className="px-4 py-2 font-medium">Durum</th>
                  <th className="px-4 py-2 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {rezervasyonlar.map((r) => {
                  const stil = DURUM_STIL[r.durum];
                  return (
                    <tr key={r.id} className="border-b border-neutral-50 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-neutral-700">{r.rezervKodu}</td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Link href={`/magaza/${r.urun.magaza.slug}`} className="text-primary-600 hover:underline">
                          {r.urun.baslik}
                        </Link>
                        <span className="text-neutral-400"> · {r.urun.magaza.ad}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Link href={`/admin/kullanicilar/${r.alici.id}`} className="text-primary-600 hover:underline">
                          {r.alici.ad}
                        </Link>
                        <span className="text-neutral-400"> · {r.alici.telefon ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2 text-neutral-600">{r.tip === "aktif" ? "Aktif" : "Yedek"}</td>
                      <td className="px-4 py-2 text-neutral-600">{r.siraNo}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stil.className}`}>
                          {stil.etiket}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                        {tarihFormat.format(r.createdAt)}
                      </td>
                    </tr>
                  );
                })}
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
          {rezervasyonlar.length === SAYFA_BOYU && (
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
