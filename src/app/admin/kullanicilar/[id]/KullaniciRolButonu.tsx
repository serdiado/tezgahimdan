"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldPlus, ShieldMinus } from "lucide-react";

export function KullaniciRolButonu({ kullaniciId, rol }: { kullaniciId: string; rol: string }) {
  const router = useRouter();
  const [onay, setOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  // Sadece admin<->alici gecisi destekleniyor (bkz. api route yorumu) - satici
  // icin bu buton gosterilmez (magaza sahiplik anlamini karistirmamak icin).
  if (rol !== "admin" && rol !== "alici") return null;

  async function rolDegistir(yeniRol: "admin" | "alici") {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/kullanici-rol-degistir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullaniciId, yeniRol }),
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

  if (rol === "admin") {
    return (
      <div>
        {onay ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-600">Admin yetkisi kaldırılıp alıcıya döndürülsün mü?</span>
            <button
              type="button"
              onClick={() => rolDegistir("alici")}
              disabled={bekliyor}
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Evet
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
            className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            <ShieldMinus className="h-4 w-4" strokeWidth={2} />
            Admin Yetkisini Kaldır
          </button>
        )}
        {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
      </div>
    );
  }

  return (
    <div>
      {onay ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-600">
            Bu kullanıcı TAM admin yetkisi alacak (tüm mağaza/kullanıcı/ayar erişimi). Emin misin?
          </span>
          <button
            type="button"
            onClick={() => rolDegistir("admin")}
            disabled={bekliyor}
            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Evet, Admin Yap
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
          className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          <ShieldPlus className="h-4 w-4" strokeWidth={2} />
          Admin Yap
        </button>
      )}
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
