import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { kullaniciTumMagazaDegerlendirmeleriGetir } from "@/lib/magaza-degerlendirme";
import { DegerlendirmelerimMagazalarIcerik } from "./DegerlendirmelerimMagazalarIcerik";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export default async function DegerlendirmelerimMagazalarSayfasi() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=/degerlendirmelerim/magazalar");
  }

  const degerlendirmeler = await kullaniciTumMagazaDegerlendirmeleriGetir(session.user.id);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mağaza Değerlendirmelerim</h1>
      <DegerlendirmelerimMagazalarIcerik
        degerlendirmeler={degerlendirmeler.map((d) => ({
          id: d.id,
          magazaId: d.magazaId,
          magazaAd: d.magazaAd,
          magazaSlug: d.magazaSlug,
          puan: d.puan,
          yorum: d.yorum,
          tarih: tarihFormat.format(d.guncellenmeZamani),
        }))}
      />
    </>
  );
}
