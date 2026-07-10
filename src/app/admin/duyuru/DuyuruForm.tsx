"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gorseliIsle } from "@/lib/gorsel";
import { useDegisiklikUyarisi } from "@/lib/degisiklik-uyarisi";
import { DuyuruMarkdown } from "@/components/DuyuruMarkdown";

type DuyuruTur = "bilgi" | "egitim" | "uyari";
type HedefKitle = "hepsi" | "satici" | "alici";

// Duyuru gorseli yukleme alani - form kaydetmeden BAGIMSIZ calisir (sec ->
// aninda POST /api/admin/duyuru-gorsel -> onizleme guncellenir), pazar hero
// gorseli akisiyla ayni his. Sadece DUZENLEME modunda (duyuru id var) gorunur;
// yeni duyuruda once "Taslak Olarak Kaydet" gerekir. Telefon fotografi
// gorseliIsle ile kucultulur.
function DuyuruGorselAlani({ duyuruId, baslangicUrl }: { duyuruId: string; baslangicUrl: string | null }) {
  const router = useRouter();
  const [url, setUrl] = useState(baslangicUrl);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function yukle(e: React.ChangeEvent<HTMLInputElement>) {
    const secilen = e.target.files?.[0];
    e.target.value = "";
    if (!secilen) return;
    setHata(null);
    setMesgul(true);
    const dosya = await gorseliIsle(secilen);
    const formData = new FormData();
    formData.append("duyuruId", duyuruId);
    formData.append("gorsel", dosya);
    const res = await fetch("/api/admin/duyuru-gorsel", { method: "POST", body: formData });
    setMesgul(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "görsel yüklenemedi");
      return;
    }
    const data = await res.json();
    setUrl(data.deger);
    router.refresh();
  }

  async function kaldir() {
    setHata(null);
    setMesgul(true);
    const res = await fetch("/api/admin/duyuru-gorsel", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duyuruId }),
    });
    setMesgul(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "görsel kaldırılamadı");
      return;
    }
    setUrl(null);
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-medium text-neutral-700">Görsel (opsiyonel)</p>
      <p className="mt-0.5 text-xs text-neutral-400">
        Detay sayfasında başlığın altında görünür. <strong>Seçtiğin an kaydedilir</strong> — aşağıdaki
        &quot;Kaydet&quot; yalnızca yazıyı kaydeder.
      </p>
      {url && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Duyuru görseli" className="h-32 w-full rounded-md object-cover" />
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <label className="cursor-pointer rounded-md border border-primary-300 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
          {mesgul ? "Yükleniyor…" : url ? "Değiştir" : "Görsel Seç"}
          <input type="file" accept="image/*" onChange={yukle} disabled={mesgul} className="hidden" />
        </label>
        {url && (
          <button
            type="button"
            onClick={kaldir}
            disabled={mesgul}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
          >
            Kaldır
          </button>
        )}
      </div>
      {hata && <p className="mt-1 text-sm text-red-600">{hata}</p>}
    </div>
  );
}

export type DuyuruFormVeri = {
  id: string;
  baslik: string;
  govde: string;
  tur: DuyuruTur;
  hedefKitle: HedefKitle;
  gorselUrl: string | null;
  baglantiUrl: string | null;
  baglantiMetni: string | null;
  yayinlandiMi: boolean;
  gonderilenSayisi: number;
  okunanSayisi: number;
};

const HEDEF_ETIKETI: Record<HedefKitle, string> = {
  hepsi: "Herkes (satıcı + alıcı)",
  satici: "Sadece satıcılar",
  alici: "Sadece alıcılar",
};

const inputClass =
  "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

export function DuyuruForm({ duyuru }: { duyuru: DuyuruFormVeri | null }) {
  const router = useRouter();
  const [baslik, setBaslik] = useState(duyuru?.baslik ?? "");
  const [govde, setGovde] = useState(duyuru?.govde ?? "");
  const [tur, setTur] = useState<DuyuruTur>(duyuru?.tur ?? "bilgi");
  const [hedefKitle, setHedefKitle] = useState<HedefKitle>(duyuru?.hedefKitle ?? "hepsi");
  const [baglantiUrl, setBaglantiUrl] = useState(duyuru?.baglantiUrl ?? "");
  const [baglantiMetni, setBaglantiMetni] = useState(duyuru?.baglantiMetni ?? "");
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState<string | null>(null);
  const [yayinOnay, setYayinOnay] = useState(false);
  const [kaldirOnay, setKaldirOnay] = useState(false);
  // Kaydedilmemis YAZI alanlari (baslik/govde/tur/hedef/baglanti) icin uyari.
  // Gorsel bu takibin DISINDA - kendi anlik upload'ini yapar (Kaydet'i
  // beklemez), bu yuzden gorsel secimi "dirty" isaretlemez.
  const [dirty, setDirty] = useState(false);
  useDegisiklikUyarisi(dirty);

  const yayinlandi = duyuru?.yayinlandiMi ?? false;

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasarili(null);
    if (!baslik.trim() || !govde.trim()) {
      setHata("başlık ve içerik zorunlu");
      return;
    }
    setBekliyor(true);
    const res = await fetch("/api/admin/duyuru-kaydet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: duyuru?.id,
        baslik: baslik.trim(),
        govde: govde.trim(),
        tur,
        hedefKitle,
        baglantiUrl: baglantiUrl.trim(),
        baglantiMetni: baglantiMetni.trim(),
      }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "kaydedilemedi");
      return;
    }
    const data = await res.json();
    setDirty(false);
    if (!duyuru) {
      // Yeni olusturuldu -> duzenleme sayfasina gec (artik yayinlanabilir).
      router.push(`/admin/duyuru/${data.id}/duzenle`);
      return;
    }
    setBasarili("Kaydedildi.");
    router.refresh();
  }

  async function yayinla() {
    if (!duyuru) return;
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/duyuru-yayinla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: duyuru.id }),
    });
    setBekliyor(false);
    setYayinOnay(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "yayınlanamadı");
      return;
    }
    const data = await res.json();
    setBasarili(`Duyuru ${data.gonderilenSayisi} kullanıcıya gönderildi.`);
    router.refresh();
  }

  async function kaldir() {
    if (!duyuru) return;
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/duyuru-kaldir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: duyuru.id }),
    });
    setBekliyor(false);
    setKaldirOnay(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "kaldırılamadı");
      return;
    }
    router.push("/admin/duyuru");
  }

  return (
    <div className="space-y-4">
      {duyuru && (
        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
          {yayinlandi ? (
            <p className="text-neutral-700">
              <span className="font-semibold text-green-700">Yayında</span> · {duyuru.gonderilenSayisi} kişiye
              gönderildi · {duyuru.okunanSayisi} okundu
            </p>
          ) : (
            <p className="text-neutral-500">
              <span className="font-semibold text-amber-700">Taslak</span> — henüz kimseye gönderilmedi.
            </p>
          )}
        </div>
      )}

      <form onSubmit={kaydet} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        {/* onChange SADECE yazi alanlarinda - gorsel bunun DISINDA (kendi anlik
            upload'i var, Kaydet'i beklemez), dirty isaretlememeli. */}
        <div className="space-y-4" onChange={() => setDirty(true)}>
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              Başlık
              <input
                type="text"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                maxLength={200}
                placeholder="ör. Yeni teslim alma işleyişi"
                className={inputClass}
              />
            </label>
            <p className="mt-1 text-xs text-neutral-400">
              Bildirim listesinde bu başlık görünür; tıklayınca aşağıdaki içerik açılır.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-neutral-700">
              Tür
              <select value={tur} onChange={(e) => setTur(e.target.value as DuyuruTur)} className={inputClass}>
                <option value="bilgi">Bilgi</option>
                <option value="egitim">Eğitim</option>
                <option value="uyari">Uyarı</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Hedef Kitle
              <select
                value={hedefKitle}
                onChange={(e) => setHedefKitle(e.target.value as HedefKitle)}
                disabled={yayinlandi}
                className={`${inputClass} disabled:bg-neutral-100 disabled:text-neutral-500`}
              >
                <option value="hepsi">{HEDEF_ETIKETI.hepsi}</option>
                <option value="satici">{HEDEF_ETIKETI.satici}</option>
                <option value="alici">{HEDEF_ETIKETI.alici}</option>
              </select>
              {yayinlandi && <span className="mt-1 block text-xs text-neutral-400">Yayından sonra değiştirilemez.</span>}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">
              İçerik
              <textarea
                value={govde}
                onChange={(e) => setGovde(e.target.value)}
                rows={8}
                maxLength={5000}
                placeholder="Duyurunun tam metni. Markdown yazabilirsin."
                className={inputClass}
              />
            </label>
            <p className="mt-1 text-xs text-neutral-400">
              Markdown desteklenir: <code className="rounded bg-neutral-100 px-1">**kalın**</code>,{" "}
              <code className="rounded bg-neutral-100 px-1">[bağlantı](https://…)</code>,{" "}
              <code className="rounded bg-neutral-100 px-1">- liste</code>. Altta canlı önizleme görünür.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-neutral-700">
              Eylem Bağlantısı (opsiyonel)
              <input
                type="url"
                value={baglantiUrl}
                onChange={(e) => setBaglantiUrl(e.target.value)}
                placeholder="https://… (ör. eğitim sayfası)"
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Buton Metni
              <input
                type="text"
                value={baglantiMetni}
                onChange={(e) => setBaglantiMetni(e.target.value)}
                maxLength={60}
                placeholder="ör. Eğitime Git"
                className={inputClass}
              />
            </label>
          </div>
        </div>

        {/* Canli onizleme - detay sayfasindakiyle AYNI render (DuyuruMarkdown). */}
        {govde.trim() && (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <p className="mb-1 text-xs font-medium text-neutral-400">Önizleme</p>
            <DuyuruMarkdown govde={govde} />
            {baglantiUrl.trim() && (
              <span className="mt-3 inline-flex rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                {baglantiMetni.trim() || "Bağlantıya Git"}
              </span>
            )}
          </div>
        )}

        {/* Gorsel yalniz duzenleme modunda (id gerekir; yeni duyuruda once
            "Taslak Olarak Kaydet"). ANLIK upload - Kaydet'i beklemez, dirty
            takibinin DISINDA. Kaydet butonunun USTUNDE. */}
        {duyuru && (
          <div className="border-t border-neutral-200 pt-4">
            <DuyuruGorselAlani duyuruId={duyuru.id} baslangicUrl={duyuru.gorselUrl} />
          </div>
        )}

        {hata && <p className="text-sm text-red-600">{hata}</p>}
        {basarili && !hata && <p className="text-sm text-green-700">{basarili}</p>}

        <div className="border-t border-neutral-200 pt-4">
          <button
            type="submit"
            disabled={bekliyor}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {bekliyor ? "Kaydediliyor…" : duyuru ? "Değişiklikleri Kaydet" : "Taslak Olarak Kaydet"}
          </button>
          {dirty && <p className="mt-1 text-xs text-neutral-500">Kaydedilmemiş değişiklikleriniz var.</p>}
        </div>
      </form>

      {duyuru && (
        <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-5 shadow-sm">
          {!yayinlandi &&
            (yayinOnay ? (
              <div className="w-full rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <p>
                  <span className="font-semibold">{HEDEF_ETIKETI[hedefKitle]}</span> kitlesine gönderilsin mi? Bu
                  işlem geri alınamaz.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={yayinla}
                    disabled={bekliyor}
                    className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {bekliyor ? "Gönderiliyor…" : "Evet, Yayınla"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setYayinOnay(false)}
                    className="rounded-md bg-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-300"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setYayinOnay(true)}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Yayınla
              </button>
            ))}

          {kaldirOnay ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-600">Emin misin?</span>
              <button
                type="button"
                onClick={kaldir}
                disabled={bekliyor}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Evet, Kaldır
              </button>
              <button
                type="button"
                onClick={() => setKaldirOnay(false)}
                className="rounded-md bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
              >
                Vazgeç
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setKaldirOnay(true)}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Yayından Kaldır
            </button>
          )}
        </div>
      )}
    </div>
  );
}
