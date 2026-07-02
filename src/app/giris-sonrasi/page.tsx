import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Giris sonrasi rol bazli dagitim noktasi. Tum giris akislari (credentials +
// google) buraya yonlenir; burada session'daki rol okunup uygun yere gonderilir.
// callbacks.redirect rol bilgisine erisemedigi icin (sadece url/baseUrl alir)
// bu ara rota kullaniliyor.
export default async function GirisSonrasiSayfasi() {
  const session = await auth();

  if (!session?.user) {
    redirect("/giris");
  }

  if (session.user.rol === "satici" || session.user.rol === "admin") {
    redirect("/panel");
  }

  // alici (ve diger roller): ana sayfa. Ana sayfa henuz insa edilmedi, simdilik
  // varsayilan "/".
  redirect("/");
}
