"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugTuret } from "@/lib/slug";
import { gorseliIsle } from "@/lib/gorsel";
import { HAFTA_GUNLERI, saatMetnineCevir } from "./pazar-yardimcilari";

export type PazarFormVeri = {
  id: string;
  ad: string;
  slug: string;
  il: string;
  ilce: string;
  semt: string | null;
  googleHaritaLinki: string;
  belediyeAdi: string | null;
  belediyeLogoUrl: string | null;
  kapakFotoUrl: string | null;
  aciklama: string | null;
  sorumluAdi: string | null;
  sorumluTelefon: string | null;
  baslangicGunu: string;
  baslangicSaati: string;
  sifirlamaGunu: string;
  sifirlamaSaati: string;
  islemSonGunu: string | null;
  islemSonSaati: string | null;
  hatirlatmaGunu: string | null;
  hatirlatmaSaati: string | null;
  saatDilimi: string;
  aktifMi: boolean;
};

const inputClass =
  "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

// Pazar hero gorseli (logo/kapak) yukleme alani - form kaydetmeden BAGIMSIZ
// calisir (sec -> aninda POST /api/admin/pazar-gorsel -> onizleme guncellenir),
// kroki yukleme akisiyla ayni his. kapakMi=true ise telefon fotografi
// gorseliIsle ile kucultulur; logo ORIJINAL dosya olarak gider (gorseliIsle
// her seyi JPEG'e cevirir, PNG logonun seffafligi kaybolurdu).
function GorselYukleAlani({
  pazarId,
  alan,
  baslik,
  aciklama,
  baslangicUrl,
  kapakMi,
}: {
  pazarId: string;
  alan: "belediyeLogoUrl" | "kapakFotoUrl";
  baslik: string;
  aciklama: string;
  baslangicUrl: string | null;
  kapakMi: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(baslangicUrl);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function yukle(e: React.ChangeEvent<HTMLInputElement>) {
    const secilen = e.target.files?.[0];
    e.target.value = ""; // ayni dosya tekrar secilebilsin
    if (!secilen) return;
    setHata(null);
    setMesgul(true);
    const dosya = kapakMi ? await gorseliIsle(secilen) : secilen;
    const formData = new FormData();
    formData.append("pazarId", pazarId);
    formData.append("alan", alan);
    formData.append("gorsel", dosya);
    const res = await fetch("/api/admin/pazar-gorsel", { method: "POST", body: formData });
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
    const res = await fetch("/api/admin/pazar-gorsel", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pazarId, alan }),
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
      <p className="text-sm font-medium text-neutral-700">{baslik}</p>
      <p className="mt-0.5 text-xs text-neutral-400">{aciklama}</p>
      {url && (
        <div className="mt-2">
          {kapakMi ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={baslik} className="h-24 w-full rounded-md object-cover" />
          ) : (
            <div className="inline-flex rounded-md bg-white p-2 ring-1 ring-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={baslik} className="h-14 w-auto object-contain" />
            </div>
          )}
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

// Hem "Yeni Pazar" hem "Pazar Düzenle" sayfaları bu formu kullanır. Yeni pazarda
// aktifMi alanı gösterilmez (yeni pazar hep aktif başlar); düzenlemede gösterilir.
export function PazarForm({ mevcut }: { mevcut?: PazarFormVeri }) {
  const router = useRouter();
  const duzenlemeModu = !!mevcut;
  const [ad, setAd] = useState(mevcut?.ad ?? "");
  // Onboarding sihirbazindaki desen: slug ad'dan CANLI turetilir, admin elle
  // dokunursa (slugElleDegisti) otomatik turetme durur - kullanicinin yazdigi bozulmaz.
  const [slug, setSlug] = useState(mevcut?.slug ?? "");
  const [slugElleDegisti, setSlugElleDegisti] = useState(duzenlemeModu);
  const [il, setIl] = useState(mevcut?.il ?? "");
  const [ilce, setIlce] = useState(mevcut?.ilce ?? "");
  const [semt, setSemt] = useState(mevcut?.semt ?? "");
  const [googleHaritaLinki, setGoogleHaritaLinki] = useState(mevcut?.googleHaritaLinki ?? "");
  const [belediyeAdi, setBelediyeAdi] = useState(mevcut?.belediyeAdi ?? "");
  const [aciklama, setAciklama] = useState(mevcut?.aciklama ?? "");
  const [sorumluAdi, setSorumluAdi] = useState(mevcut?.sorumluAdi ?? "");
  const [sorumluTelefon, setSorumluTelefon] = useState(mevcut?.sorumluTelefon ?? "");
  const [baslangicGunu, setBaslangicGunu] = useState(mevcut?.baslangicGunu ?? "Carsamba");
  const [baslangicSaati, setBaslangicSaati] = useState(
    mevcut ? saatMetnineCevir(mevcut.baslangicSaati) : "09:00",
  );
  const [sifirlamaGunu, setSifirlamaGunu] = useState(mevcut?.sifirlamaGunu ?? "Carsamba");
  const [sifirlamaSaati, setSifirlamaSaati] = useState(
    mevcut ? saatMetnineCevir(mevcut.sifirlamaSaati) : "20:00",
  );
  // islemSon*/hatirlatma*: opsiyonel - bos ("") gun secili demek "otomatik/
  // varsayilan" (kod eski sabit hesaplara duser, bkz. pazar-haftasi.ts).
  const [islemSonGunu, setIslemSonGunu] = useState(mevcut?.islemSonGunu ?? "");
  const [islemSonSaati, setIslemSonSaati] = useState(
    mevcut?.islemSonSaati ? saatMetnineCevir(mevcut.islemSonSaati) : "",
  );
  const [hatirlatmaGunu, setHatirlatmaGunu] = useState(mevcut?.hatirlatmaGunu ?? "");
  const [hatirlatmaSaati, setHatirlatmaSaati] = useState(
    mevcut?.hatirlatmaSaati ? saatMetnineCevir(mevcut.hatirlatmaSaati) : "",
  );
  const [saatDilimi, setSaatDilimi] = useState(mevcut?.saatDilimi ?? "Europe/Istanbul");
  const [aktifMi, setAktifMi] = useState(mevcut?.aktifMi ?? true);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setGonderiliyor(true);

    const govde = {
      ...(duzenlemeModu ? { id: mevcut.id } : {}),
      ad: ad.trim(),
      slug: slug.trim().toLowerCase(),
      il: il.trim(),
      ilce: ilce.trim(),
      semt: semt.trim() || null,
      googleHaritaLinki: googleHaritaLinki.trim(),
      belediyeAdi: belediyeAdi.trim() || null,
      aciklama: aciklama.trim() || null,
      sorumluAdi: sorumluAdi.trim() || null,
      sorumluTelefon: sorumluTelefon.trim() || null,
      baslangicGunu,
      baslangicSaati,
      sifirlamaGunu,
      sifirlamaSaati,
      islemSonGunu: islemSonGunu || "",
      islemSonSaati: islemSonSaati || "",
      hatirlatmaGunu: hatirlatmaGunu || "",
      hatirlatmaSaati: hatirlatmaSaati || "",
      saatDilimi: saatDilimi.trim() || "Europe/Istanbul",
      ...(duzenlemeModu ? { aktifMi } : {}),
    };

    const res = await fetch(
      duzenlemeModu ? "/api/admin/pazar-guncelle" : "/api/admin/pazar-olustur",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      },
    );
    setGonderiliyor(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }

    router.push("/admin/pazarlar");
    router.refresh();
  }

  return (
    <form onSubmit={gonder} className="mt-4 max-w-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Pazar Adı
          <input
            type="text"
            value={ad}
            onChange={(e) => {
              setAd(e.target.value);
              if (!slugElleDegisti) setSlug(slugTuret(e.target.value));
            }}
            required
            className={inputClass}
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-neutral-700">
          Bağlantı Adı (URL)
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugElleDegisti(true);
              setSlug(e.target.value);
            }}
            required
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-neutral-400">
          Pazarın herkese açık sayfası: tezgahimdan.com/pazar/{slug || "..."} — sadece küçük
          harf, rakam ve tire. Değiştirirseniz daha önce paylaşılan eski bağlantılar çalışmaz.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-neutral-700">
          İl
          <input
            type="text"
            value={il}
            onChange={(e) => setIl(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          İlçe
          <input
            type="text"
            value={ilce}
            onChange={(e) => setIlce(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Semt (opsiyonel)
          <input
            type="text"
            value={semt}
            onChange={(e) => setSemt(e.target.value)}
            placeholder="ör. Çarşı Mahallesi"
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Belediye Adı (opsiyonel)
          <input
            type="text"
            value={belediyeAdi}
            onChange={(e) => setBelediyeAdi(e.target.value)}
            placeholder="ör. Seferihisar Belediyesi"
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-neutral-400">
          Hangi belediyeye ait olduğunu kaydeder - birden fazla belediye eklendiğinde
          raporlama/ayrım için kullanılır.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Pazar Açıklaması (opsiyonel)
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            rows={3}
            placeholder="Vitrinde gösterilecek kısa bir tanıtım metni"
            className={inputClass}
          />
        </label>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-4">
        <p className="text-sm font-semibold text-neutral-700">Pazar Sayfası Görselleri</p>
        {duzenlemeModu ? (
          <>
            <GorselYukleAlani
              pazarId={mevcut.id}
              alan="belediyeLogoUrl"
              baslik="Belediye Logosu (opsiyonel)"
              aciklama="Pazar sayfasının üst kısmında beyaz bir kutu içinde gösterilir. Şeffaf PNG önerilir."
              baslangicUrl={mevcut.belediyeLogoUrl}
              kapakMi={false}
            />
            <GorselYukleAlani
              pazarId={mevcut.id}
              alan="kapakFotoUrl"
              baslik="Kapak Fotoğrafı (opsiyonel)"
              aciklama="Pazar sayfasının üst kısmının arka planı olur. Boş bırakılırsa düz renk görünüm kalır."
              baslangicUrl={mevcut.kapakFotoUrl}
              kapakMi
            />
          </>
        ) : (
          <p className="text-xs text-neutral-500">
            Belediye logosu ve kapak fotoğrafını, pazarı kaydettikten sonra Düzenle ekranından
            ekleyebilirsiniz.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-neutral-700">
          Pazar Sorumlusu Adı (opsiyonel)
          <input
            type="text"
            value={sorumluAdi}
            onChange={(e) => setSorumluAdi(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Sorumlu Telefonu (opsiyonel)
          <input
            type="tel"
            value={sorumluTelefon}
            onChange={(e) => setSorumluTelefon(e.target.value)}
            placeholder="05XX XXX XX XX"
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-neutral-400">Admin iç referansı - alıcı/satıcıya gösterilmez.</p>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Google Haritası Linki
          <input
            type="url"
            value={googleHaritaLinki}
            onChange={(e) => setGoogleHaritaLinki(e.target.value)}
            required
            placeholder="https://maps.app.goo.gl/..."
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-neutral-400">
          Google Maps&apos;te pazar yerini bul, &quot;Paylaş&quot; ile linki kopyala ve buraya
          yapıştır.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-neutral-700">
          Başlangıç Günü
          <select
            value={baslangicGunu}
            onChange={(e) => setBaslangicGunu(e.target.value)}
            className={inputClass}
          >
            {HAFTA_GUNLERI.map((g) => (
              <option key={g.deger} value={g.deger}>
                {g.etiket}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Başlangıç Saati
          <input
            type="time"
            value={baslangicSaati}
            onChange={(e) => setBaslangicSaati(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-neutral-400">
        Başlangıç: pazarın açılış (no-show ceza eşiği) anı.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-neutral-700">
          Kapanış Günü
          <select
            value={sifirlamaGunu}
            onChange={(e) => setSifirlamaGunu(e.target.value)}
            className={inputClass}
          >
            {HAFTA_GUNLERI.map((g) => (
              <option key={g.deger} value={g.deger}>
                {g.etiket}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Kapanış Saati
          <input
            type="time"
            value={sifirlamaSaati}
            onChange={(e) => setSifirlamaSaati(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-neutral-400">
        Kapanış: pazarın ilan edilen bitiş saati (kuyruğu doğrudan temizlemez, aşağıdaki
        &quot;İşlem Sonu&quot; ile birlikte çalışır).
      </p>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-neutral-700">
            İşlem Sonu Günü (opsiyonel)
            <select
              value={islemSonGunu}
              onChange={(e) => setIslemSonGunu(e.target.value)}
              className={inputClass}
            >
              <option value="">Otomatik (kapanış gününün gece yarısı)</option>
              {HAFTA_GUNLERI.map((g) => (
                <option key={g.deger} value={g.deger}>
                  {g.etiket}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            İşlem Sonu Saati
            <input
              type="time"
              value={islemSonSaati}
              onChange={(e) => setIslemSonSaati(e.target.value)}
              disabled={!islemSonGunu}
              className={`${inputClass} disabled:bg-neutral-100 disabled:text-neutral-400`}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          Satıcının en son &quot;Sattım/Gelmedi&quot; işaretleyebileceği an - bu andan sonra
          hâlâ işaretlenmemiş rezervasyonlar için satıcının panel girişi kilitlenir ve
          tezgahındaki TÜM ürünler vitrinde &quot;Beklemede&quot; görünür (alıcı asla otomatik
          cezalandırılmaz - satıcı 3 gün boyunca hiç girmezse admin&apos;e bilgilendirme
          bildirimi gider). Gece geç
          saate kadar açık pazarlarda (ör. kapanış 01:00) mutlaka manuel ayarlayın - aksi
          halde kapanış gününün gece yarısı varsayılır.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-neutral-700">
            Hatırlatma Günü (opsiyonel)
            <select
              value={hatirlatmaGunu}
              onChange={(e) => setHatirlatmaGunu(e.target.value)}
              className={inputClass}
            >
              <option value="">Otomatik (kapanıştan 1 saat sonra)</option>
              {HAFTA_GUNLERI.map((g) => (
                <option key={g.deger} value={g.deger}>
                  {g.etiket}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            Hatırlatma Saati
            <input
              type="time"
              value={hatirlatmaSaati}
              onChange={(e) => setHatirlatmaSaati(e.target.value)}
              disabled={!hatirlatmaGunu}
              className={`${inputClass} disabled:bg-neutral-100 disabled:text-neutral-400`}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          Satıcılara &quot;işaretlemeyi unutma&quot; bildiriminin gönderileceği an - İşlem
          Sonu&apos;ndan ÖNCE olmalı, yoksa satıcı bildirimi aldığında ceza çoktan uygulanmış
          olur.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Saat Dilimi
          <input
            type="text"
            value={saatDilimi}
            onChange={(e) => setSaatDilimi(e.target.value)}
            placeholder="Europe/Istanbul"
            className={inputClass}
          />
        </label>
      </div>

      {duzenlemeModu && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={aktifMi}
              onChange={(e) => setAktifMi(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Aktif
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            Pazar pasif yapıldığında: bağlı tezgahlar anasayfa/vitrinde görünmez, o pazardaki
            satıcılar panellerine giremez (&quot;bu pazar aktif değil&quot; uyarısı görürler).
            Hiçbir kayıt kalıcı silinmez — bir pazarı kaldırmak yerine (bağlı tezgahlar
            olduğu için silinemez) burada pasifleştirebilirsiniz.
          </p>
        </div>
      )}

      {hata && <p className="text-sm text-red-600">{hata}</p>}

      <button
        type="submit"
        disabled={gonderiliyor}
        className="w-full rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {gonderiliyor ? "Kaydediliyor…" : duzenlemeModu ? "Kaydet" : "Pazarı Oluştur"}
      </button>
    </form>
  );
}
