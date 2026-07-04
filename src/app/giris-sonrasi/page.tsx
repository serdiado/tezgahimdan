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

  // PLAN SS4: /panel satici paneli, /admin ayri panel.
  if (session.user.rol === "satici") {
    redirect("/panel");
  }
  if (session.user.rol === "admin") {
    redirect("/admin");
  }

  // alici -> ana sayfa. Ana sayfa henuz insa edilmedi (create-next-app stub'i).
  redirect("/");
}
