import type { Metadata } from "next";
import { siteIcerikHaritasiGetir } from "@/lib/site-icerik";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular · Tezgahımdan",
};

// Admin panelden (/admin/icerik) her an duzenlenebilir CMS icerigi - build
// aninda statik olarak dondurulursa admin degisikligi yayina yansimaz, ayrica
// build ortaminda gercek DATABASE_URL olmayabilir (bkz. Docker production build).
export const dynamic = "force-dynamic";

export default async function SssSayfasi() {
  const icerik = await siteIcerikHaritasiGetir(["sss_icerik"]);
  const govde = icerik.get("sss_icerik");

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-neutral-900">Sıkça Sorulan Sorular</h1>
        {govde ? (
          <p className="mt-4 whitespace-pre-line text-neutral-700">{govde}</p>
        ) : (
          <p className="mt-4 text-neutral-500">Bu sayfanın içeriği hazırlanıyor.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
