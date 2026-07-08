"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pazarRitimBilgisi } from "@/lib/pazar-haftasi";

// Diger dosyalarin (MagazaHero.tsx, admin/pazarlar/pazar-yardimcilari.ts) da
// yaptigi gibi gun sira/etiketini yerelde tutuyoruz - pazar-haftasi.ts kendi
// GUN_INDEKSI'ni export etmiyor, admin-scoped yardimciya da bagimli olmamak icin.
const HAFTA_GUNLERI: { deger: string; kisa: string; tam: string }[] = [
  { deger: "Pazartesi", kisa: "Pzt", tam: "Pazartesi" },
  { deger: "Sali", kisa: "Sal", tam: "Salı" },
  { deger: "Carsamba", kisa: "Çar", tam: "Çarşamba" },
  { deger: "Persembe", kisa: "Per", tam: "Perşembe" },
  { deger: "Cuma", kisa: "Cum", tam: "Cuma" },
  { deger: "Cumartesi", kisa: "Cmt", tam: "Cumartesi" },
  { deger: "PazarGunu", kisa: "Paz", tam: "Pazar" },
];

export type RitimPazarVeri = {
  id: string;
  ilce: string;
  baslangicGunu: string;
  baslangicSaati: Date;
  sifirlamaGunu: string;
  sifirlamaSaati: Date;
  saatDilimi: string;
};

// react-hooks/purity: Date.now()/new Date() dogrudan bilesen govdesinde "impure
// call" olarak isaretleniyor - AP-1'deki yediGunOncesi() deseniyle ayni cozum.
function simdiZamani(): Date {
  return new Date();
}

// "En yakin pazar" gruplamasi icin: iki an ayni (UTC) takvim gunune mi denk
// geliyor - ayni gune acilan birden fazla pazar boylece tek satirda birlesir.
function ayniTakvimGunuMu(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function HaftalikRitim({ pazarlar }: { pazarlar: RitimPazarVeri[] }) {
  const [acikGun, setAcikGun] = useState<string | null>(null);
  const seritRef = useRef<HTMLDivElement>(null);

  const gunGruplari: Record<string, RitimPazarVeri[]> = {};
  for (const g of HAFTA_GUNLERI) gunGruplari[g.deger] = [];
  for (const pazar of pazarlar) gunGruplari[pazar.baslangicGunu]?.push(pazar);

  const simdi = simdiZamani();
  const ritimler = pazarlar.map((pazar) => ({ pazar, ritim: pazarRitimBilgisi(pazar, simdi) }));
  const bugununPazarlari = ritimler.filter((r) => r.ritim.bugunPazarGunuMu).map((r) => r.pazar);

  // Bugun hicbir pazar yoksa serit bos gorunmesin diye en yakin zamanda
  // acilacak pazar(lar)i buluyoruz - ayni takvim gunune denk gelenler
  // (ors. iki pazar da ayni Carsamba aciliyorsa) birlikte gosterilir.
  let yaklasanBaslik = "";
  let yaklasanPazarlar: RitimPazarVeri[] = [];
  if (bugununPazarlari.length === 0 && ritimler.length > 0) {
    const enYakin = ritimler.reduce((en, r) =>
      r.ritim.sonrakiAcilisAni < en.ritim.sonrakiAcilisAni ? r : en,
    );
    yaklasanPazarlar = ritimler
      .filter((r) => ayniTakvimGunuMu(r.ritim.sonrakiAcilisAni, enYakin.ritim.sonrakiAcilisAni))
      .map((r) => r.pazar);
    yaklasanBaslik = HAFTA_GUNLERI.find((g) => g.deger === enYakin.ritim.gunAdi)?.tam ?? enYakin.ritim.gunAdi;
  }

  const seritBasligi = bugununPazarlari.length > 0 ? "Bugünün Pazarları" : "Yaklaşan Pazarlar";
  // Baslik hep iki kelime (Bugunun/Pazarlari, Yaklasan/Pazarlar) - tente ikonunun
  // altinda iki satir halinde durmasi icin boluyoruz.
  const [seritBasligiUst, seritBasligiAlt] = seritBasligi.split(" ");
  const seritMetni =
    bugununPazarlari.length > 0
      ? bugununPazarlari.map((p) => p.ilce).join(" • ")
      : `${yaklasanBaslik} — ${yaklasanPazarlar.map((p) => p.ilce).join(" • ")}`;

  // Disari tiklama + Escape ile kapatma - sadece bir gun aciksa dinleyici eklenir.
  // pointerdown fare ve dokunmayi tek dinleyicide birlestirir, ayri device tespiti gerekmez.
  useEffect(() => {
    if (!acikGun) return;
    function disariTikla(e: PointerEvent) {
      if (seritRef.current && !seritRef.current.contains(e.target as Node)) setAcikGun(null);
    }
    function kacTusu(e: KeyboardEvent) {
      if (e.key === "Escape") setAcikGun(null);
    }
    document.addEventListener("pointerdown", disariTikla);
    document.addEventListener("keydown", kacTusu);
    return () => {
      document.removeEventListener("pointerdown", disariTikla);
      document.removeEventListener("keydown", kacTusu);
    };
  }, [acikGun]);

  // Hook'lardan SONRA: istemci bilesenine gecince erken don, tum hook'lar
  // kosulsuz cagrildiktan sonra gelmeli.
  if (pazarlar.length === 0) return null;

  return (
    <div className="rounded-2xl bg-linear-to-br from-primary-600 to-primary-700 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <img
              src="/tente.svg"
              alt=""
              aria-hidden="true"
              width={131}
              height={28}
              className="h-6 w-auto brightness-0 invert"
            />
            <p className="text-center text-xl leading-tight font-bold tracking-tight sm:text-2xl">
              {seritBasligiUst}
              <br />
              {seritBasligiAlt}
            </p>
          </div>
          <div className="hidden h-14 w-px shrink-0 bg-white/30 sm:block" />
          {/* motion-reduce: azaltilmis-hareket tercih edenlerde animasyon durur,
              tekrar eden ikinci kopya gizlenir, tasarsa yatay kaydirmayla okunur. */}
          <div className="min-w-0 overflow-hidden motion-reduce:overflow-x-auto sm:flex-1">
            <div className="flex w-max gap-12 animate-[kayanYazi_16s_linear_infinite] text-lg font-bold tracking-tight motion-reduce:animate-none sm:text-xl">
              <span className="shrink-0 whitespace-nowrap">{seritMetni}</span>
              <span className="shrink-0 whitespace-nowrap motion-reduce:hidden" aria-hidden="true">
                {seritMetni}
              </span>
            </div>
          </div>
        </div>

        <div ref={seritRef} className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {HAFTA_GUNLERI.map((gun, index) => {
            const buGunPazarlari = gunGruplari[gun.deger] ?? [];
            const acik = acikGun === gun.deger;
            return (
              <div
                key={gun.deger}
                className="relative"
                onMouseEnter={() => setAcikGun(gun.deger)}
                onMouseLeave={() => setAcikGun((mevcut) => (mevcut === gun.deger ? null : mevcut))}
                onFocus={() => setAcikGun(gun.deger)}
                onBlur={(e) => {
                  // Odak, AYNI kutunun icindeki bir yere (ors. popover'daki pazar
                  // linkine) tasiniyorsa KAPATMA - mobilde her dokunma hem click hem
                  // focus/blur tetikledigi icin (hover kavrami yok), relatedTarget
                  // kontrolu olmadan buton->link odak gecisi popover'i aninda kapatip
                  // linke tiklamayi imkansiz hale getiriyordu (sadece masaustunde,
                  // hover ile acilip mouse ile tiklandiginda bu yaris hic olusmuyordu).
                  if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
                  setAcikGun((mevcut) => (mevcut === gun.deger ? null : mevcut));
                }}
              >
                <button
                  type="button"
                  aria-expanded={acik}
                  aria-label={`${gun.tam} günü pazarları`}
                  onClick={() => setAcikGun(gun.deger)}
                  className={`w-full rounded-lg border py-2.5 text-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-sm ${
                    acik ? "border-white/70" : "border-white/40"
                  }`}
                >
                  {gun.kisa}
                </button>
                {acik && (
                  // Bu popover'in kesilmemesi icin ata zincirinde (bu kart, main,
                  // page wrapper) overflow-hidden OLMAMALI.
                  // Dis kapsayici "top-full" ile BUTONA BITISIK basliyor (mt YOK) ve
                  // gorsel bosluk "pt-2" (padding) ile veriliyor - margin kullanilsaydi
                  // buton ile kutu arasinda faresel olarak "hicbir elementin ustunde
                  // olmadigi" bir bosluk kalirdi, oradan gecerken mouseleave tetiklenip
                  // menu kapanirdi. Padding, elementin kendi kutusunun (dolayisiyla
                  // hover alaninin) bir parcasi oldugu icin bu bosluk sorunu olmaz.
                  <div
                    className={`absolute top-full z-10 w-40 pt-2 sm:w-48 ${
                      index <= 3 ? "left-0" : "right-0"
                    }`}
                  >
                    <div className="rounded-xl bg-white p-3 text-neutral-700 shadow-lg">
                      {buGunPazarlari.length > 0 ? (
                        <ul className="flex max-h-64 flex-col gap-1.5 overflow-x-hidden overflow-y-auto text-sm">
                          {buGunPazarlari.map((p) => (
                            <li key={p.id}>
                              {/* Vitrin arama ile AYNI ?q= mekanizmasi - tiklayinca hem
                                  urunler hem magazalar bu pazarin ilcesine gore filtrelenir. */}
                              <Link
                                href={`/?q=${encodeURIComponent(p.ilce)}`}
                                className="-mx-1 block rounded-md px-1 py-0.5 hover:bg-neutral-100 hover:text-primary-600"
                              >
                                {p.ilce}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-neutral-500">Bu gün pazar kurulmuyor</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
