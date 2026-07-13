import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hesapSilmeTalebiOlustur } from "@/lib/hesap-silme";

// Girisli HERKES (alici veya satici) cagirabilir - satici geciti (getSaticiSession)
// BILINCLI kullanilmadi, cunku alici da kendi hesabini sildirmek isteyebilir.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const sonuc = await hesapSilmeTalebiOlustur(session.user.id);
  return NextResponse.json({ tur: sonuc });
}
