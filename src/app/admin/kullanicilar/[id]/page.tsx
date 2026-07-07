import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { platformAyarlariGetir } from "@/lib/platform-ayarlari";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../../AdminNav";
import { KullaniciYasaklaButonu } from "./KullaniciYasaklaButonu";
import { GuvenilirlikSifirlaButonu } from "../../guvenilirlik/GuvenilirlikSifirlaButonu";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

const ROL_ETIKETI: Record<string, string> = {
  satici: "Satıcı",
  alici: "Alıcı",
  admin: "Admin",
};

export default async function AdminKullaniciDetayPage({ params }: { params: Promise<{ id: string }> }) {
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
    const kullanici = await prisma.kullanici.findUnique({
      where: { id },
      include: {
        magazalar: { select: { id: true, ad: true, slug: true, gizliMi: true, silindiMi: true } },
        _count: {
          select: {
            rezervasyonlar: true,
            sikayetler: true,
            degerlendirmeler: true,
            magazaDegerlendirmeleri: true,
            urunFavorileri: true,
            magazaTakipleri: true,
          },
        },
      },
    });
    if (!kullanici) {
      notFound();
    }

    // rezervasyonOlustur (src/lib/rezervasyon.ts) ile AYNI sayim mantigi -
    // varsa sifirlama tarihinden SONRAKI gelmedi kayitlari.
    const [gelmediSayisi, ayarlar] = await Promise.all([
      prisma.rezervasyon.count({
        where: {
          aliciId: kullanici.id,
          durum: "gelmedi",
          ...(kullanici.guvenilirlikSifirlamaTarihi ? { createdAt: { gt: kullanici.guvenilirlikSifirlamaTarihi } } : {}),
        },
      }),
      platformAyarlariGetir(),
    ]);

    icerik = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-neutral-900">{kullanici.ad}</h1>
          {kullanici.yasakliMi && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Yasaklı</span>
          )}
        </div>
        <AdminNav aktif="kullanicilar" />
        <Link href="/admin/kullanicilar" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
          ← Kullanıcılara dön
        </Link>

        <div className="mt-4">
          <KullaniciYasaklaButonu kullaniciId={kullanici.id} yasakliMi={kullanici.yasakliMi} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Profil</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Rol</dt>
                <dd className="font-medium text-neutral-800">{ROL_ETIKETI[kullanici.rol] ?? kullanici.rol}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Telefon</dt>
                <dd className="text-neutral-800">{kullanici.telefon ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">E-posta</dt>
                <dd className="text-neutral-800">{kullanici.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Giriş yöntemi</dt>
                <dd className="text-neutral-800">{kullanici.sifreHash ? "E-posta/şifre" : "Google"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Kayıt tarihi</dt>
                <dd className="text-neutral-800">
                  {kullanici.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Aktivite</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Rezervasyon</dt>
                <dd className="text-neutral-800">{kullanici._count.rezervasyonlar}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">
                  Gelmedi (güvenilirlik){gelmediSayisi >= ayarlar.guvenilirlikEsigi && " ⚠️"}
                </dt>
                <dd className="text-neutral-800">
                  {gelmediSayisi}
                  {kullanici.guvenilirlikSifirlamaTarihi &&
                    ` (${tarihFormat.format(kullanici.guvenilirlikSifirlamaTarihi)}'ten beri)`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Şikayet (gönderdiği)</dt>
                <dd className="text-neutral-800">{kullanici._count.sikayetler}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Ürün değerlendirmesi</dt>
                <dd className="text-neutral-800">{kullanici._count.degerlendirmeler}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Mağaza değerlendirmesi</dt>
                <dd className="text-neutral-800">{kullanici._count.magazaDegerlendirmeleri}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Favori/takip ettiği ürün</dt>
                <dd className="text-neutral-800">{kullanici._count.urunFavorileri}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Takip ettiği mağaza</dt>
                <dd className="text-neutral-800">{kullanici._count.magazaTakipleri}</dd>
              </div>
            </dl>
            {gelmediSayisi > 0 && (
              <div className="mt-3">
                <GuvenilirlikSifirlaButonu kullaniciId={kullanici.id} />
              </div>
            )}
          </div>
        </div>

        {kullanici.magazalar.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Mağazaları</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {kullanici.magazalar.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <Link href={`/magaza/${m.slug}`} className="text-primary-600 hover:underline">
                    {m.ad}
                  </Link>
                  <span className="flex gap-1">
                    {m.silindiMi && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">Silinmiş</span>
                    )}
                    {m.gizliMi && !m.silindiMi && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Gizli</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
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
