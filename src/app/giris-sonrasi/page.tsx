import { redirect } from "next/navigation";
import { oturumRolOku } from "@/lib/yetki";

// Giris sonrasi rol bazli dagitim noktasi. Tum giris akislari (credentials +
// google) buraya yonlenir; burada rol okunup uygun yere gonderilir.
// callbacks.redirect rol bilgisine erisemedigi icin (sadece url/baseUrl alir)
// bu ara rota kullaniliyor.
//
// oturumRolOku() (JWT degil, DB'den taze okuma) kullanilir: kullanici ayni
// oturumda alici -> satici'ya terfi edebilir (magaza-ac) ve JWT o an bayat
// kalir (yeniden giris yapana kadar eski rol) - bu sayfa terfi hemen sonrasi
// da dogru hedefe yonlendirsin diye digger tum panel/admin gecitleriyle (yetki.ts)
// ayni yardimciyi kullanir.
export default async function GirisSonrasiSayfasi() {
  const { session, rol } = await oturumRolOku();

  if (!session?.user) {
    redirect("/giris");
  }

  // PLAN SS4: /panel satici paneli, /admin ayri panel.
  if (rol === "satici") {
    redirect("/panel");
  }
  if (rol === "admin") {
    redirect("/admin");
  }

  // alici -> ana sayfa. Ana sayfa henuz insa edilmedi (create-next-app stub'i).
  redirect("/");
}
