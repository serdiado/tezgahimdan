import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  // Redirect-back (KP-1): girissiz "Rezerve Et"e basan kullanici buraya ?next=...
  // ile gelir; giris/kayit sonrasi ayni urune doner. Acik yonlendirme (open
  // redirect) korumasi: yalniz uygulama-ici mutlak yol kabul edilir.
  const guvenliNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const hedef = guvenliNext ?? "/giris-sonrasi";
  const nextQ = guvenliNext ? `&next=${encodeURIComponent(guvenliNext)}` : "";
  const kayitHref = guvenliNext ? `/kayit-ol?next=${encodeURIComponent(guvenliNext)}` : "/kayit-ol";

  async function girisYap(formData: FormData) {
    "use server";
    try {
      // next varsa dogrudan oraya; yoksa rol bazli dagitim icin ara rotaya
      // (/giris-sonrasi session'dan rolu okuyup yonlendirir).
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: hedef,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/giris?error=${err.type}${nextQ}`);
      }
      throw err;
    }
  }

  async function googleIleGiris() {
    "use server";
    await signIn("google", { redirectTo: hedef });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-primary-600">Tezgahımdan</h1>
        <h2 className="mt-1 text-center text-sm text-neutral-500">Hesabına giriş yap</h2>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            Giriş başarısız. Bilgilerini kontrol edip tekrar dene.
          </p>
        )}

        <form action={girisYap} className="mt-6 flex flex-col gap-4">
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
              autoComplete="current-password"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-primary-500 py-2 font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Giriş Yap
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          veya
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form action={googleIleGiris}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white py-2 font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
              />
            </svg>
            Google ile Giriş Yap
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Hesabın yok mu?{" "}
          <Link href={kayitHref} className="font-semibold text-primary-600 hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </main>
  );
}
