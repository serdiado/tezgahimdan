import { MagazaKarti, type MagazaKartiVeri } from "@/components/MagazaKarti";
import { MagazaTakipButonu } from "@/components/MagazaTakipButonu";

// Interaktiflik tamamen MagazaTakipButonu'nun icinde (kendi fetch+router.refresh
// deseni) - bu bilesen server component olarak kalabilir, ayrica "use client"
// state gerekmiyor. "Takibi Bırak" tiklaninca router.refresh() sayfayi yeniden
// cekecegi icin (magazaTakip.takipMi=false oldugunda kullaniciTakipEttigiMagazalarGetir
// artik o magazayi dondurmez) liste otomatik guncellenir.
export function TakipEttigimMagazalarIcerik({ magazalar }: { magazalar: MagazaKartiVeri[] }) {
  if (magazalar.length === 0) {
    return (
      <p className="mt-4 text-neutral-600">
        Henüz hiçbir mağazayı takip etmiyorsunuz. Beğendiğiniz bir mağazanın
        sayfasından Mağazayı Takip Et butonuna basarak yeni ürünlerinden haberdar
        olabilirsiniz.
      </p>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
      {magazalar.map((magaza) => (
        <MagazaKarti
          key={magaza.id}
          magaza={magaza}
          altAksiyon={
            <div className="mt-1">
              <MagazaTakipButonu girisli magazaId={magaza.id} benimTakibimVar={true} />
            </div>
          }
        />
      ))}
    </div>
  );
}
