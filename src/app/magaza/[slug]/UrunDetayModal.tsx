"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flag, X } from "lucide-react";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { BegeniButonu } from "@/components/BegeniButonu";
import { TakipButonu } from "@/components/TakipButonu";
import { PaylasButonlari } from "@/components/PaylasButonlari";
import { YildizGosterge } from "@/components/YildizGosterge";
import { ZoomluGorsel } from "@/components/ZoomluGorsel";
import { DURUM_STIL, MagazaYildizi, type UrunKartiVeri } from "./UrunKarti";
import { RezervasyonDurumuButon } from "./RezervasyonDurumuButon";

const fiyatFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

// Rezervasyonun kendisi (girisli kontrolu, telefon isteme vb.) UrunKarti'de
// kalir - bu modal sadece goruntuleme + "Rezerve Et"e basinca UrunKarti'e
// haber verir (onRezerveEt), boylece giris/telefon mantigi TEK yerde kalir.
export function UrunDetayModal({
  urun,
  magaza,
  magazaSlug,
  girisli,
  onClose,
  onRezerveEt,
  onSikayetEt,
}: {
  urun: UrunKartiVeri;
  magaza?: { ad: string; slug: string; degerlendirmeOrtalamasi: number | null; degerlendirmeSayisi: number };
  magazaSlug: string;
  girisli: boolean;
  onClose: () => void;
  onRezerveEt: () => void;
  onSikayetEt: () => void;
}) {
  const [aktifIndex, setAktifIndex] = useState(0);
  const renk = kategoriRengiSec(urun.kategori.id);
  const kategoriIkonu = kategoriIkonuSec(urun.kategori.ad);
  const durumStil = DURUM_STIL[urun.durum] ?? { etiket: urun.durum, className: "bg-neutral-200 text-neutral-600" };
  const rezervasyonKapali = urun.durum !== "sergide";
  const aktifFoto = urun.fotograflar[aktifIndex];

  // Modal acikken arka sayfa kaymasin: fare tekerlegiyle zoom yaparken
  // preventDefault tek basina yetmeyebiliyor (scroll chaining) - body'nin
  // kendi kaydirmasini tamamen kilitleyip kapaninca eski degerine donduruyoruz.
  useEffect(() => {
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oncekiOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="ince-scrollbar relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapat: en ustte kendi satirinda (akis icinde), sagda - gorselin
            sag-ust kosesindeki begeni/takip/sikayet kumesiyle CAKISMASIN diye. */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="relative">
          <ZoomluGorsel
            key={aktifIndex}
            foto={aktifFoto}
            alt={urun.baslik}
            kategoriIkonu={kategoriIkonu}
            renkYazi={renk.text}
          />
          {/* Durum rozeti: gorselin sol-ustu (UrunKarti.tsx karti ile ayni yaklasim). */}
          <span
            className={`absolute left-2 top-2 z-10 w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${durumStil.className}`}
          >
            {durumStil.etiket}
          </span>
          {/* Begeni+Takip+Bildir: gorselin sag-ustu (UrunKarti.tsx karti ile ayni yaklasim). */}
          <div className="absolute right-2 top-2 z-10 flex gap-1.5">
            <BegeniButonu
              urunId={urun.id}
              girisli={girisli}
              begeniSayisi={urun.begeniSayisi}
              benimBegenimVar={urun.benimBegenimVar}
              kompakt
              gorselUzerinde
            />
            <TakipButonu
              urunId={urun.id}
              girisli={girisli}
              benimTakibimVar={urun.benimTakibimVar}
              kompakt
              gorselUzerinde
            />
            <button
              type="button"
              onClick={onSikayetEt}
              aria-label="Bildir"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <Flag className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Kucuk resim seridi: max 5 foto oldugu icin (urun-sabitleri.ts) harici
            bir carousel kutuphanesi gerekmiyor, basit state ile yeterli. */}
        {urun.fotograflar.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {urun.fotograflar.map((foto, i) => (
              <button
                key={foto}
                type="button"
                onClick={() => setAktifIndex(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ${
                  i === aktifIndex ? "ring-2 ring-primary-500" : "ring-1 ring-neutral-200"
                }`}
              >
                <Image src={foto} alt="" fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}

        {/* Tezgah adi + degerlendirmesi: urun basliginin USTUNDE, saga yasli
            ve tiklanabilir (yorumlara gider). Kategori etiketi kaldirildi -
            durum rozeti artik gorselin uzerinde gosteriliyor (yukarida). */}
        {magaza && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <Link
              href={`/magaza/${magaza.slug}`}
              className="min-w-0 truncate text-xs font-medium text-neutral-500 hover:text-primary-600"
            >
              {magaza.ad}
            </Link>
            <Link
              href={`/magaza/${magaza.slug}/yorumlar`}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-500 hover:text-primary-600"
            >
              <MagazaYildizi ortalama={magaza.degerlendirmeOrtalamasi ?? 0} sayi={magaza.degerlendirmeSayisi} />
              {magaza.degerlendirmeSayisi > 0 && magaza.degerlendirmeOrtalamasi!.toFixed(1)}
            </Link>
          </div>
        )}
        <h2 className="mt-2 text-lg font-bold text-neutral-900">{urun.baslik}</h2>
        {/* Fiyat+Stok: ayni satirda, stok saga yasli. */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xl font-semibold text-primary-700">{fiyatFormat.format(urun.fiyat)}</p>
          <span className="shrink-0 text-xs text-neutral-500">Stok: {urun.stokAdedi} adet</span>
        </div>
        <div className="mt-1">
          <YildizGosterge ortalama={urun.degerlendirmeOrtalamasi ?? 0} sayi={urun.degerlendirmeSayisi} boyut="md" />
        </div>
        {urun.aciklama && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{urun.aciklama}</p>
        )}

        <div className="mt-5 flex items-center gap-2">
          {urun.benimRezervasyonum ? (
            <RezervasyonDurumuButon rezervasyon={urun.benimRezervasyonum} />
          ) : (
            <button
              type="button"
              disabled={rezervasyonKapali}
              onClick={onRezerveEt}
              className={`flex-1 rounded-md px-3 py-1 text-sm font-semibold transition-colors ${
                rezervasyonKapali
                  ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                  : "bg-primary-500 text-white hover:bg-primary-600"
              }`}
            >
              {rezervasyonKapali ? "Sıra kapandı" : "Rezerve Et"}
            </button>
          )}
          <span className="shrink-0 text-xs text-neutral-500">
            Rezerv: {urun.aktifSayisi} · Yedek: {urun.yedekSayisi}
          </span>
        </div>
        <div className="mt-3">
          <PaylasButonlari
            baslik={urun.baslik}
            fiyat={urun.fiyat}
            urunLink={`/magaza/${magazaSlug}?urun=${urun.id}`}
            kapakFotoUrl={urun.fotograflar[0] ?? null}
            tamGenislik
          />
        </div>

        {urun.yorumlar.length > 0 && (
          <div className="mt-4 border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-semibold text-neutral-900">Değerlendirmeler</h3>
            <div className="mt-2 space-y-2">
              {urun.yorumlar.map((y) => (
                <div key={y.id} className="rounded-xl bg-neutral-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-800">{y.kullaniciAd}</span>
                    <YildizGosterge ortalama={y.puan} sayi={1} />
                  </div>
                  <p className="mt-1 text-sm text-neutral-700">{y.yorum}</p>
                  <p className="mt-1 text-xs text-neutral-400">{y.tarih}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
