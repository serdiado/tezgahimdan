"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";

// Admin-basvurulu hesap silme (2026-07-13, KVKK). KullaniciYasaklaButonu ile
// ayni iki-adimli onay deseni; fark: GERI DONUSU YOK (anonimlestirme) - onay
// metni bunu acikca soyler. API tarafindaki korumalar: kendi hesabi, admin
// hesabi ve aktif tezgahi olan kullanici silinemez (bkz. kullanici-sil route).
export function KullaniciSilButonu({ kullaniciId }: { kullaniciId: string }) {
  const router = useRouter();
  const [onay, setOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function sil() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/kullanici-sil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullaniciId }),
    });
    setBekliyor(false);
    setOnay(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {onay ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-600">
            Hesap silinir: giriş kapanır, ad/telefon/e-posta anonimleştirilir.{" "}
            <span className="font-semibold">Geri alınamaz.</span> Emin misin?
          </span>
          <button
            type="button"
            onClick={sil}
            disabled={bekliyor}
            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {bekliyor ? "Siliniyor…" : "Evet, Hesabı Sil"}
          </button>
          <button
            type="button"
            onClick={() => setOnay(false)}
            className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
          >
            Vazgeç
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOnay(true)}
          className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <UserX className="h-4 w-4" strokeWidth={2} />
          Hesabı Sil
        </button>
      )}
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
