"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Flag, Images } from "lucide-react";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { BegeniButonu } from "@/components/BegeniButonu";
import { PaylasButonlari } from "@/components/PaylasButonlari";
import { SikayetModal } from "@/components/SikayetModal";
import { RezerveModal } from "./RezerveModal";
import { UrunDetayModal } from "./UrunDetayModal";

export const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  sergide: { etiket: "Sergide", className: "bg-green-100 text-green-700" },
  doldu: { etiket: "Dolu", className: "bg-amber-100 text-amber-700" },
  satildi: { etiket: "Satıldı", className: "bg-neutral-200 text-neutral-600" },
};

const fiyatFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export type UrunKartiVeri = {
  id: string;
  baslik: string;
  aciklama: string | null;
  fiyat: number;
  durum: string;
  fotograflar: string[];
  kategori: { id: string; ad: string };
  // Begeni sayisi HERKESE ACIK (girissiz ziyaretciye de gosterilir); takip
  // (bildirim aboneligi) SADECE UrunDetayModal'da gosterilir, kartta yok.
  begeniSayisi: number;
  benimBegenimVar: boolean;
  benimTakibimVar: boolean;
};

export function UrunKarti({
  urun,
  girisli,
  kullaniciTelefonVar,
  magaza,
  magazaSlug,
}: {
  urun: UrunKartiVeri;
  girisli: boolean;
  kullaniciTelefonVar: boolean;
  // Sadece magazalar-arasi listelerde (ana sayfa "Bu Hafta Eklenenler") gecilir -
  // bir magazanin kendi sayfasinda (MagazaIcerik) baglam zaten belli, gerek yok.
  magaza?: { ad: string; slug: string };
  // Paylasim linki (?urun=<id>) icin her zaman gerekli - magaza prop'undan
  // ayri tutulur cunku magaza SADECE capraz-magaza baglaminda "hangi magaza"
  // etiketini gostermek icin var, magazaSlug ise her iki baglamda da linki
  // kurmak icin sart.
  magazaSlug: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Redirect-back: /giris'ten ?rezerveEt=<id> ile donuldugunde modal ACIK baslar
  // (kullanici niyetini kaybetmesin). setState-in-effect yerine ilk render'da
  // hesaplanir; yalniz sergideki urun + girisli kullanici icin.
  const [modalAcik, setModalAcik] = useState(
    () => girisli && urun.durum === "sergide" && searchParams.get("rezerveEt") === urun.id,
  );
  const [sikayetModalAcik, setSikayetModalAcik] = useState(false);
  const [detayModalAcik, setDetayModalAcik] = useState(false);
  const renk = kategoriRengiSec(urun.kategori.id);
  // Kategori ikonu render icinde PascalCase bilesen olarak baglanmaz (lint:
  // react-hooks/static-components) - lookup lowercase tutulup createElement ile
  // render edilir.
  const kategoriIkonu = kategoriIkonuSec(urun.kategori.ad);
  const fotograf = urun.fotograflar[0];
  const durumStil = DURUM_STIL[urun.durum] ?? { etiket: urun.durum, className: "bg-neutral-200 text-neutral-600" };
  // Kapasite (stok+5) dolunca rezervasyon kapanir (PLAN.md SS3); 'doldu'
  // durumu tam bu esikte, rezervasyon API'sinin icinde atomik olarak atanir.
  const rezervasyonKapali = urun.durum !== "sergide";

  // Paylasilan link (?urun=<id>) ile gelen ziyaretci bu urune kaydirilir ve kisa
  // sure vurgulanir. Ilk render'da vurgu acik baslar (setState-in-effect yerine),
  // scroll effect'te yapilir, vurgu ~2.5sn sonra timer'da kapanir.
  const hedefUrun = searchParams.get("urun") === urun.id;
  const [vurgulu, setVurgulu] = useState(hedefUrun);
  const kartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hedefUrun) return;
    kartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const zaman = setTimeout(() => setVurgulu(false), 2500);
    return () => clearTimeout(zaman);
  }, [hedefUrun]);

  function rezerveTikla() {
    if (!girisli) {
      // KP-1: girissiz kullanici once login'e; sonra ayni urune doner.
      const next = `${pathname}?rezerveEt=${urun.id}`;
      router.push(`/giris?next=${encodeURIComponent(next)}`);
      return;
    }
    setModalAcik(true);
  }

  function sikayetTikla() {
    if (!girisli) {
      const next = `${pathname}?urun=${urun.id}`;
      router.push(`/giris?next=${encodeURIComponent(next)}`);
      return;
    }
    setSikayetModalAcik(true);
  }

  // Detay goruntuleme girissiz de acik (kesif serbest, KP-1 yalniz "Rezerve
  // Et"i kimlik ister). Detaydan "Rezerve Et"e basilinca detay kapanir ve
  // AYNI rezerveTikla() cagrilir - giris/telefon mantigi tek yerde kalir.
  function detayTikla() {
    setDetayModalAcik(true);
  }

  function detayRezerveEt() {
    setDetayModalAcik(false);
    rezerveTikla();
  }

  return (
    <div
      ref={kartRef}
      id={`urun-${urun.id}`}
      className={`flex scroll-mt-24 flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${
        vurgulu ? "ring-2 ring-primary-500 ring-offset-2" : ""
      }`}
    >
      <button
        type="button"
        onClick={detayTikla}
        className={`relative aspect-square w-full cursor-pointer ${fotograf ? "bg-neutral-100" : renk.bg}`}
      >
        {fotograf ? (
          <Image src={fotograf} alt={urun.baslik} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        ) : (
          <div className="flex h-full items-center justify-center">
            {createElement(kategoriIkonu, { className: `h-10 w-10 ${renk.text}`, strokeWidth: 1.5 })}
          </div>
        )}
        {urun.fotograflar.length > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            <Images className="h-3 w-3" strokeWidth={2} />
            {urun.fotograflar.length}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {magaza && (
          <Link
            href={`/magaza/${magaza.slug}`}
            className="w-fit text-xs font-medium text-neutral-500 hover:text-primary-600"
          >
            {magaza.ad}
          </Link>
        )}
        <span
          className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${renk.bg} ${renk.text} ${renk.border}`}
        >
          {urun.kategori.ad}
        </span>
        <h3 className="font-medium text-neutral-900">{urun.baslik}</h3>
        <button
          type="button"
          onClick={detayTikla}
          className="w-fit text-xs font-medium text-primary-600 hover:underline"
        >
          Detayları gör
        </button>
        <p className="text-lg font-semibold text-primary-700">{fiyatFormat.format(urun.fiyat)}</p>
        <BegeniButonu
          urunId={urun.id}
          girisli={girisli}
          begeniSayisi={urun.begeniSayisi}
          benimBegenimVar={urun.benimBegenimVar}
        />
        <span className={`mb-2 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${durumStil.className}`}>
          {durumStil.etiket}
        </span>
        <button
          type="button"
          disabled={rezervasyonKapali}
          onClick={rezerveTikla}
          className={`mt-auto w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            rezervasyonKapali
              ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
              : "bg-primary-500 text-white hover:bg-primary-600"
          }`}
        >
          {rezervasyonKapali ? "Sıra kapandı" : "Rezerve Et"}
        </button>
        <PaylasButonlari
          baslik={urun.baslik}
          fiyat={urun.fiyat}
          urunLink={`/magaza/${magazaSlug}?urun=${urun.id}`}
          kapakFotoUrl={fotograf}
        />
        <button
          type="button"
          onClick={sikayetTikla}
          className="flex items-center gap-1 self-start text-xs font-medium text-neutral-400 hover:text-neutral-600"
        >
          <Flag className="h-3 w-3" strokeWidth={2} />
          Bildir
        </button>
      </div>
      {modalAcik && (
        <RezerveModal
          urunId={urun.id}
          urunBaslik={urun.baslik}
          kullaniciTelefonVar={kullaniciTelefonVar}
          onClose={() => setModalAcik(false)}
        />
      )}
      {sikayetModalAcik && (
        <SikayetModal
          hedefTuru="urun"
          hedefId={urun.id}
          hedefAdi={urun.baslik}
          onClose={() => setSikayetModalAcik(false)}
        />
      )}
      {detayModalAcik && (
        <UrunDetayModal
          urun={urun}
          magazaSlug={magazaSlug}
          girisli={girisli}
          onClose={() => setDetayModalAcik(false)}
          onRezerveEt={detayRezerveEt}
        />
      )}
    </div>
  );
}
