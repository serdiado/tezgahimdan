import { redirect } from "next/navigation";
import { getSaticiSession } from "@/lib/yetki";
import { magazaAc } from "@/lib/magaza";

// Bu form, zaten satici olan ama (ornegin magazasini kaldirmis) bir kullanicinin
// /panel/urun-ekle icinde magazasini yeniden olusturdugu yerdir. Asil onboarding
// (alici -> satici) /panel/magaza-ac sihirbazidir. Ikisi de ayni magazaAc() lib
// fonksiyonunu kullanir - terfi/iz/kilit mantigi tek yerde.
async function magazaOlustur(formData: FormData) {
  "use server";

  // Bu yol satici geciti arkasinda (urun-ekle sayfasi yetkili kontrolu yapar), ama
  // Server Action dogrudan cagrilabilir - yetkiyi burada da tekrarliyoruz.
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session?.user?.id) {
    redirect("/giris");
  }

  const ad = typeof formData.get("ad") === "string" ? (formData.get("ad") as string).trim() : "";
  const slug =
    typeof formData.get("slug") === "string"
      ? (formData.get("slug") as string).trim().toLowerCase()
      : "";

  if (!ad || !slug) {
    redirect(`/panel/urun-ekle?hata=${encodeURIComponent("ad ve slug zorunlu")}`);
  }

  const sonuc = await magazaAc({ userId: session.user.id, ad, slug });
  // redirect() throw eder (never doner) - her dal akisi burada bitirir.
  switch (sonuc.tur) {
    case "acildi":
      return redirect("/panel/urun-ekle");
    case "gecersiz-ad":
      return redirect(`/panel/urun-ekle?hata=${encodeURIComponent("ad zorunlu")}`);
    case "gecersiz-slug":
      return redirect(
        `/panel/urun-ekle?hata=${encodeURIComponent("slug sadece kucuk harf, rakam ve tire icerebilir")}`,
      );
    case "slug-alinmis":
      return redirect(`/panel/urun-ekle?hata=${encodeURIComponent("bu slug zaten kullaniliyor")}`);
    case "zaten-magaza-var":
      return redirect(`/panel/urun-ekle?hata=${encodeURIComponent("zaten bir magazan var")}`);
  }
}

export function MagazaOlusturForm() {
  return (
    <form action={magazaOlustur}>
      <div>
        <label>
          Mağaza Adı
          <input name="ad" type="text" required />
        </label>
      </div>
      <div>
        <label>
          Slug (link için, örn: ayse-nin-tezgahi)
          <input name="slug" type="text" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </label>
      </div>
      <button type="submit">Mağazayı Oluştur</button>
    </form>
  );
}
