import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";

const SEBEP_STIL: Record<string, { etiket: string; aciklama: string; className: string }> = {
  urun_satildi: {
    etiket: "Kalıcı",
    aciklama: "Ürün tükenmişti, geri alma yapılamadı",
    className: "bg-neutral-200 text-neutral-700",
  },
  kapasite_dolu: {
    etiket: "Geçici",
    aciklama: "Kapasite o an doluydu, alıcı tekrar deneyebilir",
    className: "bg-amber-100 text-amber-700",
  },
};

const tarihFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// AP-6 karari: read-only triyaj - admin override (yeniden geri alma / no-show
// itirazi) burada YOK, rezervasyon motoruna (rezervasyonGeriAl) hicbir yazma
// yapilmiyor, yalniz mevcut redlerin GORULEBILIR olmasi saglaniyor.
export default async function AdminAnlasmazliklarPage() {
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
    // Format: "geri_alma_reddedildi:{rezervId}:{sebep}" (bkz. rezervasyon.ts:473).
    // varlikId zaten rezervId'nin kendisi - parse yerine dogrudan kullanilir;
    // olay metninden yalniz sebep cikarilir.
    const kayitlar = await prisma.durumGecmisi.findMany({
      where: { olay: { startsWith: "geri_alma_reddedildi:" } },
      orderBy: { createdAt: "desc" },
    });

    const rezervIdler = kayitlar.map((k) => k.varlikId);
    const rezervasyonlar = await prisma.rezervasyon.findMany({
      where: { id: { in: rezervIdler } },
      include: {
        urun: { select: { baslik: true, magaza: { select: { ad: true, slug: true } } } },
        alici: { select: { ad: true } },
      },
    });
    const rezervMap = new Map(rezervasyonlar.map((r) => [r.id, r]));

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Anlaşmazlıklar</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Reddedilen geri alma talepleri (salt okunur triyaj — buradan bir işlem yapılamaz).
        </p>
        <AdminNav aktif="anlasmazliklar" />

        {kayitlar.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Kayıtlı anlaşmazlık yok.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {kayitlar.map((k) => {
              const [, , sebep] = k.olay.split(":");
              const stil = SEBEP_STIL[sebep] ?? {
                etiket: sebep || "bilinmiyor",
                aciklama: "",
                className: "bg-neutral-200 text-neutral-600",
              };
              const rez = rezervMap.get(k.varlikId);
              return (
                <div key={k.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stil.className}`}>
                      {stil.etiket}
                    </span>
                    {rez ? (
                      <Link
                        href={`/magaza/${rez.urun.magaza.slug}?urun=${rez.urunId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary-600 hover:underline"
                      >
                        {rez.urun.baslik}
                      </Link>
                    ) : (
                      <span className="font-semibold text-neutral-900">(rezervasyon bulunamadı)</span>
                    )}
                    {rez && <span className="text-sm text-neutral-500">· {rez.urun.magaza.ad}</span>}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{stil.aciklama}</p>
                  <p className="mt-2 text-xs text-neutral-400">
                    {rez ? `Alıcı: ${rez.alici.ad} · ` : ""}
                    {tarihFormat.format(k.createdAt)}
                  </p>
                </div>
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
