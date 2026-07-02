"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

export default function KayitOlPage() {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function submit(formData: FormData) {
    setHata(null);
    setGonderiliyor(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad: formData.get("ad"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    setGonderiliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "kayit basarisiz");
      return;
    }
    router.push("/giris");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-primary-600">Tezgahımdan</h1>
        <h2 className="mt-1 text-center text-sm text-neutral-500">Yeni hesap oluştur</h2>

        <form action={submit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Ad
            <input name="ad" type="text" required autoComplete="name" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            E-posta
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Şifre
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={gonderiliyor}
            className="w-full rounded-md bg-primary-500 py-2 font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
          >
            {gonderiliyor ? "Kaydediliyor…" : "Kayıt Ol"}
          </button>
        </form>

        {hata && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{hata}</p>}

        <p className="mt-6 text-center text-sm text-neutral-500">
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="font-semibold text-primary-600 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
