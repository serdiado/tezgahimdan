import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

const TUR_ETIKETI: Record<string, string> = { bilgi: "Bilgi", egitim: "Eğitim", uyari: "Uyarı" };
const HEDEF_ETIKETI: Record<string, string> = {
  hepsi: "Herkes",
  satici: "Satıcılar",
  alici: "Alıcılar",
};

export default async function AdminDuyuruPage() {
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
    const duyurular = await prisma.duyuru.findMany({
      where: { silindiMi: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        baslik: true,
        tur: true,
        hedefKitle: true,
        yayinlandiMi: true,
        gonderilenSayisi: true,
        yayinTarihi: true,
        createdAt: true,
      },
    });

    // Okunma sayilari tek groupBy ile (N+1 onlemek) - sadece yayinlanmislar icin
    // anlamli ama tek sorgu hepsini kapsar.
    const okunanlar = await prisma.bildirim.groupBy({
      by: ["duyuruId"],
      where: { duyuruId: { in: duyurular.map((d) => d.id) }, okunduMu: true, silindiMi: false },
      _count: true,
    });
    const okunanHarita = new Map(okunanlar.map((o) => [o.duyuruId, o._count]));

    icerik = (
      <>
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-neutral-900">Duyurular</h1>
          <Link
            href="/admin/duyuru/yeni"
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            + Yeni Duyuru
          </Link>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Satıcı ve alıcılara gönderilen editoryal duyurular (yeni işleyiş, eğitim, uyarı). Tıklayınca detay
          sayfası açılır.
        </p>
        <AdminNav aktif="duyuru" />

        {duyurular.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <Megaphone className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Henüz duyuru yok. &quot;+ Yeni Duyuru&quot; ile başla.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {duyurular.map((d) => (
              <Link
                key={d.id}
                href={`/admin/duyuru/${d.id}/duzenle`}
                className="block rounded-2xl bg-white p-4 shadow-sm hover:bg-neutral-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-900">{d.baslik}</span>
                  {d.yayinlandiMi ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      Yayında
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Taslak
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {TUR_ETIKETI[d.tur] ?? d.tur} · {HEDEF_ETIKETI[d.hedefKitle] ?? d.hedefKitle}
                  {d.yayinlandiMi
                    ? ` · ${d.gonderilenSayisi} gönderildi · ${okunanHarita.get(d.id) ?? 0} okundu${
                        d.yayinTarihi ? ` · ${tarihFormat.format(d.yayinTarihi)}` : ""
                      }`
                    : ` · ${tarihFormat.format(d.createdAt)} oluşturuldu`}
                </p>
              </Link>
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
