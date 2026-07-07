"use client";

import { createElement, useRef, useState } from "react";
import Image from "next/image";
import { ZoomIn, type LucideIcon, ImageIcon } from "lucide-react";

function mesafe(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Zoom: harici kutuphanesiz - cift tik/cift dokunma 1x<->2x toggle, iki-parmak
// pinch (1x-3x), zoom'dayken surukleyerek gezinme. Pointer Events mouse+touch'u
// TEK API'de birlestirir. UrunDetayModal.tsx'ten src/components/'e cikarildi -
// magaza kroki fotografi (GorselBuyutmeModal.tsx) da AYNI zoom davranisini
// istedigi icin (kod tekrari yerine paylasilan bilesen). Ust bilesen bunu
// `key={...}` ile render ederse React bileseni SIFIRDAN monte eder (zoom/pan
// otomatik 1x/{0,0}'a doner) - foto degisince manuel sifirlamaya gerek kalmaz.
export function ZoomluGorsel({
  foto,
  alt,
  kategoriIkonu = ImageIcon,
  renkYazi = "text-neutral-400",
}: {
  foto: string | undefined;
  alt: string;
  kategoriIkonu?: LucideIcon;
  renkYazi?: string;
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
    // olmasa da asagidaki state takibi capture olmadan da calisir).
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
