import Link from "next/link";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { DegerlendirmeKartAdmin, type DegerlendirmeAdminVeri } from "./DegerlendirmeKartAdmin";

const SAYFA_BOYU = 50;
const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminDegerlendirmelerPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; sayfa?: string }>;
}) {
  const { tur, sayfa } = await searchParams;
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
    const gecerliTur = tur === "magaza" ? "magaza" : "urun";
    const sayfaNo = Math.max(1, Number(sayfa) || 1);
    const skip = (sayfaNo - 1) * SAYFA_BOYU;

    let degerlendirmeler: DegerlendirmeAdminVeri[];
    if (gecerliTur === "magaza") {
      const satirlar = await prisma.magazaDegerlendirme.findMany({
        include: {
          kullanici: { select: { ad: true } },
          magaza: { select: { ad: true } },
        },
        orderBy: { createdAt: "desc" },
        take: SAYFA_BOYU,
        skip,
      });
      degerlendirmeler = satirlar.map((s) => ({
        id: s.id,
        tur: "magaza" as const,
        kullaniciAd: s.kullanici.ad,
        hedefEtiket: s.magaza.ad,
        puan: s.puan,
        yorum: s.yorum,
        gizliMi: s.gizliMi,
        tarih: tarihFormat.format(s.createdAt),
      }));
    } else {
      const satirlar = await prisma.degerlendirme.findMany({
        include: {
          kullanici: { select: { ad: true } },
          urun: { select: { baslik: true, magaza: { select: { ad: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: SAYFA_BOYU,
        skip,
      });
      degerlendirmeler = satirlar.map((s) => ({
        id: s.id,
        tur: "urun" as const,
        kullaniciAd: s.kullanici.ad,
        hedefEtiket: `${s.urun.baslik} · ${s.urun.magaza.ad}`,
        puan: s.puan,
        yorum: s.yorum,
        gizliMi: s.gizliMi,
        tarih: tarihFormat.format(s.createdAt),
      }));
    }

    const filtreLink = (yeniTur: "urun" | "magaza") => `/admin/degerlendirmeler?tur=${yeniTur}`;
    const sayfaLink = (yeniSayfa: number) => {
      const params = new URLSearchParams();
      params.set("tur", gecerliTur);
      if (yeniSayfa > 1) params.set("sayfa", String(yeniSayfa));
      return `/admin/degerlendirmeler?${params.toString()}`;
    };
    const linkSinif = (aktifMi: boolean) =>
      aktifMi ? "text-primary-600 underline" : "text-neutral-500 hover:text-primary-600";

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Değerlendirmeler</h1>
        <AdminNav aktif="degerlendirmeler" />

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link href={filtreLink("urun")} className={linkSinif(gecerliTur === "urun")}>
            Ürün Yorumları
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("magaza")} className={linkSinif(gecerliTur === "magaza")}>
            Tezgah Yorumları
          </Link>
        </div>

        {degerlendirmeler.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <Star className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Bu filtrede değerlendirme yok.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {degerlendirmeler.map((d) => (
              <DegerlendirmeKartAdmin key={d.id} degerlendirme={d} />
            ))}
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
          {degerlendirmeler.length === SAYFA_BOYU && (
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
