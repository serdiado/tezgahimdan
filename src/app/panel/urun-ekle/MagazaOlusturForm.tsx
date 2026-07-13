import { redirect } from "next/navigation";
import { getSaticiSession } from "@/lib/yetki";
import { magazaAc } from "@/lib/magaza";
import { telefonNormallestir } from "@/lib/telefon";

export type MagazaOlusturPazarVeri = { id: string; ad: string; il: string; ilce: string };

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
  const pazarId =
    typeof formData.get("pazarId") === "string" ? (formData.get("pazarId") as string).trim() : "";
  const whatsappHam =
    typeof formData.get("whatsappNo") === "string"
      ? (formData.get("whatsappNo") as string).trim()
      : "";

  if (!ad || !slug || !pazarId) {
    redirect(`/panel/urun-ekle?hata=${encodeURIComponent("ad, slug ve pazar zorunlu")}`);
  }

  // WhatsApp ZORUNLU (2026-07-11 karari) - ana sihirbaz (magaza-ac) ile ayni
  // kural; bu ikincil yeniden-olusturma yolu kuralin disina sizmamali.
  if (!whatsappHam) {
    redirect(`/panel/urun-ekle?hata=${encodeURIComponent("WhatsApp numarası zorunlu")}`);
  }
  const whatsappNo = telefonNormallestir(whatsappHam);
  if (!whatsappNo) {
    redirect(
      `/panel/urun-ekle?hata=${encodeURIComponent("geçersiz WhatsApp numarası (ör. 05XX XXX XX XX)")}`,
    );
  }

  const sonuc = await magazaAc({ userId: session.user.id, ad, slug, whatsappNo, pazarId });
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
      return redirect(`/panel/urun-ekle?hata=${encodeURIComponent("zaten bir tezgahın var")}`);
    case "yasakli":
      return redirect(
        `/panel/urun-ekle?hata=${encodeURIComponent("hesabin kisitlandigi icin yeni tezgah acamazsin")}`,
      );
  }
}

export function MagazaOlusturForm({
  pazarlar,
  profilTelefonu = null,
}: {
  pazarlar: MagazaOlusturPazarVeri[];
  // Ana sihirbazla (MagazaAcForm) ayni on-dolum davranisi: profil telefonu
  // varsa WhatsApp alanina getirilir, degistirilebilir.
  profilTelefonu?: string | null;
}) {
  return (
    <form action={magazaOlustur}>
      <div>
        <label>
          Tezgah Adı
          <input name="ad" type="text" required />
        </label>
      </div>
      <div>
        <label>
          Slug (link için, örn: ayse-nin-tezgahi)
          <input name="slug" type="text" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </label>
      </div>
      <div>
        <label>
          WhatsApp No
          <input
            name="whatsappNo"
            type="text"
            required
            placeholder="05XX XXX XX XX"
            defaultValue={profilTelefonu ?? ""}
          />
        </label>
      </div>
      {pazarlar.length <= 1 ? (
        <>
          <input type="hidden" name="pazarId" value={pazarlar[0]?.id ?? ""} />
          {pazarlar[0] && <p>Tezgahın {pazarlar[0].ad} pazarına bağlanacak.</p>}
        </>
      ) : (
        <div>
          <label>
            Pazar
            <select name="pazarId" required>
              {pazarlar.map((pazar) => (
                <option key={pazar.id} value={pazar.id}>
                  {pazar.ad} — {pazar.ilce}, {pazar.il}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <button type="submit">Tezgahı Oluştur</button>
    </form>
  );
}
