import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function girisYap(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/giris?error=${err.type}`);
      }
      throw err;
    }
  }

  async function googleIleGiris() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <main>
      <h1>Giriş Yap</h1>
      {error && <p style={{ color: "red" }}>Giriş başarısız: {error}</p>}
      <form action={girisYap}>
        <div>
          <label>
            E-posta
            <input name="email" type="email" required />
          </label>
        </div>
        <div>
          <label>
            Şifre
            <input name="password" type="password" required />
          </label>
        </div>
        <button type="submit">Giriş Yap</button>
      </form>
      <form action={googleIleGiris}>
        <button type="submit">Google ile Giriş Yap</button>
      </form>
    </main>
  );
}
