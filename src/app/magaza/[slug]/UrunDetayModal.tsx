"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Flag, X, ZoomIn, type LucideIcon } from "lucide-react";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { BegeniButonu } from "@/components/BegeniButonu";
import { TakipButonu } from "@/components/TakipButonu";
import { PaylasButonlari } from "@/components/PaylasButonlari";
import { DURUM_STIL, type UrunKartiVeri } from "./UrunKarti";

const fiyatFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

function mesafe(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Zoom: harici kutuphanesiz - cift tik/cift dokunma 1x<->2x toggle, iki-parmak
// pinch (1x-3x), zoom'dayken surukleyerek gezinme. Pointer Events mouse+touch'u
// TEK API'de birlestirir. Ayri bilesen olmasinin nedeni: ust bilesen bunu
// `key={aktifIndex}` ile render eder - foto degisince React'in kendisi bu
// bileseni SIFIRDAN monte eder (zoom/pan otomatik 1x/{0,0}'a doner), bir
// useEffect+setState ile senkron sifirlamaya gerek kalmaz (react-hooks/
// set-state-in-effect kuraliyla celisirdi).
function ZoomluGorsel({
  foto,
  alt,
  kategoriIkonu,
  renkYazi,
}: {
  foto: string | undefined;
  alt: string;
  kategoriIkonu: LucideIcon;
  renkYazi: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gestureRef = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    baslangicMesafe: number;
    baslangicZoom: number;
    surukleBaslangic: { x: number; y: number } | null;
    panBaslangic: { x: number; y: number };
  }>({
    pointers: new Map(),
    baslangicMesafe: 0,
    baslangicZoom: 1,
    surukleBaslangic: null,
    panBaslangic: { x: 0, y: 0 },
  });

  // Hem gorsele cift tik/cift dokunma hem de buyutec ikonuna TEK tikla
  // tetiklenir - ikisi de ayni 1x<->2x toggle'i cagirir.
  function zoomAcKapa() {
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  }

  function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // setPointerCapture bazi kenar durumlarda (or. pointerId artik gecerli
    // degilse) NotFoundError firlatabilir - firlarsa asagidaki pointer takibi
    // hic calismaz, gesture sessizce kirilir. Yakalayip yok sayiyoruz (capture
    // sadece surukleme sirasinda pointer'i elementte "kilitli" tutmak icin,
    // olmasa da asagidaki state takibi calismaya devam eder).
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // yut - pointer takibi capture olmadan da calisir.
    }
    gestureRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gestureRef.current.pointers.size === 2) {
      const [p1, p2] = Array.from(gestureRef.current.pointers.values());
      gestureRef.current.baslangicMesafe = mesafe(p1, p2);
      gestureRef.current.baslangicZoom = zoom;
    } else if (gestureRef.current.pointers.size === 1 && zoom > 1) {
      gestureRef.current.surukleBaslangic = { x: e.clientX, y: e.clientY };
      gestureRef.current.panBaslangic = pan;
    }
  }

  function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!gestureRef.current.pointers.has(e.pointerId)) return;
    gestureRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gestureRef.current.pointers.size === 2) {
      const [p1, p2] = Array.from(gestureRef.current.pointers.values());
      const mesafeSimdi = mesafe(p1, p2);
      if (gestureRef.current.baslangicMesafe > 0) {
        const oran = mesafeSimdi / gestureRef.current.baslangicMesafe;
        setZoom(Math.min(3, Math.max(1, gestureRef.current.baslangicZoom * oran)));
      }
    } else if (gestureRef.current.pointers.size === 1 && gestureRef.current.surukleBaslangic && zoom > 1) {
      const dx = e.clientX - gestureRef.current.surukleBaslangic.x;
      const dy = e.clientY - gestureRef.current.surukleBaslangic.y;
      // Kaba sinir: asiri surukleyip gorseli tamamen kadraj disina cikarmasin.
      const maxPan = (zoom - 1) * 150;
      const sinirla = (v: number) => Math.min(maxPan, Math.max(-maxPan, v));
      setPan({
        x: sinirla(gestureRef.current.panBaslangic.x + dx),
        y: sinirla(gestureRef.current.panBaslangic.y + dy),
      });
    }
  }

  function pointerUp(e: React.PointerEvent<HTMLDivElement>) {
    gestureRef.current.pointers.delete(e.pointerId);
    gestureRef.current.surukleBaslangic = null;
    if (gestureRef.current.pointers.size < 2) gestureRef.current.baslangicMesafe = 0;
  }

  function tekerlek(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    setZoom((z) => Math.min(3, Math.max(1, z - e.deltaY * 0.001)));
  }

  return (
    <div
      className="relative aspect-square w-full touch-none overflow-hidden rounded-xl bg-neutral-100"
      onDoubleClick={zoomAcKapa}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onWheel={tekerlek}
      onDragStart={(e) => e.preventDefault()}
    >
      {foto ? (
        <Image
          src={foto}
          alt={alt}
          fill
          draggable={false}
          className="object-cover select-none"
          style={
            {
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              WebkitUserDrag: "none",
            } as React.CSSProperties
          }
          sizes="(max-width: 640px) 100vw, 512px"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          {createElement(kategoriIkonu, { className: `h-16 w-16 ${renkYazi}`, strokeWidth: 1.5 })}
        </div>
      )}
      {foto && (
        <button
          type="button"
          onClick={zoomAcKapa}
          // Disaridaki div'in onPointerDown'i (gesture/pinch takibi icin)
          // TUM alt agacta tetiklenir ve setPointerCapture cagirir - bu,
          // pointerup'i butonun ustunde degil YAKALAYAN elemente yonlendirip
          // native "click" sentezini kirar (buton hic tiklanmiyormus gibi
          // gorunur). stopPropagation ile bu butona gelen pointerdown disari
          // hic cikmaz, disideki gesture mantigi devreye girmez.
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={zoom > 1 ? "Uzaklaştır" : "Yakınlaştır"}
          className="absolute bottom-2 left-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
        >
          <ZoomIn className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

// Rezervasyonun kendisi (girisli kontrolu, telefon isteme vb.) UrunKarti'de
// kalir - bu modal sadece goruntuleme + "Rezerve Et"e basinca UrunKarti'e
// haber verir (onRezerveEt), boylece giris/telefon mantigi TEK yerde kalir.
export function UrunDetayModal({
  urun,
  magazaSlug,
  girisli,
  onClose,
  onRezerveEt,
  onSikayetEt,
}: {
  urun: UrunKartiVeri;
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
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm hover:bg-white hover:text-neutral-900"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        <ZoomluGorsel
          key={aktifIndex}
          foto={aktifFoto}
          alt={urun.baslik}
          kategoriIkonu={kategoriIkonu}
          renkYazi={renk.text}
        />

        {/* Begen+Takip+Bildir: gorselin hemen altinda, disinda, saga yasli
            kompakt satir - UrunKarti.tsx'teki kart tasarimiyla birebir ayni. */}
        <div className="mt-2 flex items-center justify-end gap-3">
          <BegeniButonu
            urunId={urun.id}
            girisli={girisli}
            begeniSayisi={urun.begeniSayisi}
            benimBegenimVar={urun.benimBegenimVar}
          />
          <TakipButonu urunId={urun.id} girisli={girisli} benimTakibimVar={urun.benimTakibimVar} kompakt />
          <button
            type="button"
            onClick={onSikayetEt}
            aria-label="Bildir"
            className="flex items-center text-neutral-400 hover:text-neutral-600"
          >
            <Flag className="h-5 w-5" strokeWidth={2} />
          </button>
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
        <p className="text-xs text-neutral-500">Stok: {urun.stokAdedi} adet</p>
        {urun.aciklama && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{urun.aciklama}</p>
        )}

        <div className="mt-5 flex items-center gap-2">
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
      </div>
    </div>
  );
}
