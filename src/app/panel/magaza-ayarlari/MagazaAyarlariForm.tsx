"use client";

import { useState } from "react";
import { KrokiFotografSecici } from "@/components/KrokiFotografSecici";
import { useDegisiklikUyarisi } from "@/lib/degisiklik-uyarisi";
import { TEZGAH_BILGISI_MAX } from "@/lib/magaza-sabitleri";
import { magazaGuncelle } from "./actions";

// Kaydet butonu artik EN ALTTA (Kroki bolumunun de altinda) ve SADECE bir alan
// degistirildiyse aktif - kullanici geri bildirimi: "yeni resim yuklendikten
// sonra Kaydet butonu yukarida oldugu icin ne yapacagimi bilemiyorum" +
// "kaydetmeden cikinca hicbir uyari vermiyor". onChange ile dirty=true olur;
// basarili kayittan sonra server action zaten redirect() ile sayfayi tazeler
// (dirty sifirlamak icin ayrica bir seye gerek yok). Kroki fotografi bu
// dirty takibinin DISINDA - kendi upload'ini kendi anında yapar, Kaydet'i
// beklemez (bkz. KrokiFotografSecici.tsx).
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
  const [dirty, setDirty] = useState(false);
  useDegisiklikUyarisi(dirty);

  return (
    <form action={magazaGuncelle} className="mt-4 space-y-4">
      {/* onChange SADECE bu sarmalayicida - Kroki bolumu (asagida, kendi
          fetch'iyle ANINDA kaydediyor) form'a dahil ama bu blogun DISINDA,
          aksi halde kroki dosya secimi de "dirty" isaretleyip Kaydet'i
          gereksiz yere aktif ederdi. */}
      <div className="space-y-4" onChange={() => setDirty(true)}>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Tezgah Adı
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
            Slug değiştirilemez — paylaşılmış tezgah linkinin kırılmaması için.
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
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <KrokiFotografSecici baslangicUrl={magaza.krokiFotoUrl} />
      </div>

      <button
        type="submit"
        disabled={!dirty}
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Kaydet
      </button>
      {dirty && (
        <p className="text-xs text-neutral-500">Kaydedilmemiş değişiklikleriniz var.</p>
      )}
    </form>
  );
}
