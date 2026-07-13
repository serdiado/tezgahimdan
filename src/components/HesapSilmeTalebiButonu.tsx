"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";

// Alici Ayarlar VE satici Tezgah Ayarlari sayfalarinda AYNI bilesen (2026-07-13):
// hesap silme SELF-SERVIS DEGIL - bu buton hesabi SILMEZ, admin'e bir TALEP
// dusurur (bkz. lib/hesap-silme.ts). Admin/kullanicilar/[id]'deki KullaniciSilButonu
// ile AYNI iki-adimli onay deseni, ama onay metni "talep" oldugunu netlestirir.
export function HesapSilmeTalebiButonu({ talepBekliyorMu }: { talepBekliyorMu: boolean }) {
  const router = useRouter();
  const [onay, setOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function talepGonder() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/hesap-silme-talebi", { method: "POST" });
    setBekliyor(false);
    setOnay(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  if (talepBekliyorMu) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Hesabını silme talebin iletildi — yöneticimiz en kısa sürede seninle iletişime geçip
        işlemi tamamlayacak.
      </div>
    );
  }

  return (
    <div>
      {onay ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-600">
            Hesabını silme talebini yöneticimize ileteceğiz; en kısa sürede seninle iletişime
            geçilip işlem yapılacak. Devam edilsin mi?
          </span>
          <button
            type="button"
            onClick={talepGonder}
            disabled={bekliyor}
            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {bekliyor ? "Gönderiliyor…" : "Evet, Bildir"}
          </button>
          <button
            type="button"
            onClick={() => setOnay(false)}
            disabled={bekliyor}
            className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
          >
            Vazgeç
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOnay(true)}
          className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <UserX className="h-4 w-4" strokeWidth={2} />
          Hesabımı Sil
        </button>
      )}
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
