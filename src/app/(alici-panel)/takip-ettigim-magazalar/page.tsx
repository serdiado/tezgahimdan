import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { kullaniciTakipEttigiMagazalarGetir } from "@/lib/magaza-takip";
import { magazaDegerlendirmeOzetiHaritasi } from "@/lib/magaza-degerlendirme";
import { TakipEttigimMagazalarIcerik } from "./TakipEttigimMagazalarIcerik";

export default async function TakipEttigimMagazalarSayfasi() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=/takip-ettigim-magazalar");
  }

  const magazalar = await kullaniciTakipEttigiMagazalarGetir(session.user.id);
  const degerlendirmeOzeti = await magazaDegerlendirmeOzetiHaritasi(magazalar.map((m) => m.id));

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Takip Ettiğim Tezgahlar</h1>
      <TakipEttigimMagazalarIcerik
        magazalar={magazalar.map((m) => ({
          id: m.id,
          ad: m.ad,
          slug: m.slug,
          aciklama: m.aciklama,
          pazarAd: m.pazarAd,
          urunSayisi: m.urunSayisi,
          degerlendirmeOrtalamasi: degerlendirmeOzeti.get(m.id)?.ortalama ?? null,
          degerlendirmeSayisi: degerlendirmeOzeti.get(m.id)?.sayi ?? 0,
        }))}
      />
    </>
  );
}
