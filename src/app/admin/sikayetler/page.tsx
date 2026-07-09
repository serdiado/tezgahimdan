import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquareWarning } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { SikayetKartAdmin } from "./SikayetKartAdmin";

const GECERLI_FILTRELER = ["bekliyor", "inceleniyor", "cozuldu", "reddedildi"] as const;

export default async function AdminSikayetlerPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const { durum } = await searchParams;
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
    // Varsayilan (durum parametresi yok/gecersiz): "bekliyor" - en acil olan.
    // "?durum=tumu" ile hepsi, digerleriyle tek bir durum filtrelenir.
    const tumuGosteriliyor = durum === "tumu";
    const gecerliDurum =
      durum && (GECERLI_FILTRELER as readonly string[]).includes(durum) ? durum : "bekliyor";
    const where = tumuGosteriliyor ? {} : { durum: gecerliDurum as (typeof GECERLI_FILTRELER)[number] };

    const sikayetler = await prisma.sikayet.findMany({
      where,
      include: {
        sikayetci: { select: { ad: true } },
        hedefMagaza: { select: { ad: true, slug: true } },
        hedefUrun: { select: { baslik: true, magaza: { select: { ad: true, slug: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtreLink = (f: string) => (f === "bekliyor" ? "/admin/sikayetler" : `/admin/sikayetler?durum=${f}`);
    const linkSinif = (aktifMi: boolean) =>
      aktifMi ? "text-primary-600 underline" : "text-neutral-500 hover:text-primary-600";

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Şikayetler</h1>
        <AdminNav aktif="sikayetler" />

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link href={filtreLink("bekliyor")} className={linkSinif(!tumuGosteriliyor && gecerliDurum === "bekliyor")}>
            Bekliyor
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("inceleniyor")} className={linkSinif(!tumuGosteriliyor && gecerliDurum === "inceleniyor")}>
            İnceleniyor
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("cozuldu")} className={linkSinif(!tumuGosteriliyor && gecerliDurum === "cozuldu")}>
            Çözüldü
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("reddedildi")} className={linkSinif(!tumuGosteriliyor && gecerliDurum === "reddedildi")}>
            Reddedildi
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href="/admin/sikayetler?durum=tumu" className={linkSinif(tumuGosteriliyor)}>
            Tümü
          </Link>
        </div>

        {sikayetler.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <MessageSquareWarning className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Bu filtrede şikayet yok.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {sikayetler.map((s) => {
              const hedefAdi = s.hedefMagaza?.ad ?? s.hedefUrun?.baslik ?? "(silinmiş)";
              const hedefLink = s.hedefMagaza
                ? `/magaza/${s.hedefMagaza.slug}`
                : s.hedefUrun
                  ? `/magaza/${s.hedefUrun.magaza.slug}?urun=${s.hedefUrunId}`
                  : null;
              const hedefTuruEtiketi = s.hedefMagaza ? "Tezgah" : "Ürün";
              return (
                <SikayetKartAdmin
                  key={s.id}
                  sikayet={{
                    id: s.id,
                    sikayetciAd: s.sikayetci.ad,
                    hedefTuruEtiketi,
                    hedefAdi,
                    hedefLink,
                    sebep: s.sebep,
                    durum: s.durum,
                    yanit: s.yanit,
                    olusturulmaTarihi: s.createdAt.toISOString(),
                  }}
                />
              );
            })}
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
