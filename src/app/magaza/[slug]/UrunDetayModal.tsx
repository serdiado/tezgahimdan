"use client";

import { createElement, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BellRing, X } from "lucide-react";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { BegeniButonu } from "@/components/BegeniButonu";
import { PaylasButonlari } from "@/components/PaylasButonlari";
import { DURUM_STIL, type UrunKartiVeri } from "./UrunKarti";

const fiyatFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

// Rezervasyonun kendisi (girisli kontrolu, telefon isteme vb.) UrunKarti'de
// kalir - bu modal sadece goruntuleme + "Rezerve Et"e basinca UrunKarti'e
// haber verir (onRezerveEt), boylece giris/telefon mantigi TEK yerde kalir.
export function UrunDetayModal({
  urun,
  magazaSlug,
  girisli,
  onClose,
  onRezerveEt,
}: {
  urun: UrunKartiVeri;
  magazaSlug: string;
  girisli: boolean;
  onClose: () => void;
  onRezerveEt: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [aktifIndex, setAktifIndex] = useState(0);
  const [takipEdiliyor, setTakipEdiliyor] = useState(urun.benimTakibimVar);
  const [takipGonderiliyor, setTakipGonderiliyor] = useState(false);
  const renk = kategoriRengiSec(urun.kategori.id);
  const kategoriIkonu = kategoriIkonuSec(urun.kategori.ad);
  const durumStil = DURUM_STIL[urun.durum] ?? { etiket: urun.durum, className: "bg-neutral-200 text-neutral-600" };
  const rezervasyonKapali = urun.durum !== "sergide";
  const aktifFoto = urun.fotograflar[aktifIndex];

  // Favori/takip: bildirim aboneligi. begeniden ayri, bildirimGonderTakipcilere
  // (src/lib/bildirim.ts) bu bayragi okur - yedek-tier haric her aktif-katman
  // hareketinde bildirim uretir (bkz. plan dosyasi).
  async function takipTikla() {
    if (!girisli) {
      const next = `${pathname}?urun=${urun.id}`;
      router.push(`/giris?next=${encodeURIComponent(next)}`);
      return;
    }
    if (takipGonderiliyor) return;
    const onceki = takipEdiliyor;
    setTakipEdiliyor(!onceki);
    setTakipGonderiliyor(true);
    try {
      const res = await fetch("/api/favori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urunId: urun.id, tur: "takip" }),
      });
      if (!res.ok) throw new Error("basarisiz");
      const data = await res.json();
      setTakipEdiliyor(data.takipMi);
      router.refresh();
    } catch {
      setTakipEdiliyor(onceki);
    } finally {
      setTakipGonderiliyor(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm hover:bg-white hover:text-neutral-900"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
          {aktifFoto ? (
            <Image
              src={aktifFoto}
              alt={urun.baslik}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              {createElement(kategoriIkonu, { className: `h-16 w-16 ${renk.text}`, strokeWidth: 1.5 })}
            </div>
          )}
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${renk.bg} ${renk.text} ${renk.border}`}
          >
            {urun.kategori.ad}
          </span>
          <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${durumStil.className}`}>
            {durumStil.etiket}
          </span>
        </div>
        <h2 className="mt-2 text-lg font-bold text-neutral-900">{urun.baslik}</h2>
        <p className="mt-1 text-xl font-semibold text-primary-700">{fiyatFormat.format(urun.fiyat)}</p>
        {urun.aciklama && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{urun.aciklama}</p>
        )}

        <button
          type="button"
          disabled={rezervasyonKapali}
          onClick={onRezerveEt}
          className={`mt-5 w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            rezervasyonKapali
              ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
              : "bg-primary-500 text-white hover:bg-primary-600"
          }`}
        >
          {rezervasyonKapali ? "Sıra kapandı" : "Rezerve Et"}
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <BegeniButonu
            urunId={urun.id}
            girisli={girisli}
            begeniSayisi={urun.begeniSayisi}
            benimBegenimVar={urun.benimBegenimVar}
          />
          <button
            type="button"
            onClick={takipTikla}
            disabled={takipGonderiliyor}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
              takipEdiliyor
                ? "border-primary-200 bg-primary-50 text-primary-700"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {takipEdiliyor ? (
              <>
                <BellRing className="h-3.5 w-3.5" strokeWidth={2} />
                Takip Ediliyor
              </>
            ) : (
              <>
                <Bell className="h-3.5 w-3.5" strokeWidth={2} />
                Takip Et
              </>
            )}
          </button>
        </div>
        <div className="mt-3">
          <PaylasButonlari
            baslik={urun.baslik}
            fiyat={urun.fiyat}
            urunLink={`/magaza/${magazaSlug}?urun=${urun.id}`}
            kapakFotoUrl={urun.fotograflar[0] ?? null}
          />
        </div>
      </div>
    </div>
  );
}
