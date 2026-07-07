import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";

const VARLIK_TURLERI = ["Magaza", "Pazar", "Kategori", "Sikayet", "Urun", "Rezervasyon"] as const;
const SAYFA_BOYU = 50;

export default async function AdminDenetimKaydiPage({
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
    const gecerliTur =
      tur && (VARLIK_TURLERI as readonly string[]).includes(tur)
        ? (tur as (typeof VARLIK_TURLERI)[number])
        : undefined;
    const sayfaNo = Math.max(1, Number(sayfa) || 1);
    const skip = (sayfaNo - 1) * SAYFA_BOYU;

    const kayitlar = await prisma.durumGecmisi.findMany({
      where: gecerliTur ? { varlikTuru: gecerliTur } : {},
      include: { kullanici: { select: { ad: true } } },
      orderBy: { createdAt: "desc" },
      take: SAYFA_BOYU,
      skip,
    });

    const filtreLink = (yeniTur?: string) => (yeniTur ? `/admin/denetim-kaydi?tur=${yeniTur}` : "/admin/denetim-kaydi");
    const sayfaLink = (yeniSayfa: number) => {
      const params = new URLSearchParams();
      if (gecerliTur) params.set("tur", gecerliTur);
      if (yeniSayfa > 1) params.set("sayfa", String(yeniSayfa));
      const qs = params.toString();
      return `/admin/denetim-kaydi${qs ? `?${qs}` : ""}`;
    };
    const linkSinif = (aktifMi: boolean) =>
      aktifMi ? "text-primary-600 underline" : "text-neutral-500 hover:text-primary-600";

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Denetim Kaydı</h1>
        <AdminNav aktif="denetim-kaydi" />

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link href={filtreLink()} className={linkSinif(!gecerliTur)}>
            Tümü
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("Magaza")} className={linkSinif(gecerliTur === "Magaza")}>
            Mağaza
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("Pazar")} className={linkSinif(gecerliTur === "Pazar")}>
            Pazar
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("Kategori")} className={linkSinif(gecerliTur === "Kategori")}>
            Kategori
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("Sikayet")} className={linkSinif(gecerliTur === "Sikayet")}>
            Şikayet
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("Urun")} className={linkSinif(gecerliTur === "Urun")}>
            Ürün
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("Rezervasyon")} className={linkSinif(gecerliTur === "Rezervasyon")}>
            Rezervasyon
          </Link>
        </div>

        {kayitlar.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <History className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Bu filtrede kayıt yok.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500">
                  <th className="px-4 py-2 font-medium">Tarih</th>
                  <th className="px-4 py-2 font-medium">Varlık</th>
                  <th className="px-4 py-2 font-medium">Olay</th>
                  <th className="px-4 py-2 font-medium">Kim</th>
                </tr>
              </thead>
              <tbody>
                {kayitlar.map((k) => (
                  <tr key={k.id} className="border-b border-neutral-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                      {k.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {k.varlikTuru}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-neutral-800">{k.olay}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-neutral-600">{k.kullanici?.ad ?? "Sistem"}</td>
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
          {kayitlar.length === SAYFA_BOYU && (
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
