"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main>
      <h1>Kayıt Ol</h1>
      <form action={submit}>
        <div>
          <label>
            Ad
            <input name="ad" type="text" required />
          </label>
        </div>
        <div>
          <label>
            E-posta
            <input name="email" type="email" required />
          </label>
        </div>
        <div>
          <label>
            Şifre
            <input name="password" type="password" required minLength={8} />
          </label>
        </div>
        <button type="submit" disabled={gonderiliyor}>
          Kayıt Ol
        </button>
      </form>
      {hata && <p style={{ color: "red" }}>{hata}</p>}
    </main>
  );
}
