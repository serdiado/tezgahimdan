import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { kullaniciTumUrunDegerlendirmeleriGetir } from "@/lib/degerlendirme";
import { DegerlendirmelerimUrunlerIcerik } from "./DegerlendirmelerimUrunlerIcerik";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

// (alici-panel) desenindeki diger sayfalarla ayni: girisli kullanicinin
// kendi listesi, girissiz login'e (donusle).
export default async function DegerlendirmelerimUrunlerSayfasi() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=/degerlendirmelerim/urunler");
  }

  const degerlendirmeler = await kullaniciTumUrunDegerlendirmeleriGetir(session.user.id);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Ürün Değerlendirmelerim</h1>
      <DegerlendirmelerimUrunlerIcerik
        degerlendirmeler={degerlendirmeler.map((d) => ({
          id: d.id,
          urunId: d.urunId,
          urunBaslik: d.urunBaslik,
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
