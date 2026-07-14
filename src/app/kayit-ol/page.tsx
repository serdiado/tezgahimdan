"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

// useSearchParams() bir client hook'u oldugu icin Next.js prod build'de bu
// bilesenin bir Suspense sinirina sarilmasini zorunlu kilar (yoksa /kayit-ol
// prerender asamasinda hata verir - bkz. next.js.org/docs "missing-suspense-with-csr-bailout").
export default function KayitOlPage() {
  return (
    <Suspense>
      <KayitOlForm />
    </Suspense>
  );
}

function KayitOlForm() {
  const searchParams = useSearchParams();
  // Redirect-back (KP-1): girissiz "Rezerve Et"ten gelen next'i giris sonrasina
  // tasi. Acik yonlendirme korumasi: yalniz uygulama-ici mutlak yol.
  const nextHam = searchParams.get("next");
  const guvenliNext =
    nextHam && nextHam.startsWith("/") && !nextHam.startsWith("//") ? nextHam : null;
  const girisHref = guvenliNext ? `/giris?next=${encodeURIComponent(guvenliNext)}` : "/giris";
  // Giris sayfasindaki (next varsa oraya, yoksa rol-bazli dagitim icin ara
  // rotaya) hedef mantigiyla BIREBIR ayni - otomatik giris sonrasi ayni yere gider.
  const hedef = guvenliNext ?? "/giris-sonrasi";

  // Controlled alanlar (2026-07-14 friction duzeltmesi): kayit hatasinda
  // (kisa sifre, e-posta zaten kayitli) React'in form-action-sonrasi otomatik
  // reset'i DEVRE DISI kalsin diye - deger state'ten geldigi surece React bir
  // sonraki render'da DOM'u state'e gore geri yazar, kullanici ad/e-posta
  // gibi DOGRU yazdigi alanlari yeniden yazmak zorunda kalmaz.
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (!res.ok) {
      setGonderiliyor(false);
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "Kayıt başarısız");
      return;
    }

    // Otomatik giris (2026-07-14 friction duzeltmesi): kayit oldugu email+sifre
    // elimizde zaten var - kullaniciyi ayrica /giris'e gonderip AYNI bilgiyi
    // ikinci kez yazdirmak yerine burada oturumu hemen aciyoruz. SessionProvider
    // GEREKMEZ (next-auth/react signIn Provider'sIz calisir, sadece useSession
    // Provider ister). redirect:false ile sonucu kendimiz yonetiyoruz ki
    // basarisiz olursa (nadir - TOCTOU) dostca /giris'e dusebilelim.
    const girisSonucu = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    setGonderiliyor(false);

    if (girisSonucu?.ok) {
      // TAM SAYFA yuklemesi (soft router.push DEGIL): giris ONCESI cikis
      // yapilmisken onceden yuklenmis "login'e yonlendir" sayfa kopyalarini
      // tarayicinin router onbelleginden tamamen dusurur. Aksi halde giris
      // yapmis kullanici, "Tezgah Aç" gibi giris-gerektiren bir sayfaya
      // gidince bayat kopyayla yeniden login ekranina atilabiliyordu
      // (2026-07-14 teshis - sadece bazi cihazlarda, zamanlama/onbellek yarisi).
      window.location.assign(hedef);
      return;
    }
    // Beklenmeyen durum: kayit basarili ama otomatik giris tutmadi - kullaniciyi
    // en azindan tekrar 3 alani doldurmak zorunda birakmayalim, email onceden
    // dolu gelsin diye giris sayfasina bu sekilde yonlendirmek yerine sadece
    // /giris'e dusuyoruz (email query param'da tasinmiyor, gizlilik geregi).
    window.location.assign(girisHref);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-primary-600">Tezgahımdan</h1>
        <h2 className="mt-1 text-center text-sm text-neutral-500">Yeni hesap oluştur</h2>

        <form action={submit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Ad
            <input
              name="ad"
              type="text"
              required
              autoComplete="name"
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            E-posta
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Şifre
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <span className="text-xs font-normal text-neutral-400">En az 8 karakter olmalı.</span>
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
          <Link href={girisHref} className="font-semibold text-primary-600 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
