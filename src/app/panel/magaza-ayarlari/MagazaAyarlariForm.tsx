import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { telefonNormallestir } from "@/lib/telefon";
import { KrokiFotografSecici } from "@/components/KrokiFotografSecici";

const TEZGAH_BILGISI_MAX = 100;

async function magazaGuncelle(formData: FormData) {
  "use server";

  // Sayfa zaten kontrol etti ama bu bir Server Action - dogrudan cagrilabilir,
  // bu yuzden yetki kontrolunu burada da tekrarliyoruz.
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session) {
    redirect("/giris");
  }

  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    redirect("/panel/urun-ekle");
  }

  const ad = typeof formData.get("ad") === "string" ? (formData.get("ad") as string).trim() : "";
  const aciklamaRaw = formData.get("aciklama");
  const aciklama = typeof aciklamaRaw === "string" && aciklamaRaw.trim() ? aciklamaRaw.trim() : null;
  const whatsappRaw = formData.get("whatsappNo");
  const whatsappHam = typeof whatsappRaw === "string" ? whatsappRaw.trim() : "";
  const tezgahBilgisiRaw = formData.get("tezgahBilgisi");
  const tezgahBilgisiHam = typeof tezgahBilgisiRaw === "string" ? tezgahBilgisiRaw.trim() : "";

  if (!ad) {
    redirect(`/panel/magaza-ayarlari?hata=${encodeURIComponent("magaza adi zorunlu")}`);
  }

  let whatsappNo: string | null = null;
  if (whatsappHam) {
    whatsappNo = telefonNormallestir(whatsappHam);
    if (!whatsappNo) {
      redirect(
        `/panel/magaza-ayarlari?hata=${encodeURIComponent("gecersiz whatsapp numarasi (or. 05XX XXX XX XX bicimini deneyin)")}`,
      );
    }
  }

  if (tezgahBilgisiHam.length > TEZGAH_BILGISI_MAX) {
    redirect(
      `/panel/magaza-ayarlari?hata=${encodeURIComponent(`tezgah bilgisi en fazla ${TEZGAH_BILGISI_MAX} karakter olabilir`)}`,
    );
  }
  const tezgahBilgisi = tezgahBilgisiHam || null;

  await prisma.magaza.update({
    where: { id: magaza.id },
    data: { ad, aciklama, whatsappNo, tezgahBilgisi },
  });

  redirect("/panel/magaza-ayarlari?basarili=1");
}

export function MagazaAyarlariForm({
  magaza,
}: {
  magaza: {
    ad: string;
    slug: string;
    aciklama: string | null;
    whatsappNo: string | null;
    tezgahBilgisi: string | null;
    krokiFotoUrl: string | null;
  };
}) {
  return (
    <form action={magazaGuncelle} className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Mağaza Adı
          <input
            name="ad"
            type="text"
            required
            defaultValue={magaza.ad}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div>
        <span className="block text-sm font-medium text-neutral-700">Slug</span>
        <p className="mt-1 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-500">
          {magaza.slug}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Slug değiştirilemez — paylaşılmış mağaza linkinin kırılmaması için.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Açıklama (opsiyonel)
          <textarea
            name="aciklama"
            defaultValue={magaza.aciklama ?? ""}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          WhatsApp No (opsiyonel)
          <input
            name="whatsappNo"
            type="text"
            placeholder="05XX XXX XX XX"
            defaultValue={magaza.whatsappNo ?? ""}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Tezgah Bilgisi (opsiyonel)
          <input
            name="tezgahBilgisi"
            type="text"
            maxLength={TEZGAH_BILGISI_MAX}
            placeholder="ör. A Blok 5, girişten 3. sağda"
            defaultValue={magaza.tezgahBilgisi ?? ""}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button
        type="submit"
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Kaydet
      </button>
      <div className="border-t border-neutral-200 pt-4">
        <KrokiFotografSecici baslangicUrl={magaza.krokiFotoUrl} />
      </div>
    </form>
  );
}
