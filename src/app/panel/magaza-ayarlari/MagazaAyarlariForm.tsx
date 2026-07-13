"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { KrokiFotografSecici } from "@/components/KrokiFotografSecici";
import { useDegisiklikUyarisi } from "@/lib/degisiklik-uyarisi";
import { TEZGAH_BILGISI_MAX } from "@/lib/magaza-sabitleri";
import { SOSYAL_PLATFORMLAR, type SosyalPlatformAnahtari } from "@/lib/sosyal-medya";
import { magazaGuncelle } from "./actions";

// Kaydet butonu artik EN ALTTA (Kroki bolumunun de altinda) ve SADECE bir alan
// degistirildiyse aktif - kullanici geri bildirimi: "yeni resim yuklendikten
// sonra Kaydet butonu yukarida oldugu icin ne yapacagimi bilemiyorum" +
// "kaydetmeden cikinca hicbir uyari vermiyor". onChange ile dirty=true olur;
// basarili kayittan sonra server action zaten redirect() ile sayfayi tazeler
// (dirty sifirlamak icin ayrica bir seye gerek yok). Kroki fotografi bu
// dirty takibinin DISINDA - kendi upload'ini kendi anında yapar, Kaydet'i
// beklemez (bkz. KrokiFotografSecici.tsx).
// kurulumModu (2026-07-11): tezgah acilista sihirbazdan buraya gelinir. Kaydet
// "Kaydet ve Devam Et" olur (kayit sonrasi urun-ekle'ye gider), hicbir sey
// doldurmayanlar icin "Simdilik gec" linki vardir. Alanlar opsiyonel kalir.
export function MagazaAyarlariForm({
  magaza,
  kurulumModu = false,
}: {
  kurulumModu?: boolean;
  magaza: {
    ad: string;
    slug: string;
    aciklama: string | null;
    whatsappNo: string | null;
    tezgahBilgisi: string | null;
    krokiFotoUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
  };
}) {
  const [dirty, setDirty] = useState(false);
  useDegisiklikUyarisi(dirty);

  // Sosyal medya: "ekle" akisi (2026-07-10 kullanici karari) - satici sadece
  // link girdigi platformlari GORUR, bos olanlar formda bile yer kaplamaz.
  // Baslangicta zaten dolu olan alanlar aktif satir olarak acilir.
  const [aktifPlatformlar, setAktifPlatformlar] = useState<SosyalPlatformAnahtari[]>(
    () => SOSYAL_PLATFORMLAR.filter((p) => magaza[p.anahtar]).map((p) => p.anahtar),
  );
  const eklenebilirPlatformlar = SOSYAL_PLATFORMLAR.filter((p) => !aktifPlatformlar.includes(p.anahtar));

  function platformEkle(anahtar: SosyalPlatformAnahtari) {
    setAktifPlatformlar((mevcut) => [...mevcut, anahtar]);
    setDirty(true);
  }

  function platformKaldir(anahtar: SosyalPlatformAnahtari) {
    setAktifPlatformlar((mevcut) => mevcut.filter((a) => a !== anahtar));
    setDirty(true);
  }

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
            WhatsApp No
            <input
              name="whatsappNo"
              type="tel"
              autoComplete="tel"
              required
              placeholder="05XX XXX XX XX"
              defaultValue={magaza.whatsappNo ?? ""}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <p className="mt-1 text-xs text-neutral-400">
            Alıcılar sana buradan ulaşır — tezgahın için zorunludur.
          </p>
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

        <div>
          <span className="block text-sm font-medium text-neutral-700">Sosyal Medya (opsiyonel)</span>
          <p className="mt-0.5 text-xs text-neutral-400">
            Tezgah sayfanda, girdiğin platformların ikonu görünür - boş bıraktığın hiç çıkmaz.
          </p>
          <div className="mt-2 space-y-2">
            {aktifPlatformlar.map((anahtar) => {
              const platform = SOSYAL_PLATFORMLAR.find((p) => p.anahtar === anahtar)!;
              return (
                <div key={anahtar} className="flex items-center gap-2">
                  <platform.Ikon className="h-5 w-5 shrink-0 text-neutral-500" />
                  <input
                    name={anahtar}
                    type="url"
                    placeholder={platform.placeholder}
                    defaultValue={magaza[anahtar] ?? ""}
                    className="block w-full min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => platformKaldir(anahtar)}
                    aria-label={`${platform.etiket} bağlantısını kaldır`}
                    className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
          {eklenebilirPlatformlar.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {eklenebilirPlatformlar.map((platform) => (
                <button
                  key={platform.anahtar}
                  type="button"
                  onClick={() => platformEkle(platform.anahtar)}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100"
                >
                  <platform.Ikon className="h-4 w-4" />+ {platform.etiket} Ekle
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <KrokiFotografSecici baslangicUrl={magaza.krokiFotoUrl} />
      </div>

      {kurulumModu && <input type="hidden" name="kurulum" value="1" />}

      <button
        type="submit"
        disabled={!dirty}
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {kurulumModu ? "Kaydet ve Devam Et" : "Kaydet"}
      </button>
      {dirty && (
        <p className="text-xs text-neutral-500">Kaydedilmemiş değişiklikleriniz var.</p>
      )}
      {kurulumModu && !dirty && (
        <p className="text-sm">
          <Link
            href="/panel/urun-ekle"
            className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline"
          >
            Şimdilik geç — ilk ürününü ekle
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </p>
      )}
    </form>
  );
}
