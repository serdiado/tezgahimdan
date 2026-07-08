import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PackagePlus, ExternalLink } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../../AdminNav";
import { MagazaGizleButonu } from "./MagazaGizleButonu";
import { UrunGeriGetirButonu } from "./UrunGeriGetirButonu";

const URUN_DURUM_ETIKETI: Record<string, string> = {
  sergide: "Sergide",
  doldu: "Doldu",
  satildi: "Satıldı",
};

// Record<string,string> DEGIL: anahtarlar rezervasyonHaritasi'nin (Prisma
// RezervasyonDurumu) turuyle esleşmeli, yoksa .get(durum) tsc'de tip hatasi
// verir - pnpm lint bunu yakalamiyor (bkz. feedback notu), sadece `tsc
// --noEmit` yakaladi.
const REZERVASYON_DURUM_ETIKETI: Record<"bekliyor" | "satildi" | "gelmedi" | "iptal", string> = {
  bekliyor: "Bekliyor",
  satildi: "Satıldı",
  gelmedi: "Gelmedi",
  iptal: "İptal",
};

const SIKAYET_DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  bekliyor: { etiket: "Bekliyor", className: "bg-amber-100 text-amber-700" },
  inceleniyor: { etiket: "İnceleniyor", className: "bg-blue-100 text-blue-700" },
  cozuldu: { etiket: "Çözüldü", className: "bg-green-100 text-green-700" },
  reddedildi: { etiket: "Reddedildi", className: "bg-neutral-200 text-neutral-600" },
};

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminMagazaDetayPage({ params }: { params: Promise<{ id: string }> }) {
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
    const magaza = await prisma.magaza.findUnique({
      where: { id },
      include: {
        sahip: { select: { id: true, ad: true } },
        pazar: { select: { ad: true } },
        urunler: {
          select: { id: true, baslik: true, fiyat: true, stokAdedi: true, durum: true, silindiMi: true, createdAt: true, kategori: { select: { ad: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!magaza) {
      notFound();
    }

    const [rezervasyonOzeti, degerlendirmeOzeti, sikayetler] = await Promise.all([
      prisma.rezervasyon.groupBy({
        by: ["durum"],
        where: { urun: { magazaId: id } },
        _count: true,
      }),
      prisma.magazaDegerlendirme.aggregate({
        where: { magazaId: id, gizliMi: false },
        _avg: { puan: true },
        _count: true,
      }),
      prisma.sikayet.findMany({
        where: { OR: [{ hedefMagazaId: id }, { hedefUrun: { magazaId: id } }] },
        select: {
          id: true,
          sebep: true,
          durum: true,
          createdAt: true,
          sikayetci: { select: { ad: true } },
          hedefUrun: { select: { baslik: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const rezervasyonHaritasi = new Map(rezervasyonOzeti.map((r) => [r.durum, r._count]));

    icerik = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-neutral-900">{magaza.ad}</h1>
          {magaza.silindiMi && (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-600">
              Silinmiş
            </span>
          )}
          {magaza.gizliMi && !magaza.silindiMi && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Gizli</span>
          )}
        </div>
        <AdminNav aktif="magazalar" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href="/admin/magazalar" className="text-sm text-primary-600 hover:underline">
            ← Mağazalara dön
          </Link>
          <Link
            href={`/magaza/${magaza.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            Vitrini Gör
          </Link>
          {!magaza.silindiMi && (
            <Link
              href={`/admin/magazalar/${magaza.id}/urun-ekle`}
              className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
            >
              <PackagePlus className="h-3.5 w-3.5" strokeWidth={2} />
              Ürün Ekle
            </Link>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Mağaza Bilgileri</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Sahip</dt>
                <dd>
                  <Link href={`/admin/kullanicilar/${magaza.sahip.id}`} className="text-primary-600 hover:underline">
                    {magaza.sahip.ad}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Pazar</dt>
                <dd className="text-neutral-800">{magaza.pazar.ad}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">WhatsApp</dt>
                <dd className="text-neutral-800">{magaza.whatsappNo ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Tezgah Bilgisi</dt>
                <dd className="text-neutral-800">{magaza.tezgahBilgisi ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Açılış Tarihi</dt>
                <dd className="text-neutral-800">{tarihFormat.format(magaza.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Değerlendirme</dt>
                <dd className="text-neutral-800">
                  {degerlendirmeOzeti._count > 0
                    ? `★ ${(degerlendirmeOzeti._avg.puan ?? 0).toFixed(1)} (${degerlendirmeOzeti._count})`
                    : "Henüz yok"}
                </dd>
              </div>
            </dl>
            {!magaza.silindiMi && (
              <div className="mt-3">
                <MagazaGizleButonu magazaId={magaza.id} gizliMi={magaza.gizliMi} />
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">Rezervasyon Özeti</h2>
              <Link href={`/admin/rezervasyonlar?magazaId=${magaza.id}`} className="text-xs font-semibold text-primary-600 hover:underline">
                Tümünü Gör
              </Link>
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              {(
                Object.entries(REZERVASYON_DURUM_ETIKETI) as ["bekliyor" | "satildi" | "gelmedi" | "iptal", string][]
              ).map(([durum, etiket]) => (
                <div key={durum} className="flex justify-between gap-4">
                  <dt className="text-neutral-500">{etiket}</dt>
                  <dd className="text-neutral-800">{rezervasyonHaritasi.get(durum) ?? 0}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Ürünler ({magaza.urunler.length})</h2>
          {magaza.urunler.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">Bu mağazada henüz ürün yok.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-500">
                    <th className="px-2 py-1.5 font-medium">Ürün</th>
                    <th className="px-2 py-1.5 font-medium">Kategori</th>
                    <th className="px-2 py-1.5 font-medium">Fiyat</th>
                    <th className="px-2 py-1.5 font-medium">Stok</th>
                    <th className="px-2 py-1.5 font-medium">Durum</th>
                    <th className="px-2 py-1.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {magaza.urunler.map((u) => (
                    <tr key={u.id} className="border-b border-neutral-50 last:border-0">
                      <td className="px-2 py-1.5">
                        {u.silindiMi ? (
                          <span className="font-medium text-neutral-500">{u.baslik}</span>
                        ) : (
                          <Link
                            href={`/admin/magazalar/${magaza.id}/urun-duzenle/${u.id}`}
                            className="font-medium text-primary-600 hover:underline"
                          >
                            {u.baslik}
                          </Link>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-neutral-600">{u.kategori.ad}</td>
                      <td className="px-2 py-1.5 text-neutral-600">{u.fiyat.toString()} ₺</td>
                      <td className="px-2 py-1.5 text-neutral-600">{u.stokAdedi}</td>
                      <td className="px-2 py-1.5">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {u.silindiMi ? "Kaldırıldı" : URUN_DURUM_ETIKETI[u.durum]}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        {u.silindiMi && <UrunGeriGetirButonu urunId={u.id} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Şikayet Geçmişi ({sikayetler.length})</h2>
          {sikayetler.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">Bu mağazaya/ürünlerine yönelik şikayet yok.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {sikayetler.map((s) => {
                const stil = SIKAYET_DURUM_STIL[s.durum] ?? { etiket: s.durum, className: "bg-neutral-200 text-neutral-600" };
                return (
                  <li key={s.id} className="border-b border-neutral-50 pb-2 last:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-400">
                        {s.hedefUrun ? s.hedefUrun.baslik : "Mağaza"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stil.className}`}>
                        {stil.etiket}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {s.sikayetci.ad} · {tarihFormat.format(s.createdAt)}
                    </p>
                    <p className="mt-1 text-neutral-700">{s.sebep}</p>
                  </li>
                );
              })}
            </ul>
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
